# Phase 3 — Validation Firebase et résilience

Date : 17 septembre 2026

## Résultats

| Point | Résultat | Preuve |
|---|---|---|
| 3.1 Firestore | Terminé | 8 scénarios émulateur : lecture publique, profils, commandes, email vérifié, boutique en attente, isolation catalogue, messagerie, dossiers légaux et administration. |
| 3.2 Storage | Terminé | 6 scénarios émulateur : propriétaire, taille, type MIME, avatar, document légal privé, lecture admin et suppression. |
| 3.3 WebP | Terminé | 4 tests : orientation portrait/paysage, recadrage carré, 1080 px, qualité 80 %, MIME WebP, poids et erreurs. |
| 3.4 App Check | Observation active | Le domaine Firebase Hosting est utilisable et le client/API sont prêts. La clé de site et la période d'observation restent nécessaires. |
| 3.5 Sauvegarde | Terminé | Restauration isolée automatisée, scripts de production en simulation et procédure d'exploitation documentée. |

## Commandes de preuve

```powershell
npm run test:unit
npm run test:rules
npm run test:backup
npm run verify
```

Les règles Firestore et Storage ont été compilées puis déployées avec succès sur `store-hub-2026`.

## Seul élément externe restant

App Check ne peut pas passer de l'observation au blocage avant la création de la clé reCAPTCHA Enterprise, sa configuration sur `store-hub-2026.web.app` et la diffusion du client attesté. La procédure et le script sont prêts dans `docs/FIREBASE_APP_CHECK.md` et `scripts/configure-app-check.ps1`. Activer `enforced` trop tôt bloquerait les utilisateurs légitimes.
