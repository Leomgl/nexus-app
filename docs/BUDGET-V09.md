# NEXUS V0.9 — Budget flexible

## Portée

Cette itération ajoute une **liste personnalisable de catégories**, leur couleur, les raccourcis épinglés et un aperçu prévisionnel sur trois mois, sans appel réseau ni frais.

## Compatibilité des données

Nouveau tableau `data.budgetCategories[]`. Anciennes sauvegardes chargées sans cette propriété : `assignData` crée un tableau vide et la bibliothèque des 11 catégories historiques apparaît par défaut via des IDs stables `default-0` à `default-10`. Les catégories utilisées précédemment et absentes de la liste sont ajoutées virtuellement au catalogue, afin de ne pas casser les données déjà enregistrées.

Une catégorie modifiée est persistée sous `{id,name,color,archived,createdAt,updatedAt}`. Une catégorie créée reçoit un UUID ; l'archivage persiste `archived:true`. Couleur validée par `/^#[0-9a-fA-F]{6}$/`.

Les opérations, les récurrences et les dépenses rapides conservent leur champ `category` **textuel** pour compatibilité avec les anciens fichiers et avec le moteur actuel. Renommer est donc une opération coordonnée sur ces trois tableaux. Les nouveaux formulaires excluent les catégories archivées ; les formulaires d'édition conservent l'ancienne valeur même archivée.

Épingler une dépense rapide ajoute `pinned:boolean` au modèle `data.quickExpenses[]`, sans modifier les opérations déjà enregistrées. Les modèles épinglés apparaissent en premier.

Les trois cartes de projection calculent, pour les trois prochains mois relativement au mois affiché :

```text
prévision revenus = recettes réelles déjà inscrites + recettes récurrentes non confirmées
prévision dépenses = dépenses réelles déjà inscrites + dépenses récurrentes non confirmées
flux net prévu = prévision revenus - prévision dépenses
```

Cette projection n'inclut pas des dépenses futures non créées, ni une estimation de solde du compte courant. Elle ne permet pas de déclencher des prélèvements et ne communique aucune donnée à un service bancaire.

## Test manuel iPhone

1. Budget → **Gérer mes catégories** → Nouvelle catégorie « Restaurants », couleur libre.
2. Créer une opération dans le Journal et choisir « Restaurants ».
3. Renommer en « Sorties et restaurants » : le journal doit afficher le nouveau nom, avec le même montant et la même date.
4. Archiver : le nom reste visible sur l'écriture précédente, mais disparaît des catégories sélectionnables d'une nouvelle opération.
5. Créer un raccourci « Café » à montant fixe, l'épingler et vérifier qu'il remonte.
6. Créer une récurrence mensuelle et regarder les **trois prochains mois** sur Vue d'ensemble.
7. Exporter les données JSON, puis vérifier que `budgetCategories` est présent dans le fichier (sans désinstaller la PWA).

**Non modifiés :** Cloudflare Worker, D1, Web Push, passkeys, schéma IndexedDB et l'ensemble des modules non budgétaires.
