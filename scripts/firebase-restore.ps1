[CmdletBinding()]
param(
  [string]$ProjectId = "store-hub-2026",
  [Parameter(Mandatory = $true)]
  [string]$ExportUri,
  [string]$Database = "(default)",
  [switch]$Execute,
  [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"
if (-not $ExportUri.StartsWith("gs://")) {
  throw "ExportUri doit commencer par gs://."
}

$arguments = @(
  "firestore", "import", $ExportUri,
  "--project=$ProjectId",
  "--database=$Database",
  "--async"
)

Write-Host "Source : $ExportUri"
Write-Host "Cible : $ProjectId / $Database"
Write-Host "Commande : gcloud $($arguments -join ' ')"

if (-not $Execute) {
  Write-Host "Simulation terminée. Aucun document n'a été modifié."
  exit 0
}
if (-not $ConfirmRestore) {
  throw "Ajoutez -ConfirmRestore pour confirmer explicitement l'import."
}

$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
  throw "Google Cloud CLI est requis pour lancer la restauration réelle."
}

& $gcloud.Source @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Le démarrage de l'import Firestore a échoué avec le code $LASTEXITCODE."
}

Write-Host "Import démarré. Contrôlez son état avec : gcloud firestore operations list --project=$ProjectId"
