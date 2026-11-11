# NEXUS V0.17 — Personnes : répertoire compact

## Objectif

Retirer les détails inutiles de la liste et stabiliser la présentation sur iPhone : **une seule colonne de petites cartes** (photo ronde ou initiale + nom + étoile éventuelle), pas de numéro ni d'e-mail dans les aperçus. La fiche complète reste accessible au toucher et contient toutes les coordonnées, les actions iOS et les relations NEXUS.

### Présentation et navigation

- Conteneur isolé `.nx-contacts-page`, dimensions contraintes à 100 % du parent, sans débordement horizontal.
- Recherche instantanée sur nom, numéro, e-mail, organisation, rôle et tags ; seul le résultat est remplacé pendant la frappe afin de préserver le focus.
- Mini-réglette **A–Z** sur le côté droit, avec uniquement les lettres ayant des contacts activées. Elle fait défiler la page jusqu'à la section correspondante, en tenant compte de la zone d'en-tête. Les noms commençant par un emoji sont classés d'après la première lettre alphabétique.
- Réglette active en tri A–Z / Z–A ; masquée pour les tris non alphabétiques.
- Tris : A→Z, Z→A, Favoris d'abord, Ajouts récents.
- Filtres : favoris et tags/catégories, combinables avec la recherche.
- CSS mobile 1 colonne, cartes de 52 px minimum ; sur écran plus large : deux colonnes `minmax(0, 1fr)`. Les champs de recherche et de tri utilisent au moins 16 px sur Safari mobile pour éviter le zoom au focus.
- Aucun changement de navigation des autres modules, ni de structure de stockage générale.

### Données

Un contact conserve ses propriétés existantes ; les champs facultatifs nouveaux sont :

```json
{
  "favorite": true,
  "tags": ["Famille", "Travail"],
  "photo": "data:image/jpeg;base64,..."
}
```

Les catégories sont des **tags multiples** modifiables en séparant les libellés par des virgules dans le formulaire (8 tags maximum, 35 caractères chacun). Les tags existants sont automatiquement repris dans le menu de filtre. Aucun changement d'identifiant des personnes, ni des liens Agenda/Rappels. Une fiche ne portant ni tag ni favori reste fonctionnelle.

### Photos

- L'utilisateur peut ajouter/remplacer/retirer une photo depuis la fiche de contact.
- Import des photos intégrées au champ `PHOTO` d'un fichier vCard (base64 JPEG/PNG/WebP, HEIC/HEIF quand le navigateur sait les décoder).
- Recadrage carré au centre + réduction locale à **96×96 px en JPEG** (qualité 0,68), donc seulement la miniature est conservée.
- Import d'un fichier `.vcf` local jusqu'à 20 Mo. Jusqu'à 5 000 contacts reconnus et **250 photos traitées par import**, avec plafond global d'environ 1,6 million de caractères de miniatures afin de limiter le poids du coffre.
- **Réimport sans doublons** : les fiches déjà présentes sont identifiées par e-mail ou numéro, ou par nom lorsqu'aucune coordonnée n'existe. Les nouvelles données de fiches existantes ne les écrasent pas. Si la fiche n'a pas de photo et que la vCard en contient une, l'import peut ajouter **uniquement la photo manquante**, après validation. Recommencer l'import peut récupérer des photos non traitées précédemment en raison du plafond de 250.
- Aucun chargement d'images externes depuis un champ PHOTO distant. Les types invalides et images illisibles sont ignorés.
- Le fichier vCard n'est pas envoyé à un serveur pour l'import. Une fois enregistrés, les contacts suivent les **exports JSON** et les **snapshots chiffrés** du coffre NEXUS si activé. Attention : l'export JSON local contient les données en clair.

### Vérifications

Automatiques : analyse syntaxique des fichiers JS et tests Node sur le parsing de vCard, les photos encodées, le contenu de la page contacts, le tri et les tags.

À tester manuellement sur un iPhone :
1. Ouvrir Personnes avec un grand carnet : aucun débordement horizontal et cartes à une colonne.
2. Chercher un nom et un numéro : focus conservé et clavier stable.
3. Appuyer sur M, Z et sur une lettre sans contact ; vérifier le défilement.
4. Étoiler une fiche, filtrer Favoris, ajouter « Famille, Travail », filtrer un tag.
5. Ouvrir et fermer la fiche, accéder à Appeler / Message / Mail, modifier les coordonnées.
6. Ajouter une photo depuis Photos ou Fichiers, fermer et rouvrir NEXUS.
7. Réimporter un `.vcf` avec photo pour un contact déjà présent : photo ajoutée, aucune nouvelle fiche créée.
8. Sauvegarder/restaurer en JSON et vérifier favoris, tags, liens et miniatures ; tester le coffre chiffré sur un second appareil.

**Limites connues :** la photo dépend du contenu réellement exporté par iOS ; un fichier vCard peut ne pas inclure les photos. Les types HEIC/HEIF ne passent que si WebKit les décode. Une PWA ne peut pas lire directement les contacts natifs iPhone ni appeler sans l'intervention d'iOS.

### Compatibilité

- Version `0.17` : nouveau module `contacts-v017.js` à la place de `contacts-v016.js`.
- Cache PWA incrémenté, sans migration D1, Worker, IndexedDB, Web Push ou passkeys.
- Données existantes conservées : `data.contacts[]` inclut des attributs optionnels simplement absents pour les fiches historiques.


## V0.17.2 — Réimport complet sans rupture des liens

Dans **Personnes → Gérer le carnet**, deux actions sont séparées :

- **Réimporter et remplacer** (recommandé) : charge un nouveau fichier .vcf, calcule un aperçu des contacts reconnus, nouveaux et absents, ainsi que des photos intégrées. Après saisie exacte de `REMPLACER`, une sauvegarde JSON NEXUS est téléchargée avant modification. Les contacts reconnus conservent leur **ID**, leurs favoris et leurs tags. Le nom, téléphone, e-mail et informations complémentaires sont actualisés depuis les champs non vides du fichier. Leurs notes locales sont conservées en priorité ; les photos peuvent être remplacées si elles sont fournies et décodables. Les contacts absents du .vcf sont déplacés sous une entrée groupée de corbeille. Toute restauration éventuelle conserve les IDs et leurs liens antérieurs.
- **Vider le carnet** : délègue au moteur de réinitialisation existant (`NexusRecycle.resetModule('contacts')`), avec confirmation `PERSONNES` et récupération via corbeille. **Attention :** les contacts réimportés ensuite obtiennent de nouveaux IDs, donc ce choix peut rompre les liens avec Agenda/Rappels.
- **Exporter NEXUS** : produit une copie JSON complète du carnet et des autres modules ; fichier en clair à protéger.

L'aperçu indique aussi le nombre de photos `PHOTO` détectées dans le .vcf. Si zéro photo est annoncée, vider le carnet n'en créera pas : il faut d'abord réexporter les fiches iPhone avec leurs photos.

Les photos restent miniaturisées localement avec le plafond existant : au plus 250 photos décodées par import, et un plafond de stockage. Les contacts supprimés placés en corbeille restent dans les sauvegardes chiffrées **et dans le JSON local en clair** jusqu'à purge, laquelle ne supprime pas d'anciennes sauvegardes.

### Sécurité et limites vérifiées dans le code

- IndexedDB `nexus-v0-1` : **données non chiffrées au repos** (contacts et clé de récupération incluse dans une entrée séparée), dépendantes du système de sécurité iOS et de l'origine web.
- Coffre Cloudflare : clé de récupération locale, dérivation HKDF, AES-256-GCM pour les snapshots. D1 stocke un texte chiffré et un vérificateur ; le serveur peut traiter des métadonnées techniques, pas la liste des contacts en clair en fonctionnement normal.
- Les plusieurs PWAs servies sous `https://leomgl.github.io` partagent la **même origine web**. Un script compromis sur cette origine, ou du JavaScript injecté, pourrait accéder aux stockages et aux clés. La CSP et le chiffrement cloud ne suffisent pas à contrer ce scénario.
- Export JSON local **non chiffré**. Le contenu d'une corbeille ou d'une sauvegarde antérieure demeure accessible jusqu'à sa purge. Face ID/passkeys protègent un flux d'accès mais ne constituent pas un chiffrement local indépendant.
- **Avant usage avec des données très sensibles :** isoler NEXUS sur son propre hostname (migration prudente de l'origine de la PWA, restauration vérifiée des données et adaptations de l'API/du RP WebAuthn), ajouter un mécanisme de rotation/révocation et faire un audit des accès. Aucun slogan « impossible à voler » n'est justifié.

Tests à faire sur iPhone : import d'un .vcf avec photos, prévisualisation, remplacement (après export), conservation des IDs des contacts reconnus, restauration d'une fiche absente depuis la corbeille, absence de doublons et préservation des RDV/rappels.
