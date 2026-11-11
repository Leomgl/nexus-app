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
