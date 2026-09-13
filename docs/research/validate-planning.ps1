$ErrorActionPreference = 'Stop'
$zyaraRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$zyaraChecks = New-Object System.Collections.Generic.List[object]
function Add-Check([string]$Name,[bool]$Passed,[string]$Detail) { $script:zyaraChecks.Add([pscustomobject]@{name=$Name;passed=$Passed;detail=$Detail}) }
$required = @('ZYARA_CANONICAL_BUILD_PLAN.md','ZYARA_COMPETITOR_INTELLIGENCE.md','ZYARA_APPOINTMENT_SYSTEM_PLAN.md','ZYARA_PRODUCT_REQUIREMENTS.md','ZYARA_ARCHITECTURE_PLAN.md','ZYARA_DATA_AND_FHIR_MODEL.md','ZYARA_AI_SEARCH_VOICE_PLAN.md','ZYARA_PROVIDER_PLATFORM_PLAN.md','ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md','ZYARA_SOURCE_QUALIFICATION.md','ZYARA_TEST_AND_EVIDENCE_PLAN.md','ZYARA_ROADMAP.md','ZYARA_MUSE_EXECUTION_HANDOFF.md')
foreach($name in $required) {
 $path=Join-Path $zyaraRoot ('docs/canonical/'+$name)
 Add-Check ('document:'+ $name) ((Test-Path -LiteralPath $path) -and (Get-Item -LiteralPath $path).Length -gt 1000) 'Required substantive canonical document'
}
$taskData=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'muse-task-contracts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskList=$taskData.tasks
$ids=@($taskList | ForEach-Object {$_.id})
Add-Check 'task-count-unique' ($ids.Count -eq 60 -and @($ids | Select-Object -Unique).Count -eq 60) ('Tasks='+$ids.Count)
$fields=@('id','title','phase','slice','objective','rationale','dependencies','change_surface','source_refs','requirement_ids','implementation_requirements','scope_out','acceptance','tests','security_privacy','observability','localization','failure_modes','evidence','risk','recovery','definition_of_done','state')
$missing=New-Object System.Collections.Generic.List[string]
$dependencyErrors=New-Object System.Collections.Generic.List[string]
foreach($task in $taskList){
 foreach($field in $fields){if($task.PSObject.Properties.Name -notcontains $field -or ($field -ne 'dependencies' -and -not $task.$field)){$missing.Add($task.id+':'+$field)}}
 foreach($dep in $task.dependencies){if($ids -notcontains $dep -or $dep -eq $task.id){$dependencyErrors.Add($task.id+':'+$dep)}}
}
Add-Check 'task-fields' ($missing.Count -eq 0) ($missing -join '; ')
Add-Check 'dependency-references' ($dependencyErrors.Count -eq 0) ($dependencyErrors -join '; ')
$resolved=@()
do {
 $ready=@($taskList | Where-Object { $resolved -notcontains $_.id -and @($_.dependencies | Where-Object {$resolved -notcontains $_}).Count -eq 0 })
 foreach($task in $ready){$resolved += $task.id}
} while($ready.Count -gt 0)
Add-Check 'dependency-DAG' ($resolved.Count -eq 60) ('Topological nodes='+$resolved.Count)
$phaseCount=@($taskList | ForEach-Object {$_.phase} | Select-Object -Unique).Count
$sliceCount=@($taskList | ForEach-Object {$_.slice} | Select-Object -Unique).Count
Add-Check 'phase-slice-counts' ($phaseCount -eq 12 -and $sliceCount -eq 24) ('Phases='+$phaseCount+'; slices='+$sliceCount)
Add-Check 'no-implementation-claims' (@($taskList | Where-Object {$_.state -ne 'PLANNED_NOT_IMPLEMENTED'}).Count -eq 0) 'All task states remain planned'
$handoff=Get-Content -LiteralPath (Join-Path $zyaraRoot 'docs/canonical/ZYARA_MUSE_EXECUTION_HANDOFF.md') -Raw -Encoding UTF8
$headings=[regex]::Matches($handoff,'(?m)^#### (M\d{3}) ')
$headIds=@($headings | ForEach-Object {$_.Groups[1].Value})
Add-Check 'handoff-task-parity' (($headIds -join ',') -eq ($ids -join ',')) ('Markdown task headings='+$headIds.Count)
$reqIds=@('R01','R02','R03','R04','R05','R06','R07','R08','R09','R10','R11','R12','R13','R14','R15','R16','R17','R18','R19','R20')
$covered=@($taskList | ForEach-Object {$_.requirement_ids} | Select-Object -Unique)
Add-Check 'requirement-coverage' (@($reqIds | Where-Object {$covered -notcontains $_}).Count -eq 0) ('Covered='+($covered|Sort-Object) -join ',')
$metadata=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'source-metadata.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$qualification=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'source-qualification.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Add-Check 'source-count-parity' ($metadata.Count -eq 115 -and $qualification.Count -eq 115) ('Metadata='+$metadata.Count+'; dispositions='+$qualification.Count)
$pinErrors=@()
foreach($source in $metadata){if($source.status -eq 'metadata-observed' -and $source.metadata.defaultBranchRef.target.oid -notmatch '^[0-9a-f]{40}$'){$pinErrors += $source.id}}
Add-Check 'source-pins' ($pinErrors.Count -eq 0) ('Invalid observed pins='+($pinErrors -join ',')+'; unresolved sources are explicitly unpinned')
$matrix=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'competitor-feature-matrix.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$cellCount=0;$matrixErrors=@()
foreach($comp in $matrix.competitors){
 $cellCount += $comp.features.Count
 if($comp.features.Count -ne 61 -or -not $comp.sources -or -not $comp.checked -or -not $comp.confidence){$matrixErrors+=$comp.id}
 foreach($cell in $comp.features){if($cell.state -notin @('D','M','A','U') -or $cell.adoption -notin @('COPY/ADAPT','IMPROVE','DIFFERENTIATE','DEFER','REJECT') -or ($cell.state -ne 'U' -and -not $cell.source_refs)){$matrixErrors+=($comp.id+':'+$cell.feature_id)}}
}
Add-Check 'competitor-feature-matrix' ($matrix.competitors.Count -eq 44 -and $matrix.features.Count -eq 61 -and $cellCount -eq 2684 -and $matrixErrors.Count -eq 0) ('Products='+$matrix.competitors.Count+'; features='+$matrix.features.Count+'; cells='+$cellCount+'; errors='+($matrixErrors -join ','))
$matrixMarkdown=Get-Content -LiteralPath (Join-Path $zyaraRoot 'docs/canonical/ZYARA_COMPETITOR_INTELLIGENCE.md') -Encoding UTF8
$currentFeatures=@();$parityErrors=@();$shownCells=0
foreach($line in $matrixMarkdown){
 if($line -match '^\| Product \|'){$currentFeatures=@($line.Split('|') | ForEach-Object {$_.Trim()} | Where-Object {$_ -match '^F\d{2}$'})}
 if($line -match '^\| (C\d{2}) '){
  $cid=$Matches[1];$comp=$matrix.competitors | Where-Object {$_.id -eq $cid}
  $parts=@($line.Split('|') | ForEach-Object {$_.Trim()})
  for($i=0;$i -lt $currentFeatures.Count;$i++){
   $fid=$currentFeatures[$i];$expected=($comp.features | Where-Object {$_.feature_id -eq $fid}).state
   if($parts[$i+2] -ne $expected){$parityErrors+=($cid+':'+$fid)}
   $shownCells++
  }
 }
}
Add-Check 'matrix-markdown-parity' ($shownCells -eq 2684 -and $parityErrors.Count -eq 0) ('Displayed cells='+$shownCells+'; mismatches='+($parityErrors -join ','))

$broken=New-Object System.Collections.Generic.List[string]
$encoding=New-Object System.Collections.Generic.List[string]
$markdown=@(Get-ChildItem -LiteralPath (Join-Path $zyaraRoot 'docs/canonical') -Filter '*.md' -File)+@(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.md' -File)+@((Get-Item -LiteralPath (Join-Path $zyaraRoot 'README.md')),(Get-Item -LiteralPath (Join-Path $zyaraRoot 'ASTRO.md')),(Get-Item -LiteralPath (Join-Path $zyaraRoot 'docs/SOURCES.md')))
foreach($file in $markdown){
 $body=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
 if($body.Contains([char]0xFFFD)){$encoding.Add($file.Name)}
 foreach($match in [regex]::Matches($body,'\[[^\]]*\]\(([^)]+)\)')){
  $target=$match.Groups[1].Value.Trim('<','>')
  if($target -match '^(https?://|mailto:|#)'){continue}
  $target=($target -split '#')[0]
  if(-not $target){continue}
  $target=[Uri]::UnescapeDataString($target)
  $resolvedPath=[IO.Path]::GetFullPath((Join-Path $file.DirectoryName $target))
  if(-not(Test-Path -LiteralPath $resolvedPath)){$broken.Add($file.Name+' -> '+$target)}
 }
}
Add-Check 'local-markdown-links' ($broken.Count -eq 0) ($broken -join '; ')
Add-Check 'utf8-replacement-characters' ($encoding.Count -eq 0) ($encoding -join '; ')
$master=Get-Content -LiteralPath (Join-Path $zyaraRoot 'docs/canonical/ZYARA_CANONICAL_BUILD_PLAN.md') -Raw -Encoding UTF8
$questions=[regex]::Matches($master,'(?m)^\| (\d+) \|')
Add-Check 'convergence-questions' ($questions.Count -eq 30) ('Explicit answers='+$questions.Count)
$adr=Get-Content -LiteralPath (Join-Path $zyaraRoot 'docs/canonical/ZYARA_ARCHITECTURE_PLAN.md') -Raw -Encoding UTF8
$adrCount=[regex]::Matches($adr,'(?m)^\| A\d{2} \|').Count
Add-Check 'ADR-count' ($adrCount -eq 26) ('ADRs='+$adrCount)
$failures=@($zyaraChecks | Where-Object {-not $_.passed})
$summary=[pscustomobject]@{checked_at=[DateTime]::UtcNow.ToString('o');status=$(if($failures.Count -eq 0){'PASS'}else{'FAIL'});checks=$zyaraChecks;counts=[pscustomobject]@{canonical_plans=13;tasks=$taskList.Count;phases=$phaseCount;slices=$sliceCount;source_entries=$metadata.Count;competitor_entries=$matrix.competitors.Count;features=$matrix.features.Count;cells=$cellCount;adrs=$adrCount};limitations=@('Documentation/contract validation only; no product tests or live booking performed.','Local link existence checked; external links were sourced during research, not all re-requested by this validator.','Metadata qualification is not exhaustive code/license/security certification.')}
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'planning-validation.json') -Encoding UTF8
Write-Output ($summary | ConvertTo-Json -Depth 8)
if($failures.Count -gt 0){exit 1}
