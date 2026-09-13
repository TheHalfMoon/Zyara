$ErrorActionPreference = 'Stop'
$matrix=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'competitor-feature-matrix.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$byId=@{}
foreach($comp in $matrix.competitors){$byId[$comp.id]=$comp}
$path=Join-Path $PSScriptRoot '../canonical/ZYARA_COMPETITOR_INTELLIGENCE.md'
$lines=Get-Content -LiteralPath $path -Encoding UTF8
$currentFeatures=@()
$out=foreach($line in $lines){
 if($line -match '^\| Product \|'){
  $currentFeatures=@($line.Split('|') | ForEach-Object {$_.Trim()} | Where-Object {$_ -match '^F\d{2}$'})
 }
 if($line -match '^\| (C\d{2}) (.+?) \|'){
  $id=$Matches[1];$name=$Matches[2];$comp=$byId[$id]
  $cells=foreach($fid in $currentFeatures){($comp.features | Where-Object {$_.feature_id -eq $fid}).state}
  '| '+$id+' '+$name+' | '+($cells -join ' | ')+' |'
 } else {$line}
}
[IO.File]::WriteAllText($path,($out -join [Environment]::NewLine)+[Environment]::NewLine,(New-Object Text.UTF8Encoding($false)))
Write-Output 'All displayed competitor cells regenerated from the sourced matrix.'
