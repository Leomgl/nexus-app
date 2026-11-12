# NEXUS V0.21.6 — Import privé du budget

## But
Importer depuis l'iPhone un fichier NEXUS Budget JSON ou plusieurs CSV de type Notion, sans mettre les montants personnels dans le dépôt GitHub Pages public, sans dupliquer les opérations présentes, et sans reprendre les états d'origine.

## Produit
- Budget → Engagements → **Importer des lignes**.
- Lecture locale via File API et aperçu ligne par ligne (nouvelles / déjà présentes / montant différent).
- L'import ne modifie ni les entrées existantes ni les statuts du CSV et ne génère aucune transaction du Journal.
- Tous les nouveaux postes passent dans **data.recurrences[]** : salaire/revenu régulier, abonnements spécialisés, prêts spécialisés et autres dépenses régulières.
- Les deux blocs spécialisés conservent le même moteur de récurrences que NEXUS, sans double prévision.
- Le dédoublonnage tient compte de la nature de l'entrée, du nom (accents/casse et alias connus), de la provenance déjà importée, ainsi que d'un salaire connu par sa catégorie.
- Un écart de montant avec une entrée déjà présente bloque son remplacement silencieux.
- Les fichiers CSV peuvent contenir Montant, Montant signé, Type, Catégorie, Nom, État ; la colonne État n'est jamais lue pour classifier les opérations.
- Le fichier JSON d'import privé contient {kind:'nexus-budget-import',version:1,items:[{title,amountCents,type,category,commitmentKind,source}]}.
- Aucun fichier personnel d'import, sauvegarde ou relevé n'est commité au dépôt.

## Calendrier à compléter
Les CSV fournis ne contiennent pas les dates de première échéance, les jours de prélèvement, les fréquences détaillées ni les durées de prêt. Par choix de sûreté :
- la fréquence mensuelle est l'hypothèse initiale modifiable par l'utilisateur dans les fiches abonnement/autres récurrences ;
- les nouvelles règles utilisent schedulePending:true, startDate:'', endDate:'' et n'ont **aucune occurrence**, notification budgétaire ni écriture automatique tant que l'utilisateur n'a pas indiqué une date ;
- les prêts importés ont loanInstallments:null ; l'éditeur permet de laisser cette donnée vide et la progression affiche — (pas 0/0 ni faux reste à payer) ;
- un enregistrement du formulaire date/règle enlève schedulePending et utilise la date réelle choisie ;
- le champ active ne reprend pas l'état du CSV : l'utilisateur gère ses pauses/activations directement dans NEXUS.
- Le service « Revolut » d'un CSV sans catégorie est classé provisoirement comme abonnement et sa catégorie doit être vérifiée.

## Stockage et sécurité
L'import s'exécute sur l'appareil, ne publie pas les sommes dans le repo ou dans les URLs et sauvegarde dans le stockage local existant. Une lecture après persist() valide la présence des IDs ajoutés. En cas d'échec confirmé, les ajouts de la session sont annulés en mémoire et une erreur est indiquée. Les sauvegardes cloud suivent le mécanisme NEXUS existant. La protection du stockage local suit les limites déjà documentées.

## Fichiers
- Nouveau : budget-import-v0216.js, tests/budget-import-v0216.test.cjs.
- Modifiés : budget-v08.js (règles sans échéance), budget-v020.js (éditeur et rendu), budget-v020.css (aperçu), app.js (événements), index.html (input et script), sw.js (cache), tests/contacts-budget.test.cjs (version).
- Version visible : 0.21.6 ; cache : nexus-v0.21.6.0.

## Recette
1. Ouvrir Budget → Engagements → Importer des lignes et choisir le JSON privé ou les CSV d'origine.
2. Examiner les doublons, puis confirmer. Refaire exactement le même import : zéro ajout.
3. Vérifier abonnements et prêts dans leurs blocs, autres prélèvements dans les récurrences ; pas de transaction dans le Journal.
4. Ouvrir un abonnement/prêt importé, renseigner sa date réelle (et la durée du prêt si connue), enregistrer puis vérifier une seule occurrence à la bonne date.
5. Vérifier les sommes existantes conservées, y compris le salaire automatique.
6. Vérifier notifications uniquement après renseignement des échéances. Vérifier l'absence de doublons de salaire dans le Journal.
7. Vérifier installation iOS, fichiers sélectionnables, sauvegarde locale, redémarrage, hors-ligne et boutons sur appareil réel.
