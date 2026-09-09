# Rapport de nouveau test — espaces Client et Boutique

Date : 4 septembre 2026  
Application testée : `http://localhost:3000/`  
Portée : contrôles visuels sans compte connecté, analyse du code, compilation, API publiques/privées et règles Firebase. Aucune donnée métier n’a été créée ou modifiée pendant cet audit.

## Verdict

**L’application démarre et compile, mais elle n’est pas encore prête pour une mise en marché.**

Les points les plus urgents concernent l’inscription Boutique, l’intégrité des statistiques Firestore, les stocks existants et le risque de mélanger l’espace Client et l’espace Boutique lorsque le profil Firebase ne peut pas être vérifié.

## Résultats par parcours

| # | Parcours vérifié | État | Résultat |
|---|---|---|---|
| 1 | Sélection Client / Boutique | Partiel | Les deux accès s’ouvrent, mais les cartes sont des `div` cliquables non utilisables correctement au clavier. |
| 2 | Connexion Client | Partiel | Formulaire, validation et bouton Google présents. Connexion réelle non exécutée faute de compte de test. |
| 3 | Inscription Client | Partiel | Le code crée Firebase Auth, envoie la vérification email, crée le profil puis supprime le compte Auth si la création du profil échoue. Création réelle non exécutée pour éviter un compte supplémentaire. |
| 4 | Connexion Boutique | Partiel | Le formulaire s’ouvre et la validation locale du mot de passe oublié fonctionne. Connexion réelle non exécutée faute de compte de test. |
| 5 | Inscription Boutique | **Échec critique** | Le formulaire demande logo et documents, mais ne les téléverse pas, ne crée aucun document Boutique et connecte immédiatement l’utilisateur. |
| 6 | API publiques | Réussi | Santé, configuration Firebase, boutiques, produits et visibilité répondent en HTTP 200. |
| 7 | Protection API privées | Réussi | Commandes, réservations, profil, abonnements et messages renvoient HTTP 401 sans jeton Firebase. |
| 8 | Compilation TypeScript | Réussi | `tsc --noEmit` termine sans erreur. |
| 9 | Build de production | Réussi avec avertissement | Le build termine, mais le paquet JavaScript principal pèse environ 1,69 Mo avant gzip. |
| 10 | Tests automatisés | **Échec** | Aucun script ni scénario de test automatisé n’est présent. |

## Erreurs trouvées, classées par priorité

| Priorité | Erreur confirmée | Impact | Preuve |
|---|---|---|---|
| **P0** | L’inscription Boutique ne crée pas réellement une boutique. | Un vendeur peut créer un compte puis arriver sur « Aucune boutique associée » sans pouvoir exploiter la console. | `Login.tsx` crée seulement Firebase Auth et `/api/users/profile`; aucune création de boutique. |
| **P0** | Le logo et les documents d’inscription Boutique sont seulement affichés dans le formulaire. | Les fichiers sélectionnés ne sont ni compressés, ni téléversés, ni enregistrés, ni transmis à une validation administrative. | Les états `logoFile` et `docFile` ne sont pas envoyés dans `handleRegisterSubmit`. |
| **P0** | Les règles Firestore autorisent une modification publique non authentifiée de `visibilityDaily`. | Une personne peut falsifier l’évolution de visibilité d’une boutique; les statistiques ne sont donc pas garanties fiables. | `validPublicBoutiqueAnalyticsUpdate()` accepte une modification de `visibilityDaily` sans `signedIn()` ni contrôle de valeur. |
| **P1** | Les 7 produits actuellement renvoyés par l’API n’ont pas de champ `stock`. | Lors du premier passage d’une commande à « livré », le serveur considère un stock absent comme `1`, puis peut rendre l’article indisponible à tort. | Test API : 7/7 produits sans stock; `db.ts` utilise la valeur de secours `1`. |
| **P1** | Le bouton Boutique vendeur peut ouvrir `boutique_1` ou la première boutique si la boutique du propriétaire est introuvable. | Un vendeur sans boutique associée peut voir la mauvaise vitrine, ce qui recrée une confusion entre comptes/boutiques. | `App.tsx`, `handleOpenOwnBoutique()`, repli vers `boutique_1` puis `boutiques[0]`. |
| **P1** | En cas d’échec de lecture du profil après connexion, l’application continue avec un profil local basé sur le rôle choisi à l’écran. | Une panne réseau peut afficher la mauvaise navigation Client/Boutique et contourner la vérification du rôle applicatif. | `App.tsx`, `handleLogin()`, erreur capturée puis `setUser(profile)` malgré l’échec. |
| **P1** | « Nombre de clients » est calculé avec le nom du client et non son identifiant. | Deux clients portant le même nom sont fusionnés; un client qui change de nom peut être compté deux fois. | `Dashboard.tsx` construit un `Set` de `order.clientName`. |
| **P1** | « Nombre de catalogues » correspond au nombre de catégories de produits. | L’indicateur n’affiche pas le nombre réel de catalogues/collections. | `Dashboard.tsx` affecte `catalogCount = availableCategories.length`. |
| **P1** | 7 vulnérabilités de dépendances en production. | Risques de déni de service, crash ou lecture de fichiers de source map selon les chemins utilisés. | Audit npm : 3 élevées, 4 modérées, 0 critique; correctifs disponibles. |
| **P1** | Aucun test automatisé Client/Boutique. | Les régressions sur connexion, réservation, messages, commandes, rôle et stock ne sont pas détectées avant publication. | `package.json` ne contient pas de script `test`. |
| **P2** | Les règles Firebase présentes localement ne peuvent pas être confirmées comme déployées. | Le comportement réel de production peut différer du dépôt local. | Firebase CLI absent et fichier `.firebaserc` absent. |
| **P2** | La limite affichée pour le logo Boutique est 5 Mo, tandis que Storage impose 1 Mo. | L’utilisateur peut choisir un fichier annoncé valide qui sera refusé au téléversement. | Texte du formulaire : 5 Mo; `storage.rules` : 1 Mo. |
| **P2** | Les boutons œil des mots de passe n’ont pas de nom accessible. | Un lecteur d’écran annonce un bouton vide. | Les snapshots DOM montrent des boutons sans libellé; absence de `aria-label`. |
| **P2** | Les cartes de sélection Client/Boutique ne sont pas de vrais boutons. | Navigation clavier et accessibilité réduites. | `motion.div` avec `onClick`, sans rôle, tabulation ni gestion clavier. |
| **P3** | Le titre Boutique affiche « Sign In » alors que le reste est en français. | Incohérence de langue et finition moins professionnelle. | Écran de connexion Boutique. |
| **P3** | `/api/analytics/boutiques/not-found/visibility` renvoie 200 avec 30 jours à zéro. | Une boutique inexistante ressemble à une vraie boutique sans trafic; le diagnostic devient trompeur. | Test API direct. |
| **P3** | Le paquet JavaScript principal est volumineux. | Démarrage plus lent sur réseau mobile ou téléphone moyen de gamme. | Build Vite : environ 1 693,79 Ko, avertissement au-dessus de 500 Ko. |

## Éléments confirmés opérationnels

- L’application locale répond correctement et les journaux serveur ne montrent aucune erreur au démarrage.
- La compilation TypeScript et le build de production terminent avec succès.
- Les API publiques retournent les données Firebase actuelles : 3 boutiques et 7 produits.
- Les anciennes images `blob:` ou `data:` ne sont plus exposées par l’API publique; l’image invalide de « Teste s22 » est remplacée par l’image par défaut.
- Toutes les API privées testées refusent correctement une requête non authentifiée avec HTTP 401.
- La courbe de visibilité retourne 30 jours de données réelles pour les boutiques existantes.
- Les produits les plus vendus sont calculés depuis les commandes marquées `livre` et leurs quantités.
- Les faux boutons Facebook, Instagram et TikTok sont désactivés et identifiés comme bientôt disponibles.
- La validation locale de « Mot de passe oublié » demande bien une adresse email avant l’envoi.

## Limites de ce test

Les parcours connectés n’ont pas pu être exécutés jusqu’au bout sans deux comptes de test dédiés : un compte Client vérifié et un compte Boutique propriétaire d’une boutique. Par conséquent, les opérations suivantes restent à tester en conditions réelles après correction des P0/P1 : connexion Google, réservation, suivi client, favoris, abonnement/désabonnement, messagerie bidirectionnelle, création/modification d’article, commande, passage à livré et notification Boutique.

## Ordre de correction recommandé

1. Terminer le workflow d’inscription Boutique : création de boutique, téléversements sécurisés, statut de validation et rollback Firebase Auth.
2. Fermer la modification publique arbitraire de `visibilityDaily` et déplacer l’écriture des statistiques vers une API serveur contrôlée.
3. Migrer tous les produits existants vers un stock explicite avant d’activer la décrémentation automatique.
4. Supprimer les replis vers `boutique_1` et bloquer l’entrée si le profil Firebase ne peut pas être vérifié.
5. Corriger les calculs clients/catalogues.
6. Mettre à jour les dépendances puis ajouter des tests automatisés Client/Boutique.
7. Corriger les défauts d’accessibilité, de langue et de performance.
