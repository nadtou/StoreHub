# Domaine officiel StoreHub

## Adresse retenue

- Application publique : `https://storehub.dz`
- Variante redirigée : `https://www.storehub.dz`
- API : `https://storehub.dz/api`
- Site Firebase de secours : `https://store-hub-2026.web.app`

Le code accepte déjà `VITE_API_ORIGIN=https://storehub.dz`. En développement, l'absence de cette variable conserve les appels relatifs vers `http://localhost:3000/api`.

## État

- [x] Nom de domaine choisi dans le code et la documentation.
- [x] Résolution HTTPS de l'API préparée pour le Web et la future application Android.
- [x] Métadonnées publiques du site mises à jour.
- [ ] Acheter ou confirmer la propriété de `storehub.dz`.
- [ ] Relier le domaine au site Firebase `store-hub-2026`.
- [ ] Ajouter les enregistrements DNS fournis par Firebase chez le registraire.
- [ ] Attendre la création automatique du certificat SSL Firebase.
- [ ] Créer la clé reCAPTCHA Enterprise limitée à `storehub.dz` et `www.storehub.dz`.
- [ ] Observer App Check, puis seulement ensuite activer le blocage.

## Connexion à Firebase après l'achat

1. Ouvrir **Firebase Console > Hosting > Ajouter un domaine personnalisé**.
2. Saisir `storehub.dz` et activer la redirection de `www.storehub.dz` vers le domaine principal.
3. Copier exactement les enregistrements DNS affichés par Firebase dans le compte du registraire `.dz`.
4. Attendre que Firebase affiche **Connecté** et que `https://storehub.dz` possède un certificat valide.
5. Ajouter `storehub.dz` aux domaines autorisés dans **Authentication > Paramètres > Domaines autorisés**.
6. Créer la clé reCAPTCHA Enterprise, puis exécuter :

```powershell
.\scripts\configure-app-check.ps1 -RecaptchaEnterpriseSiteKey "CLE_DE_SITE" -Mode unenforced
```

7. Déployer la version configurée, observer les métriques App Check, puis passer en mode `enforced` lorsque les requêtes légitimes sont attestées.

Ne pas activer le blocage App Check avant la connexion DNS et la diffusion du client configuré : cela refuserait les utilisateurs actuels.
