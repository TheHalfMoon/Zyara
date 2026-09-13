# Read-only upstream research. Writes only this planning evidence directory.
$ErrorActionPreference = 'Stop'
$sourceText = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../SOURCES.md') -Raw -Encoding UTF8
$matches = [regex]::Matches($sourceText, '(?m)^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(https://github.com/[^\s|]+)')
$resolve = @{ 'calcom'='calcom/cal.com'; 'flarum'='flarum/framework'; 'mautic'='mautic/mautic'; 'hasura'='hasura/graphql-engine'; 'taigaio'='taigaio/taiga-back'; 'gorules'='gorules/zen'; 'element-hq'='element-hq/element-web'; 'Geta'='Geta'; 'uvdesk'='uvdesk/community-skeleton' }
$entries = @($matches | ForEach-Object {
  $repo = $_.Groups[3].Value -replace 'https://github.com/', ''
  $scope = if ($resolve.ContainsKey($repo)) { $resolve[$repo] } else { $repo }
  [pscustomobject]@{id=[int]$_.Groups[1].Value; name=$_.Groups[2].Value.Trim(); landscape_url=$_.Groups[3].Value; repo=$scope; authorization='founder-90'; scope_resolution=($scope -ne $repo)}
})
$extras = @(
 'Medplum|medplum/medplum','HAPI FHIR|hapifhir/hapi-fhir','OpenEMR|openemr/openemr','OpenMRS Core|openmrs/openmrs-core','Bahmni|Bahmni/bahmni-core','Synthea|synthetichealth/synthea','OHIF|OHIF/Viewers','Orthanc|orthanc-mirrors/orthanc',
 'Medplum Scheduling Demo|medplum/medplum-scheduling-demo','OpenMRS Appointment Scheduling|openmrs/openmrs-module-appointmentscheduling','Easy!Appointments|alextselegidis/easyappointments','FHIR Validator|hapifhir/org.hl7.fhir.core','OpenSearch|opensearch-project/OpenSearch','MapLibre GL JS|maplibre/maplibre-gl-js','libphonenumber|google/libphonenumber','whisper.cpp|ggml-org/whisper.cpp','faster-whisper|SYSTRAN/faster-whisper','Whisper|openai/whisper','IHE Scheduling|IHE/ITI.Scheduling','HAPI HL7v2|hapifhir/hapi-hl7v2','iCalendar recurrence|jkbrzt/rrule','pg-boss|timgit/pg-boss','FHIR mCSD|IHE/ITI.mCSD','SMART App Launch|HL7/smart-app-launch'
)
$counter = 90
foreach ($extra in $extras) { $counter++; $parts=$extra.Split('|'); $entries += [pscustomobject]@{id=$counter;name=$parts[0];landscape_url=('https://github.com/'+$parts[1]);repo=$parts[1];authorization= $(if($counter -le 98){'existing-healthcare-public-license-only'}else{'new-candidate-public-license-only'});scope_resolution=$false} }
$results = @()
for ($batchStart=0; $batchStart -lt $entries.Count; $batchStart+=15) {
  $batch=@($entries | Select-Object -Skip $batchStart -First 15)
  $fields=@()
  foreach ($entry in $batch) { $parts=$entry.repo.Split('/'); if($parts.Count -eq 2){ $fields += ('r'+$entry.id+': repository(owner:"'+$parts[0]+'",name:"'+$parts[1]+'") { nameWithOwner url isArchived licenseInfo { spdxId name } defaultBranchRef { name target { ... on Commit { oid committedDate } } } }') } }
  $query='{'+($fields -join ' ')+'}'
  $requestPath=Join-Path $env:TEMP 'zyara-source-metadata-query.json'
  [System.IO.File]::WriteAllText($requestPath, (@{query=$query} | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
  $raw = & rtk proxy gh api graphql --input $requestPath
  $response = ($raw -join "`n") | ConvertFrom-Json
  foreach($entry in $batch) {
    $upstream = $response.data.('r'+$entry.id)
    $results += [pscustomobject]@{id=$entry.id;name=$entry.name;landscape_url=$entry.landscape_url;repo=$entry.repo;authorization=$entry.authorization;scope_resolution=$entry.scope_resolution;checked_at=[DateTime]::UtcNow.ToString('o');metadata=$upstream;status=$(if($upstream){'metadata-observed'}else{'unresolved-no-repository-metadata'})}
  }
}
$results | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'source-metadata.json') -Encoding UTF8
Write-Output ('Source entries: '+$results.Count)
Write-Output ('Unresolved: '+(@($results | Where-Object {$_.status -ne 'metadata-observed'}).Count))
