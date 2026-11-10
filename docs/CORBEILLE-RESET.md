# NEXUS V0.10 — Réversibilité des suppressions et resets

## Principe produit

Une application de gestion personnelle doit permettre à l'utilisateur de **se tromper sans détruire des informations**. Une suppression ordinaire n'est donc jamais un effacement définitif immédiat.

### Suppression et restauration

Un module partagé `recycle.js` centralise les opérations :

- `remove(key,id)` : demande confirmation, conserve une copie complète de l'élément dans `data.trash[]`, retire l'élément de son tableau actif, **sans effacer les références** dans les autres tableaux.
- `removeCategory(category)` : catégorie budgétaire vers corbeille, y compris les catégories prédéfinies (via ID et entrée tombstone). Les opérations historiques ne sont pas modifiées.
- Après suppression, NEXUS affiche un toast **Annuler** pendant environ 9,5 secondes.
- `restore(trashId)` : replace l'élément sous son identifiant original, mais refuse tout conflit d'ID actif. Pour une entrée groupée, la restauration est **atomique au niveau de la validation des collisions** : aucune réinsertion si un identifiant est en conflit.
- `trashPanel()` : liste des éléments avec libellé, type, date, boutons Restaurer ou suppression définitive.
- `emptyTrash()` : purge irréversible de la corbeille uniquement après saisie de `VIDER`.

Aucune suppression automatique de la corbeille n'est configurée. Les éléments y restent jusqu'à restauration ou purge explicite.

### Structure du journal de suppressions

```json
{
  "trash": [
    {
      "id": "id-de-la-suppression",
      "key": "projects",
      "record": {"id": "id-original", "title": "Projet"},
      "label": "Projet",
      "deletedAt": "2026-11-10T12:00:00.000Z",
      "reason": "manual"
    }
  ]
}
```

Les réinitialisations de module utilisent une variante `items:[{key,record}]` avec `reason:'module-reset'`. L'export, la restauration JSON et les snapshots chiffrés incluent `trash[]` grâce à la sérialisation générique de `data`.

### Centre de réinitialisation

`CONFIG` dans `recycle.js` est **le registre des modules réinitialisables** :

| Module | Tableaux déplacés dans la corbeille |
| --- | --- |
| Notes | `notes[]` |
| Agenda | `events[]` |
| Rappels | `tasks[]` |
| Personnes | `contacts[]` |
| Projets | `projects[]` |
| Achats | `purchases[]` |
| Budget | `transactions[]`, `limits[]`, `recurrences[]`, `quickExpenses[]`, `budgetCategories[]` |

Chaque reset affiche le nombre d'éléments, demande le nom du module en majuscules, déplace ses éléments vers **une seule entrée groupée**, puis propose Annuler. Les références d'autres blocs ne sont pas supprimées. Lorsque le module est vide, le bouton est désactivé.

**Lors de l'ajout d'un bloc futur** : enregistrer toutes ses collections dans `data` et ajouter le module et ses collections dans le registre `CONFIG`. Tester restauration groupée, liens croisés et export/synchro. La sécurité du reset ne doit pas être recodée dans chaque module.

### Limites et arbitrages

1. **Réinitialisation complète volontairement absente**. Avant de la déployer, prévoir : export et confirmation forte ; arrêt de la synchro ; désinscription Web Push ; rotation/révocation des clés et des passkeys ; suppression sur appareil et cloud ; parcours de récupération. Un bouton « Tout effacer » isolé aurait été dangereux.
2. La corbeille est **un ensemble de données chiffré côté cloud**, pas une protection contre quelqu'un pouvant lire l'IndexedDB local.
3. Une sauvegarde chiffrée distante peut contenir les éléments supprimés tant que la corbeille n'est pas purgée. Effacer dans la corbeille ne supprime pas les exports JSON préexistants ni les anciennes copies iCloud de l'appareil.
4. Supprimer un élément référencé rend temporairement ses liens indisponibles ; à la restauration, les liens réapparaissent par ID. Les formulaires de projet conservent une option temporaire pour éviter de supprimer un lien indirect en éditant un autre bloc.
5. La protection anti-conflits de `restore` concerne les IDs locaux ; elle ne remplace pas une fusion interappareil des snapshots.

### Vérifications réalisées

Tests simulés : suppression de projet et maintien des liens ; restauration ; protection anti-collision ; suppression de note et restauration ; reset Budget groupé, puis restauration de toutes ses collections ; retrait et rétablissement d'une catégorie par défaut ; accès aux fenêtres Corbeille et Réinitialisations ; vérification de la déclaration des collections.

Validation iPhone réelle à effectuer avant V1 : toucher Annuler, fermer/rouvrir la PWA puis restaurer, supprimer une catégorie, reset d'un module avec liens croisés, données visibles après réouverture, contrôle de l'export JSON.
