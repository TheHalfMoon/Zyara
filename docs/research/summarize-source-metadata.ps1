$entries=Get-Content (Join-Path $PSScriptRoot 'source-metadata.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$summary=@(foreach($entry in $entries){[pscustomobject]@{id=$entry.id;name=$entry.name;repo=$entry.repo;url=$entry.landscape_url;auth=$entry.authorization;license=$entry.metadata.licenseInfo.spdxId;sha=$entry.metadata.defaultBranchRef.target.oid;date=$entry.metadata.defaultBranchRef.target.committedDate;archived=$entry.metadata.isArchived;status=$entry.status}})
$summary | ConvertTo-Json -Compress
