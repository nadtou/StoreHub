[CmdletBinding()]
param(
  [string]$ProjectId = "store-hub-2026",
  [Parameter(Mandatory = $true)]
  [string]$BackupBucket,
  [string]$Database = "(default)",
  [switch]$Execute
)

$ErrorActionPreference = "Stop"
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ssZ")
$destination = "gs://$BackupBucket/storehub/firestore/$timestamp"
$arguments = @(
  "firestore", "export", $destination,
  "--project=$ProjectId",
  "--database=$Database",
  "--async"
)

Write-Host "Destination : $destination"
Write-Host "Commande : gcloud $($arguments -join ' ')"

if (-not $Execute) {
  Write-Host "Simulation terminée. Ajoutez -Execute après vérification du projet et du bucket."
  exit 0
}

$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
  throw "Google Cloud CLI est requis pour lancer la sauvegarde réelle."
}

& $gcloud.Source @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Le démarrage de l'export Firestore a échoué avec le code $LASTEXITCODE."
}

Write-Host "Export démarré. Contrôlez son état avec : gcloud firestore operations list --project=$ProjectId"
