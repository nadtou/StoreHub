# Plan : Stabilisation de StoreHub et livraison Android

> PRD source : demande utilisateur du 16 septembre 2026 et audit technique local du projet

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Conteneur Android** : conserver l'application React/Vite et l'intégrer avec Capacitor 8, au lieu de réécrire immédiatement l'interface en natif.
- **Routes** : remplacer les appels relatifs `/api/*` par une origine d'API configurable et sécurisée en production ; aucune adresse `localhost` dans l'application publiée.
- **Données** : Firebase Authentication identifie l'utilisateur ; Firestore reste la source de vérité pour les utilisateurs, boutiques, produits, commandes, réservations, conversations et notes de modération.
- **Modèles clés** : `UserProfile`, `Boutique`, `Product`, `Order`, `Reservation`, `ChatThread`, `ChatMessage`, `ModerationNote`.
- **Autorisation** : contrôle côté serveur et règles Firebase ; le rôle ou l'affichage côté client ne doit jamais suffire à autoriser une action.
- **Fichiers** : Firebase Storage avec chemins propriétaires, types autorisés, limites de taille et métadonnées contrôlées.
- **Qualité** : aucune publication si les parcours critiques ne passent pas sur appareil réel, si une vulnérabilité élevée reste ouverte, ou si le retour arrière n'est pas testé.
- **Distribution** : Android App Bundle signé, Play App Signing, piste de test interne puis déploiement progressif.

---

## Phase 1 : Baseline vérifiable et correction des risques immédiats

**User stories** : US-01 Diagnostic fiable, US-02 Dépendances sûres, US-03 Construction reproductible

### Ce qu'on livre

Une version web reproductible dont la compilation, la santé serveur, les dépendances et les principaux parcours sont mesurés automatiquement avant toute conversion mobile.

### Critères d'acceptation

- [x] TypeScript passe sans erreur.
- [x] La construction de production aboutit.
- [x] Les quatre alertes de sécurité élevées sont corrigées sans régression.
- [x] Une commande unique exécute contrôle de types, tests, construction et audit de sécurité.
- [ ] Les secrets et fichiers locaux sont exclus du dépôt.

## Bloquée par

*Aucune — démarrable immédiatement*

---

## Phase 2 : Parcours critiques client, boutique et administration

**User stories** : US-04 Client autonome, US-05 Boutique opérationnelle, US-06 Administration sûre

### Ce qu'on livre

Les parcours inscription/connexion, réservation/commande, catalogue, messagerie et modération fonctionnent de bout en bout avec des états de chargement, d'erreur et de reprise cohérents.

### Critères d'acceptation

- [x] Le compte client est créé, vérifié, reconnecté et réinitialisé correctement.
- [x] Une boutique soumet son dossier, attend la validation, puis accède uniquement après approbation.
- [x] Une réservation ou commande est visible des deux côtés avec le même statut.
- [x] Les messages et commentaires de modération arrivent au bon destinataire.
- [x] Suspendre, confirmer, révoquer et réactiver sont testés avec contrôle d'autorisation.
- [x] Les données d'un compte ne sont jamais accessibles depuis un autre compte.

## Bloquée par

- Phase 1

---

## Phase 3 : Sécurité Firebase et résilience réseau

**User stories** : US-07 Données isolées, US-08 Téléversement sûr, US-09 Résistance aux abus

### Ce qu'on livre

Une couche Firebase vérifiée par émulateurs et App Check, avec règles, index, limites de téléversement et comportement réseau dégradé testés.

### Critères d'acceptation

- [x] Les règles Firestore et Storage ont des tests positifs et négatifs par rôle.
- [ ] App Check est activé progressivement après observation des métriques.
- [x] Les images sont WebP, 1080 px maximum, qualité 80 %, et respectent la limite serveur.
- [ ] Les erreurs hors-ligne, délais et doubles clics n'entraînent ni doublon ni perte silencieuse.
- [x] Les sauvegardes et la procédure de restauration sont documentées et testées.

## Bloquée par

- Phase 2

---

## Phase 4 : Socle Android Capacitor

**User stories** : US-10 Installation Android, US-11 Configuration par environnement

### Ce qu'on livre

Le même produit s'exécute dans un projet Android géré par Android Studio, avec une origine d'API de production, un identifiant de paquet définitif et des environnements séparés.

### Critères d'acceptation

- [ ] Capacitor est initialisé avec `webDir` pointant vers la sortie Vite.
- [ ] Le projet Android est généré, synchronisé et versionné.
- [ ] Les appels API utilisent une URL HTTPS configurable et fonctionnent dans la WebView.
- [ ] Les configurations développement, test et production sont distinctes.
- [ ] L'application démarre sur émulateur et sur téléphone physique Android 7 ou supérieur.

## Bloquée par

- Phase 3

---

## Phase 5 : Intégrations mobiles et expérience native

**User stories** : US-12 Connexion mobile, US-13 Caméra et fichiers, US-14 Navigation Android, US-15 Notifications

### Ce qu'on livre

Les fonctions dépendantes du téléphone — connexion Google, caméra, sélection de fichiers, bouton retour, clavier, liens et notifications — se comportent comme une vraie application Android.

### Critères d'acceptation

- [ ] Google Sign-In fonctionne avec l'identifiant Android et les empreintes SHA configurées.
- [ ] Caméra et galerie gèrent autorisation accordée, refusée et retirée.
- [ ] Le bouton Retour Android navigue correctement sans fermer l'application par surprise.
- [ ] Les barres système, zones sûres et le clavier ne masquent aucune action.
- [ ] Les notifications de commande ouvrent le bon écran et respectent le consentement.

## Bloquée par

- Phase 4

---

## Phase 6 : Qualité appareil, performance et accessibilité

**User stories** : US-16 Fluidité, US-17 Compatibilité appareils, US-18 Accessibilité

### Ce qu'on livre

Une version candidate testée automatiquement et manuellement sur plusieurs tailles d'écran et conditions réseau, avec un démarrage et une navigation suffisamment rapides.

### Critères d'acceptation

- [ ] Le JavaScript initial est découpé et ne déclenche plus l'avertissement de paquet supérieur à 500 kB.
- [ ] Les parcours critiques passent sur Samsung S22 Ultra et au moins deux autres profils Android.
- [ ] Les scénarios réseau lent, hors-ligne, reprise et rotation sont validés.
- [ ] Les textes, contrastes, zones tactiles et lecteurs d'écran sont contrôlés.
- [ ] Aucun plantage bloquant ni erreur de données n'est ouvert.

## Bloquée par

- Phase 5

---

## Phase 7 : AAB, conformité Play Store et lancement progressif

**User stories** : US-19 Publication sûre, US-20 Suivi après lancement

### Ce qu'on livre

Un Android App Bundle signé et testé sur la piste interne, accompagné des informations légales et commerciales requises, puis diffusé progressivement avec surveillance et retour arrière.

### Critères d'acceptation

- [ ] L'application cible Android 16 / API 36 conformément à l'exigence applicable au lancement prévu.
- [ ] La clé d'envoi est sauvegardée et Play App Signing est activé.
- [ ] La politique de confidentialité et le formulaire Sécurité des données correspondent au comportement réel.
- [ ] L'AAB passe le test interne Play Console et les tests pré-lancement.
- [ ] Le déploiement commence par un faible pourcentage et possède des seuils d'arrêt documentés.
- [ ] Les erreurs, performances et versions sont surveillées après publication.

## Bloquée par

- Phase 6
