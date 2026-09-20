$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $jdk) {
  throw 'JDK 21 introuvable. Installez Eclipse Temurin JDK 21 avant de compiler Android.'
}

if (-not (Test-Path -LiteralPath $androidSdk)) {
  throw "Android SDK introuvable dans $androidSdk. Ouvrez Android Studio et installez le SDK API 36."
}

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_SDK_ROOT = $androidSdk

Push-Location $projectRoot
try {
  npm run cap:sync
  if ($LASTEXITCODE -ne 0) { throw 'La synchronisation Capacitor a échoué.' }

  Push-Location $androidRoot
  try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'La compilation Gradle a échoué.' }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

$apk = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $apk)) {
  throw 'La compilation est terminée mais aucun APK debug n’a été trouvé.'
}

Write-Host "APK StoreHub cree : $apk"
