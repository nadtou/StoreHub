[CmdletBinding()]
param(
  [string]$ProjectId = "store-hub-2026",
  [string]$WebAppId = "1:626897743129:web:104ef87893047977422988",
  [Parameter(Mandatory = $true)]
  [string]$RecaptchaEnterpriseSiteKey,
  [ValidateSet("unenforced", "enforced")]
  [string]$Mode = "unenforced"
)

$ErrorActionPreference = "Stop"
$firebaseCli = Join-Path $PSScriptRoot "..\node_modules\firebase-tools\lib\bin\firebase.js"
$firebaseCli = [System.IO.Path]::GetFullPath($firebaseCli)
if (-not (Test-Path -LiteralPath $firebaseCli)) {
  throw "Firebase CLI local est introuvable. Lancez npm install."
}

& node $firebaseCli experiments:enable appcheckadmin | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Impossible d'activer les commandes App Check." }

& node $firebaseCli appcheck:providers:set recaptcha-enterprise `
  --app $WebAppId `
  --site-key $RecaptchaEnterpriseSiteKey `
  --token-ttl 1h `
  --min-score 0.5 `
  --project $ProjectId | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Impossible de configurer le fournisseur App Check." }

foreach ($service in @("firestore", "storage")) {
  & node $firebaseCli appcheck:services:set $service $Mode --force --project $ProjectId | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Impossible de configurer App Check pour $service." }
}

& node $firebaseCli appcheck:services:list --project $ProjectId | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Impossible de relire l'état App Check." }

Write-Host "Configuration App Check terminée. Ajoutez aussi FIREBASE_APP_CHECK_SITE_KEY et STOREHUB_APP_CHECK_MODE au serveur."
