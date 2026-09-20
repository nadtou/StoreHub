# Design QA — fiche produit mobile

## Cibles comparées

- Vérité visuelle source : `.codex-artifacts/adidas-product-mobile-reference.png`
- Implémentation rendue : `.codex-artifacts/storehub-product-mobile-final.png`
- Comparaison combinée : `.codex-artifacts/product-design-qa-comparison-final.png`
- État : fiche produit ouverte, première image active, aucune option modifiée.
- Référence : capture mobile Adidas, 375 × 812 px, densité 1.
- Implémentation : capture navigateur 1273 × 716 px ; contenu applicatif comparé sur la zone 418 × 714 px, densité 1.

## Évidence de comparaison

La comparaison combinée confirme la même hiérarchie principale que la référence : navigation courte, contexte produit, statut, titre et prix avant l’image, grande galerie dominante, puis accès direct aux photos et aux variantes. La navigation basse appartient à StoreHub et remplace volontairement l’en-tête marchand Adidas.

Le contrôle focalisé sur la partie basse a vérifié les pastilles de couleur, la grille de tailles, le bouton de réservation, le bouton boutique et les accordéons. Aucun contrôle essentiel n’est masqué par la navigation de l’application.

## Surfaces de fidélité

- Typographie : hiérarchie dense, capitales franches et poids forts cohérents avec la référence, en conservant les polices StoreHub.
- Espacement et rythme : enchaînement information → image → variantes → tailles → action conforme au modèle de référence.
- Couleurs : noir, doré et blanc StoreHub conservés ; la structure Adidas est reprise sans copier son identité visuelle.
- Images : image produit réelle, nette, centrée dans une galerie carrée ; miniatures disponibles immédiatement après.
- Contenu : libellés adaptés au fonctionnement StoreHub, sans paiement ni panier fictif.

## Historique des corrections

1. P1 — La grille desktop s’activait dans le cadre téléphone et comprimait la galerie. Correction : suppression des ruptures desktop internes et restitution d’un flux mobile unique. Vérification : la galerie occupe désormais toute la largeur utile.
2. P2 — L’ouverture d’un article conservait parfois la position de défilement de la console. Correction : retour automatique en haut à chaque changement d’article. Vérification : le titre, le prix et la première image apparaissent dès l’ouverture.
3. P2 — L’action principale pouvait apparaître blanche au survol. Correction : maintien d’un survol doré cohérent avec le thème StoreHub.

## Tests d’interaction

- Changement de couleur : réussi, état radio et libellé synchronisés.
- Changement de taille : réussi, sélection visible.
- Réservation : réussi, confirmation temporaire affichée.
- Accordéons : réussi, un panneau ouvert à la fois.
- Retour et accès boutique : présents et accessibles.
- Erreurs console sur une session propre : aucune.

## Résultat

Aucun écart P0, P1 ou P2 restant sur la mise en page et le parcours principal. Les différences de marque, de navigation et de palette sont intentionnelles.

final result: passed

---

# Design QA — cartes boutiques administrateur mobile

## Cibles comparées

- Vérité visuelle source : `C:/Users/Mohamed/AppData/Local/Temp/codex-clipboard-f0820fd4-859b-4da4-85e0-d4b1124447e1.png`
- Implémentation rendue : `.codex-audit/admin-boutiques-after.png`
- Comparaison combinée : `.codex-audit/admin-boutiques-comparison.png`
- État : Quartier Général → Gestion des Boutiques, première rangée visible, boutique suspendue « Teste APK ».
- Navigateur : Codex In-app Browser, fenêtre 1028 × 912 px, DPR 1.
- Cadre applicatif : 440 × 839 px ; carte mesurée à 173 × 383 px.
- Normalisation : la source 200 × 445 px et la région rendue ont été ramenées à deux colonnes de 200 × 445 px dans la comparaison combinée.

## Évidence de comparaison

La comparaison focalisée montre que le badge « Suspendue » ne recouvre plus le titre, que le nom et le slug disposent de leur propre ligne et que les métadonnées Catalogue/ID restent lisibles dans une carte de 173 px. Le contrôle pleine vue confirme que les deux cartes par rangée sont conservées et que les actions Révoquer/Réactiver restent visibles au-dessus de la barre administrateur.

## Surfaces de fidélité

- Typographie : familles StoreHub conservées ; nom limité à deux lignes, slug tronqué sur une ligne, badge réduit à 7–8 px sans chevauchement.
- Espacement et rythme : padding mobile ramené à 12 px, statut et identité séparés, statistiques empilées et actions pleine largeur.
- Couleurs : noir, doré et états rouge/ambre conservés sans changement de sémantique.
- Images : logo réel de la boutique conservé avec son masque circulaire et son badge de certification.
- Contenu : description, nombre d’articles, identifiant et libellés administratifs conservés.

## Historique des corrections

1. P1 — Le badge de statut recouvrait le nom sur une carte de 173 px. Correction : badge placé sur une rangée dédiée, identité rendue `min-width: 0`, titre limité à deux lignes. Vérification : aucun chevauchement visible dans `.codex-audit/admin-boutiques-comparison.png`.
2. P2 — Le slug se cassait caractère par caractère. Correction : affichage sur une ligne avec troncature et valeur complète disponible dans l’attribut `title`.
3. P2 — Catalogue et identifiant se télescopaient horizontalement. Correction : deux rangées clé/valeur avec valeur alignée à droite et identifiant tronqué proprement.
4. P2 — Le padding et les écarts réduisaient excessivement la largeur utile. Correction : padding et gap spécifiques au mobile, valeurs desktop préservées à partir de `sm`.

## Tests d’interaction

- Recherche « Teste » : réussie, deux boutiques filtrées et compteur synchronisé.
- Actions administratives : boutons visibles, activables et non masqués ; aucune mutation de données exécutée pendant le contrôle visuel.
- Console navigateur : aucune erreur, uniquement les messages de développement Vite/Firebase.

## Résultat

Aucun écart P0, P1 ou P2 restant sur la carte mobile examinée. Les deux colonnes demandées sont conservées avec une hiérarchie lisible.

final result: passed
