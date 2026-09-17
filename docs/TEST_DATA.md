# Données et scénarios de test StoreHub

> Document de référence pour les tests locaux et la future validation Android.
> Dernière mise à jour : 17 septembre 2026.

## 1. Règles de sécurité des données de test

- Utiliser uniquement des comptes dédiés aux tests, jamais les comptes personnels des futurs clients ou gérants.
- Ne jamais enregistrer de mot de passe, clé Firebase, jeton d'authentification ou document d'identité réel dans Git.
- Utiliser des adresses contrôlées par l'équipe avec un préfixe explicite, par exemple `test.client+01@domaine-test.example`.
- Utiliser des images et documents fictifs clairement marqués **TEST — SANS VALEUR LÉGALE**.
- Supprimer les données créées lors d'un test avant de relancer le même scénario, ou employer un identifiant unique.
- Ne jamais exécuter les tests destructifs sur la base de production.

## 2. Environnements

| Environnement | Usage | Données autorisées | Actions destructives |
|---|---|---|---|
| Local | Développement quotidien | Données fictives | Autorisées après vérification de la cible |
| Firebase test | Intégration et validation des règles | Comptes et documents fictifs | Autorisées avec nettoyage automatique |
| Production | Utilisateurs réels | Données réelles | Interdites hors procédure administrateur validée |

La configuration de test doit utiliser un projet Firebase distinct de la production ou les émulateurs Firebase.

## 3. Données de démonstration présentes dans le code

Le fichier `src/mockData.ts` contient actuellement des données de présentation. Elles servent à l'interface et ne doivent pas être considérées comme des comptes Firebase réels.

### Boutiques fictives

| Identifiant | Nom | Statut attendu | Utilité principale |
|---|---|---|---|
| `boutique_1` | Atelier Noir | Vérifiée et mise en avant | Catalogue client et boutique validée |
| `boutique_2` | Maison Dorée | Vérifiée et mise en avant | Deuxième boutique pour tester l'isolation |
| `boutique_3` | Koben | Non vérifiée | Parcours de validation administrateur |

### Produits fictifs

| Identifiant | Boutique | Article | Catégorie | Disponibilité |
|---|---|---|---|---|
| `prod_1` | Atelier Noir | Robe Soie Ivoire | Robes | Disponible |
| `prod_2` | Atelier Noir | Trench Architectonique | Vestes et manteaux | Disponible |
| `prod_3` | Maison Dorée | Sautoir Cascade Solaire | Bijoux | Disponible |
| `prod_4` | Maison Dorée | Caban en Lin Riviera | Vestes et manteaux | Disponible |
| `prod_5` | Koben | Pull Mérinos Structure | Hauts | Disponible |
| `prod_6` | Koben | Sac Messager Modulaire | Accessoires | Disponible |

Tous les prix fictifs utilisent la devise `DZD`.

## 4. Comptes de test à préparer

Les adresses exactes sont conservées dans le gestionnaire de secrets de l'équipe et non dans ce dépôt.

| Référence | Rôle | État initial | Résultat attendu |
|---|---|---|---|
| `TEST-CLIENT-01` | Client | Email vérifié | Accès immédiat à l'espace client |
| `TEST-CLIENT-02` | Client | Email non vérifié | Message de vérification adapté |
| `TEST-BOUTIQUE-PENDING` | Gérant | Dossier envoyé | Accès bloqué jusqu'à validation |
| `TEST-BOUTIQUE-VERIFIED` | Gérant | Boutique vérifiée | Accès au tableau de bord boutique |
| `TEST-BOUTIQUE-SUSPENDED` | Gérant | Boutique suspendue | Accès métier refusé avec explication |
| `TEST-ADMIN-01` | Administrateur | Claim Firebase `role=admin` | Accès aux contrôles administrateur |
| `TEST-UNAUTHORIZED-01` | Client normal | Aucun rôle admin | Refus de toutes les routes administrateur |

## 5. Collections Firestore attendues

| Collection | Contenu | Isolation à vérifier |
|---|---|---|
| `users` | Profil et préférences du compte | Un utilisateur ne modifie que son profil |
| `boutiques` | Profil, validation et paramètres boutique | Le propriétaire ou l'administrateur autorisé uniquement |
| `products` | Catalogue des boutiques | Écriture limitée au propriétaire de la boutique |
| `orders` | Commandes et réservations | Client et boutique concernés uniquement |
| `chats` | Messages client-boutique | Participants de la conversation uniquement |
| `moderationNotes` | Commentaires administratifs | Admin en écriture, gérant concerné en lecture |

## 6. Jeu de données minimal par scénario

### Scénario A — Inscription client

1. Créer `TEST-CLIENT-01` avec un email de test unique.
2. Vérifier l'email.
3. Compléter le profil sans information personnelle réelle.
4. Suivre `boutique_1`.
5. Vérifier que la boutique apparaît dans l'onglet des boutiques suivies.

**Résultat attendu :** le compte client fonctionne sans validation manuelle de l'administrateur.

### Scénario B — Inscription boutique et validation

1. Créer `TEST-BOUTIQUE-PENDING`.
2. Envoyer une image fictive et un faux document marqué TEST.
3. Vérifier l'état `pending` côté gérant.
4. Ouvrir le dossier avec `TEST-ADMIN-01`.
5. Confirmer la boutique.
6. Reconnecter le gérant et vérifier l'accès.

**Résultat attendu :** l'accès boutique reste fermé avant validation et s'ouvre après confirmation.

### Scénario C — Commande et stock

1. Utiliser un produit de test avec un stock initial de `3`.
2. Créer une réservation depuis `TEST-CLIENT-01`.
3. Vérifier l'alerte et la commande côté boutique.
4. Passer la commande à l'état livré.
5. Vérifier le stock final attendu selon la règle métier choisie.

**Résultat attendu :** une seule commande existe, les deux côtés voient le même statut et le stock n'est modifié qu'une seule fois.

### Scénario D — Messagerie

1. Envoyer un message du client vers `boutique_1`.
2. Répondre avec le compte boutique.
3. Vérifier que `boutique_2` et un autre client ne peuvent pas lire la conversation.

**Résultat attendu :** seuls les participants autorisés lisent et écrivent dans le fil.

### Scénario E — Modération

1. Ajouter une note de modération sur un produit de `boutique_1`.
2. Vérifier sa réception dans la console du gérant concerné.
3. Marquer la note comme résolue.
4. Tester confirmer, suspendre, révoquer et réactiver sur une boutique de test.

**Résultat attendu :** chaque action est persistée, journalisée et inaccessible à un compte non administrateur.

## 7. Fichiers de test

Préparer localement, hors Git :

- une image JPEG valide inférieure à 1 Mo ;
- une image supérieure à 1 Mo pour tester le refus ;
- un fichier texte renommé en `.jpg` pour tester le contrôle du type ;
- un PDF fictif inférieur à 5 Mo marqué **TEST — SANS VALEUR LÉGALE** ;
- une image très grande pour vérifier la conversion WebP, 1080 px maximum et qualité 80 %.

## 8. Nettoyage après test

1. Supprimer les commandes, messages et notes créés par le scénario.
2. Supprimer les fichiers Storage appartenant aux comptes de test.
3. Supprimer les profils, boutiques et produits de test.
4. Supprimer les comptes Firebase Authentication de test.
5. Vérifier qu'aucune donnée portant le préfixe `TEST-` ne reste dans l'environnement.

## 9. Condition de validation

Un scénario est considéré comme terminé seulement si :

- le résultat attendu est observé dans l'interface ;
- la donnée Firestore correspond au résultat affiché ;
- les accès interdits sont effectivement refusés ;
- aucune erreur inattendue n'apparaît dans le serveur ou le navigateur ;
- le nettoyage des données de test a été effectué.
