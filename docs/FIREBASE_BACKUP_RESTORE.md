# Sauvegarde et restauration Firebase — StoreHub

## Objectif

Réduire le risque de perte de données Firestore avant le lancement. La procédure couvre l'export géré vers Cloud Storage et une restauration contrôlée. Les médias Firebase Storage doivent utiliser la protection/duplication du bucket définie dans Google Cloud en complément.

## Politique retenue

- Responsable principal : administrateur technique StoreHub.
- Contrôle secondaire : propriétaire du projet Firebase.
- Fréquence : export quotidien à 02:00 UTC.
- Conservation : 7 sauvegardes quotidiennes, 4 hebdomadaires et 12 mensuelles.
- RPO visé (perte maximale de données) : 24 heures.
- RTO visé (temps de reprise) : 4 heures.
- Région : le bucket de sauvegarde doit être compatible et proche de Firestore `eur3`.
- Accès : aucun accès public ; compte de sauvegarde limité aux rôles export/import nécessaires.

## Préparation unique

1. Vérifier que le projet `store-hub-2026` utilise le forfait Blaze.
2. Créer un bucket Cloud Storage dédié dans une localisation compatible avec `eur3`.
3. Installer Google Cloud CLI et connecter uniquement le compte d'administration.
4. Activer les API Firestore et Cloud Storage si la console le demande.
5. Configurer une règle de cycle de vie du bucket selon la rétention ci-dessus.

## Sauvegarder

Tester d'abord la commande sans aucune écriture :

```powershell
.\scripts\firebase-backup.ps1 -BackupBucket "NOM_DU_BUCKET"
```

Puis démarrer l'export réel :

```powershell
.\scripts\firebase-backup.ps1 -BackupBucket "NOM_DU_BUCKET" -Execute
```

Contrôler l'opération jusqu'à son état final `SUCCESSFUL`. Un export Firestore n'est pas une photographie strictement instantanée : éviter les opérations de migration concurrentes pendant l'export.

## Restaurer

1. Identifier le dossier exact d'un export terminé dans Cloud Storage.
2. Exécuter une simulation :

```powershell
.\scripts\firebase-restore.ps1 -ExportUri "gs://NOM_DU_BUCKET/storehub/firestore/EXPORT"
```

3. Pour un incident réel, sauvegarder d'abord l'état actuel, puis confirmer explicitement :

```powershell
.\scripts\firebase-restore.ps1 -ExportUri "gs://NOM_DU_BUCKET/storehub/firestore/EXPORT" -Execute -ConfirmRestore
```

4. Vérifier les comptes, boutiques, produits, commandes, messages et dossiers de validation.
5. Vérifier les index et l'application, puis consigner l'opération dans le journal d'incident.

Une importation remplace les documents portant les mêmes identifiants, conserve les autres documents et ne déclenche pas les Cloud Functions. Elle doit donc être lancée uniquement depuis un compte autorisé et sur un export complet et terminé.

## Preuve automatisée

`npm run test:backup` crée une base Firestore d'émulation, y inscrit plusieurs documents contenant des champs imbriqués, produit un instantané JSON local, efface complètement la base isolée, restaure les documents depuis cet instantané et contrôle leur nombre ainsi que leur intégrité exacte. Le dossier temporaire est ensuite supprimé de façon contrôlée. Les scripts PowerShell de production sont validés séparément en mode simulation.

Cette preuve valide la procédure technique sans modifier la base de production.
