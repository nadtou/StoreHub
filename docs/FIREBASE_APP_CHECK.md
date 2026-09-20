# Firebase App Check — StoreHub

## État vérifié le 17 septembre 2026

- Cloud Firestore : **Unenforced** (observation active).
- Cloud Storage : **Unenforced** (observation active).
- Adresse HTTPS actuelle : `https://store-hub-2026.web.app`.
- Fournisseur d'attestation Web : pas encore configuré, car la clé reCAPTCHA Enterprise reste à créer. Le domaine personnalisé est différé et n'est pas bloquant.
- API Express : middleware `off / monitor / enforce` implémenté ; mode par défaut `monitor`.
- Client : les appels API publics et authentifiés joignent automatiquement `X-Firebase-AppCheck` dès qu'une clé de site est configurée.

Le mode d'observation est volontaire : il collecte les requêtes vérifiées et non vérifiées sans interrompre l'application actuelle.

## Configuration de production

1. Utiliser d'abord le domaine Firebase Hosting `store-hub-2026.web.app`. Un domaine personnalisé pourra être relié plus tard.
2. Dans Google Cloud, créer une clé de site reCAPTCHA Enterprise de type Web limitée à `store-hub-2026.web.app`. Ne pas autoriser `localhost` sur la clé de production.
3. Configurer le fournisseur et conserver l'observation :

```powershell
.\scripts\configure-app-check.ps1 -RecaptchaEnterpriseSiteKey "CLE_DE_SITE" -Mode unenforced
```

4. Sur le serveur, définir :

```text
FIREBASE_APP_CHECK_SITE_KEY=CLE_DE_SITE
STOREHUB_APP_CHECK_MODE=monitor
FIREBASE_APP_CHECK_DEBUG=false
```

5. Déployer puis observer les métriques Firebase dans **Sécurité > App Check > API**. Vérifier que presque toutes les requêtes StoreHub sont classées comme vérifiées.
6. Lorsque la version attestée est diffusée et stable, activer le contrôle :

```powershell
.\scripts\configure-app-check.ps1 -RecaptchaEnterpriseSiteKey "CLE_DE_SITE" -Mode enforced
```

7. Passer également l'API déployée à `STOREHUB_APP_CHECK_MODE=enforce`.

Le passage en mode renforcé rejette les anciennes versions sans App Check. Pour cette raison, il ne doit pas être déclenché avant le déploiement de la clé de site et la validation des métriques.

## Développement local

Le mode de débogage App Check nécessite un jeton enregistré dans la console Firebase. Ne jamais publier ce jeton, l'ajouter au dépôt ou l'inclure dans une version destinée aux utilisateurs. La variable `FIREBASE_APP_CHECK_DEBUG=true` n'est acceptable que sur `localhost`.

Documentation officielle :

- https://firebase.google.com/docs/app-check/web/recaptcha-provider
- https://firebase.google.com/docs/app-check/monitor-metrics
- https://firebase.google.com/docs/app-check/enable-enforcement
- https://firebase.google.com/docs/app-check/custom-resource-backend
