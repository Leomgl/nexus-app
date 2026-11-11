# NEXUS V0.16 — Budget et carnet de contacts

## Achats → Journal

Les objets `data.purchases[]` gardent leur prix estimé (`priceCents`), une catégorie (`category`) et le statut `planned | purchased | canceled`.

Sur un changement vers `purchased`, que ce soit via **Marquer acheté** ou via le formulaire d'édition :

1. Si aucune transaction active ne porte ce `purchaseId` et que `priceCents > 0`, une transaction **expense** est créée dans `data.transactions[]`.
2. La transaction reprend le titre, prix, catégorie, note et projet de l'achat, et la date `purchasedAt` (à défaut, aujourd'hui).
3. La vérification sur `purchaseId` empêche de créer plusieurs écritures pour le même achat.
4. Sans prix positif, la validation demande d'abord de renseigner un montant. Une ancienne fiche déjà « Acheté » sans écriture peut toujours utiliser **Ajouter au budget**.
5. Une fois enregistrée, la transaction constitue une opération historique. Modifier le prix ou repasser l'achat dans les prévisions **ne supprime pas** l'écriture ; corriger son montant ou sa date se fait depuis le Journal.

La projection, les plafonds et les dépenses de projet continuent de calculer leurs totaux **uniquement depuis le Journal**. Une fiche « À acheter » ne compte pas comme dépense.

## Contacts, Agenda et Rappels

- Les deux formulaires affichent **Créer un contact** à côté de la sélection d'une personne existante.
- Les champs de la personne (nom requis, téléphone, e-mail, contexte) sont validés avec la fiche en cours. Une seule sauvegarde locale enregistre le contact et le `personId` du rappel ou de l'événement.
- Une tentative de création d'un contact au nom / numéro / e-mail déjà présent est refusée, pour proposer de sélectionner la fiche existante.
- Les fiches Personnes acceptent maintenant `organization`, `address` et `notes`, sans enlever les champs historiques.
- Depuis une fiche Personne : `tel:` (application Téléphone), `sms:` (Messages, qui décidera entre SMS et iMessage) et `mailto:` (mail). L'utilisateur reste maître de l'action ; une PWA ne peut pas appeler silencieusement.

## Import des contacts iOS

Dans l'app Contacts iPhone, utiliser l'option **Exporter** une liste / des contacts au format vCard si disponible, enregistrer le fichier `.vcf` dans Fichiers, puis choisir **Personnes → Importer .vcf** depuis NEXUS.

- Un seul fichier par import ; UTF-8 vCard standard 3.0/4.0 (2.1 en texte simple dans la mesure du possible).
- Gestion des champs `FN`, `N`, `TEL`, `EMAIL`, `ORG`, `TITLE`, `ROLE`, `ADR`, `NOTE` et des lignes pliées.
- Max 8 Mo et 5 000 fiches ; aucun import n'est appliqué avant l'aperçu et la confirmation.
- Les doublons simples par e-mail / numéro, ou par nom si aucune coordonnée n'est présente, sont ignorés. Les fiches existantes ne sont pas modifiées par l'import.
- Les photos, groupes, labels multiples et cas complexes d'encodage vCard ne sont pas pris en charge.
- Le fichier est **lu localement** : il n'est pas téléversé pour être analysé. Une fois importées, les données font partie du stockage local et des exports JSON ; si le coffre chiffré / la synchronisation NEXUS est activé(e), elles rejoignent les snapshots chiffrés comme les autres données. Le Worker ne reçoit pas le vCard en clair.
- Safari iOS/PWA ne permet pas de garantir une lecture directe du carnet iOS natif. C'est pourquoi le fichier vCard est l'option gratuite et portable.

## Compatibilité / livraison

- **Aucune migration IndexedDB, D1, Worker, Web Push, passkeys ou connexions inter-app.**
- Service Worker : `nexus-v0.16.0`; précharge `contacts-v016.js`.
- Tests automatisables : vérification syntaxe JS, débit achat → transaction unique, montant absent, vCard et échappement.
- Tests manuels iPhone indispensables : saisie via Agenda et Rappels, ouverture du téléphone et de Messages, export .vcf depuis Contacts, import avec/sans doublons, calcul mensuel après achat, synchronisation chiffrée sur appareil secondaire.
