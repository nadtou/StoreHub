# Phase 4 — Socle Android StoreHub

Date de démarrage : 18 septembre 2026

## Identité retenue

- Nom public : **StoreHub**
- Identifiant Android : `com.IAuniver.storehub`
- Application Firebase Android : `1:626897743129:android:0cab0dbc6a7e140c422988`
- Runtime hybride : **Capacitor 8**
- Dossier web mobile : `dist-mobile`
- Android minimum : API 24
- Adresse Web de secours : `https://store-hub-2026.web.app`

L'identifiant conserve volontairement la casse déjà enregistrée dans Firebase afin de ne pas casser la configuration OAuth existante.

## Commandes du projet

```powershell
npm run build:mobile
npm run cap:sync
npm run cap:open
npm run cap:run
npm run android:debug
npm run android:emulator
```

`cap:sync` construit l'interface mobile puis la copie dans le projet Android. `android:debug` enchaîne la synchronisation et la compilation Gradle avec JDK 21. `android:emulator` construit une version de test reliée au serveur local par `10.0.2.2:3000` ; cette variante ne doit pas être envoyée à un autre téléphone.

## Test local avec l'émulateur Android

1. Démarrer StoreHub avec `npm run dev`.
2. Définir temporairement `CAPACITOR_SERVER_URL=http://10.0.2.2:3000`.
3. Synchroniser puis lancer Android avec `npm run cap:sync` et `npm run cap:run`.
4. Retirer `CAPACITOR_SERVER_URL` avant toute construction de publication.

`10.0.2.2` est l'adresse utilisée par l'émulateur Android pour joindre le serveur local de l'ordinateur.

## Prérequis du poste

- Node.js 22 ou plus récent.
- Android Studio 2025.2.1 ou plus récent.
- Android SDK et plateforme API 36.
- JDK fourni par Android Studio.

## État de la phase

| Point | État | Détail |
|---|---|---|
| 4.1 Identité Android | Terminé | Le paquet Firebase existant est conservé. |
| 4.2 Capacitor | Terminé | Runtime, CLI, configuration et construction mobile sont intégrés. |
| 4.3 Projet Android | Terminé | Projet généré et compilation Gradle debug réussie. |
| 4.4 API HTTPS | En cours | La sélection par environnement est prête, mais l'API de production doit être déployée. |
| 4.5 Premier démarrage | En cours | Installation, démarrage à froid et navigation Client réussis sur l'émulateur API 36 ; téléphone physique à vérifier. |

## Preuves Android

- APK debug : `android/app/build/outputs/apk/debug/app-debug.apk`
- Taille : 7,75 Mio
- SHA-256 : `9990B3E74A15D22361F09B258A94458E8BFF82C21DB92FA79AF33B2AE294BCD2`
- Résultat Gradle : `BUILD SUCCESSFUL`, 94 tâches exécutées
- Émulateur : `medium_phone`, Android API 36, lancement à froid réussi
- Navigation vérifiée : écran d'accueil puis écran Connexion Client, sans erreur fatale dans les journaux Android
- Sauvegarde automatique Android désactivée afin de ne pas exporter les données privées de la WebView

## Point bloquant externe

Le domaine personnalisé n'est pas requis pour continuer. En revanche, une version publiée ne doit pas appeler une API locale : l'API Express devra être déployée en HTTPS avant de valider 4.4 et 4.5.
