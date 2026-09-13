# Normalize only this mission's planning directories; never touches product or Git files.
$ErrorActionPreference='Stop'
$zyaraRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$changed=0
foreach($relative in @('docs/canonical','docs/research')){
 $directory=(Resolve-Path (Join-Path $zyaraRoot $relative)).Path
 if(-not $directory.StartsWith($zyaraRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Planning path escaped workspace'}
 foreach($file in Get-ChildItem -LiteralPath $directory -File){
  if($file.Extension -notin @('.md','.json','.ps1')){continue}
  $body=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $normalized=($body -replace '\r\n?',"`n")
  $normalized=[regex]::Replace($normalized,'(?m)[ \t]+$','')
  $normalized=$normalized.TrimEnd()+"`n"
  if($body -ne $normalized -or [IO.File]::ReadAllBytes($file.FullName)[0] -eq 239){
   [IO.File]::WriteAllText($file.FullName,$normalized,(New-Object Text.UTF8Encoding($false)))
   $changed++
  }
 }
}
Write-Output ('Normalized planning files: '+$changed)
