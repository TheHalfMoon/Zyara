$ErrorActionPreference='Stop'
$commitRaw=& rtk proxy gh api repos/TheHalfMoon/Zyara/commits/main
$commit=($commitRaw -join "`n") | ConvertFrom-Json
$branchRaw=& rtk proxy gh api 'repos/TheHalfMoon/Zyara/branches?per_page=100'
$branches=($branchRaw -join "`n") | ConvertFrom-Json
$prRaw=& rtk proxy gh pr list --repo TheHalfMoon/Zyara --state open --json number,title,headRefName,baseRefName,url
$prs=($prRaw -join "`n") | ConvertFrom-Json
$result=[pscustomobject]@{checked_at=[DateTime]::UtcNow.ToString('o');main_sha=$commit.sha;branches=@($branches | ForEach-Object {[pscustomobject]@{name=$_.name;sha=$_.commit.sha}});open_prs=@($prs)}
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'live-repository-final.json') -Encoding UTF8
Write-Output ($result | ConvertTo-Json -Depth 6)
