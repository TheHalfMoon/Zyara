# Read-only, commit-pinned license evidence for proposed components and ambiguous donors.
$ErrorActionPreference = 'Stop'
$entries = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'source-metadata.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$results = @()
foreach ($entry in $entries) {
  if ($entry.id -notin @(17,22,77,78,82,88,89,90,91,100,103,104,106,107,111,112)) { continue }
  $sha = $entry.metadata.defaultBranchRef.target.oid
  $treeRaw = & rtk proxy gh api ('repos/' + $entry.repo + '/git/trees/' + $sha)
  $tree = ($treeRaw -join "`n") | ConvertFrom-Json
  $licenseFiles = @($tree.tree | Where-Object { $_.type -eq 'blob' -and $_.path -match '^(LICENSE|COPYING|NOTICE)(\..*)?$' })
  foreach ($file in $licenseFiles) {
    $blobRaw = & rtk proxy gh api ('repos/' + $entry.repo + '/git/blobs/' + $file.sha)
    $blob = ($blobRaw -join "`n") | ConvertFrom-Json
    $bytes = [Convert]::FromBase64String($blob.content)
    $contents = if ($bytes.Length -gt 1 -and $bytes[0] -eq 255 -and $bytes[1] -eq 254) { [Text.Encoding]::Unicode.GetString($bytes).TrimStart([char]0xFEFF) } else { [Text.Encoding]::UTF8.GetString($bytes) }
    $results += [pscustomobject]@{ source_id=$entry.id; repo=$entry.repo; commit=$sha; path=$file.path; blob_sha=$file.sha; url=('https://github.com/'+$entry.repo+'/blob/'+$sha+'/'+$file.path); checked_at=[DateTime]::UtcNow.ToString('o'); text=$contents }
  }
}
$results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'license-evidence.json') -Encoding UTF8
foreach ($result in $results) { Write-Output ($result.source_id.ToString()+' | '+$result.path+' | '+(($result.text -split "`n" | Select-Object -First 3) -join ' ')) }
