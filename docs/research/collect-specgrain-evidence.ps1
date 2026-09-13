$ErrorActionPreference = 'Stop'
$repo = 'TheHalfMoon/SpecGrain'
$sha = '5de7d6499bb0a9e3a191fc0934399cf099d1980a'
$commitRaw = & rtk proxy gh api ('repos/'+$repo+'/commits/'+$sha)
$commit = ($commitRaw -join "`n") | ConvertFrom-Json
$entries = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'source-metadata.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$entries = @($entries | Where-Object {$_.id -ne 115})
$entries += [pscustomobject]@{id=115;name='SpecGrain';landscape_url=('https://github.com/'+$repo);repo=$repo;authorization='user-suggested-2026-09-13-public-license-only';scope_resolution=$false;checked_at=[DateTime]::UtcNow.ToString('o');metadata=[pscustomobject]@{nameWithOwner=$repo;url=('https://github.com/'+$repo);isArchived=$false;licenseInfo=[pscustomobject]@{spdxId='MIT';name='MIT License'};defaultBranchRef=[pscustomobject]@{name='main';target=[pscustomobject]@{oid=$sha;committedDate=$commit.commit.committer.date}}};status='metadata-observed'}
foreach ($entry in $entries) { if($entry.id -eq 108){$entry.name='Whisper'} }
$entries | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'source-metadata.json') -Encoding UTF8
$results=@()
foreach($path in @('README.md','LICENSE','docs/domain-model.md','docs/trust-model.md','docs/architecture.md','pyproject.toml')) {
 $raw = & rtk proxy gh api ('repos/'+$repo+'/contents/'+$path+'?ref='+$sha)
 $file = ($raw -join "`n") | ConvertFrom-Json
 $body=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($file.content))
 $results += [pscustomobject]@{path=$path;commit=$sha;blob_sha=$file.sha;url=('https://github.com/'+$repo+'/blob/'+$sha+'/'+$path);checked_at=[DateTime]::UtcNow.ToString('o');text=$body}
}
$results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'specgrain-evidence.json') -Encoding UTF8
Write-Output ('Pinned SpecGrain files: '+$results.Count)
