# NEXUS V0.11 — Journal Budget ergonomique

## Objectif

Réduire le nombre de gestes pour corriger ou annuler une opération sans casser les relations du second cerveau, et éviter de reconfigurer les filtres du journal à chaque ouverture.

## Interactions

**Budget → Journal** présente à la suite de chaque opération deux boutons : **Modifier** (édition express) et **Supprimer** (corbeille universelle).

### Modification express

La fenêtre dédiée contient : libellé, type, montant, date et catégorie. L'utilisateur peut confirmer, annuler ou ouvrir **Fiche complète**. Les champs non visibles restent inchangés : IDs d'origine, références des projets, achats, notes, récurrences et raccourcis, ainsi que les dates de création.

Validations :
- Montant positif valide dans les bornes existantes du module financier.
- Type limité aux valeurs `expense` / `income`.
- Date réellement valide `YYYY-MM-DD` : `2026-02-31` est refusée, même si certains moteurs JavaScript la normalisent.
- Une dépense liée à un achat (`purchaseId`) ne peut pas devenir une recette.
- Une catégorie historique archivée peut être conservée en édition, mais une catégorie inconnue ou supprimée ne peut pas être attribuée comme valeur nouvelle.

### Suppression et annulation

Le bouton Supprimer fait `window.NexusRecycle.remove('transactions', id)`. Le système général demande confirmation, déplace l'écriture vers `trash[]`, conserve tous ses attributs, propose Annuler puis une restauration ultérieure. Aucune suppression définitive n'est déclenchée directement depuis le journal.

### Préférences du journal

```json
{ "type": "expense", "category": "Loisirs" }
```

Stockage local `nexus_budget_journal_filters_v010`. Le type n'accepte que `all`, `expense`, `income`. Une catégorie est une chaîne de caractères de longueur limitée ; si elle n'apparaît pas dans le mois affiché, le sélecteur la conserve pour que l'utilisateur comprenne pourquoi la liste est vide. La recherche en texte libre reste volontairement éphémère.

Les modifications de nom de catégorie et l'archivage du module Budget mettent à jour cette préférence. « Effacer les filtres » restaure les sélections initiales.

## Compatibilité

- Aucune migration de la base locale ou distante.
- Le nouveau comportement est dans `budget-v08.js` : le nom du fichier reste stable pour éviter un remaniement inutile du chargeur et du cache.
- `app.js` route désormais aussi les actions `b10-*` vers le Budget.
- Service Worker : cache `nexus-v0.11.0`.
- Les clients Web Push, coffre cloud et passkeys restent inchangés.
- RITUEL est totalement indépendant ; aucun code n'y a été modifié.

## Validation

Tests simulés : écriture existante issue d'une récurrence et d'un raccourci, changement de montant 22,99 → 25,50 €, de date et de titre, préservation des liens, dates impossibles refusées, montants nuls refusés, mémoire des filtres après réinitialisation du moteur Budget, remise à zéro des filtres, suppression envoyée au système de corbeille.

Validation visuelle et interactions Safari iPhone nécessaires avant stabilisation.
