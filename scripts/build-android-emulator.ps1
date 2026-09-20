$ErrorActionPreference = 'Stop'

$env:CAPACITOR_SERVER_URL = 'http://10.0.2.2:3000'

Write-Host 'Construction Android pour emulateur avec le serveur local 10.0.2.2:3000.'
& (Join-Path $PSScriptRoot 'build-android-debug.ps1')
if ($LASTEXITCODE -ne 0) {
  throw 'La construction Android pour emulateur a echoue.'
}
