# NEXUS V0.8 — Budget, récurrences et journal

## Objectifs

NEXUS sépare **prévoir** de **comptabiliser**. C'est une application de suivi financier personnel, pas une banque, ni un agrégateur de comptes. Toute transaction réelle doit être volontairement validée. Aucun abonnement payant ni API tierce n'est requis.

## Architecture et données

```text
data.transactions[]    = écritures du journal (réelles, existant depuis V0.2)
data.limits[]          = plafonds mensuels (existant)
data.recurrences[]     = règles de répétition (nouveau V0.8)
data.quickExpenses[]   = modèles de dépenses rapides (nouveau V0.8)
```

Le moteur UI et les calculs sont dans `budget-v08.js`. L'interface Budget existante de `app.js` appelle `window.NexusBudget.view()`. Les autres modules continuent d'utiliser `data.transactions` et `monthTotals`. Le fichier est précaché via le Service Worker `nexus-v0.8.0`.

### Récurrences

Chaque règle porte : `id`, `title`, `type` (`income`/`expense`), `amountCents`, `frequency` (`monthly`/`weekly`/`yearly`), `day`, `weekday`, `month`, `startDate`, `endDate`, `category`, `projectId`, `active`, `skips[]`, `createdAt`, `updatedAt`.

Le calcul par mois ne génère **pas** de transaction dans la base : il construit une liste d'occurrences temporaires pour l'affichage, le prévisionnel et la confirmation.

La clé d'occurrence stable est :

- mensuelle : `YYYY-MM` (une confirmation par mois, même si la règle change de jour) ;
- hebdomadaire : `YYYY-MM-DD` (une confirmation par date hebdomadaire) ;
- annuelle : `YYYY` (une confirmation par année).

L'opération enregistrée conserve `recurrenceId` et `occurrenceKey`, son montant et sa date **réelle**. Modifier, suspendre ou supprimer la règle ne touche pas au journal historique. Les occurrences « ignorées » sont enregistrées dans `skips[]` et ne gonflent pas la projection.

Le jour 29, 30 ou 31 est **rabattu au dernier jour des mois plus courts**, y compris février en année bissextile.

### Dépenses rapides

Modèle `quickExpenses[]` : `id`, `title`, `mode` (`fixed`/`variable`), `amountCents`, `category`, `projectId`, dates de création/modification.

Un modèle fixe valide crée une dépense au jour courant dès l'appui. Un modèle variable ouvre un formulaire court contenant montant et date. L'écriture créée stocke `quickExpenseId` afin de conserver sa provenance, même lorsque le modèle est ensuite modifié ou supprimé.

### Journal et statistiques

Le journal trie les opérations par date décroissante, les regroupe par jour, et permet de chercher par libellé, date ou catégorie. Les filtres type (`all`/`expense`/`income`) et catégorie n'altèrent jamais les données.

Le graphique sur six mois calcule recettes/dépenses réelles par mois depuis `data.transactions`. Les moyennes comprennent les mois sans mouvement et les mois partiels, ce qui doit être expliqué à l'utilisateur. Le flux net projeté additionne le net des opérations **réelles du mois** à la différence entre revenus et dépenses récurrents **restant à confirmer**.

**Important :** les transactions saisies manuellement ne sont pas rapprochées automatiquement de règles par titre, montant ou date (risque élevé de faux rapprochement). Si un mouvement a été saisi indépendamment, ignorer l'occurrence correspondante dans Récurrences.

## Tests réalisés

- Règle mensuelle le 31 : février 2027 → 28 février ; février 2028 → 29 février.
- Règle hebdomadaire le lundi : quatre occurrences en février 2028.
- Règle annuelle le 29 février : adaptation de l'échéance en année non bissextile.
- Occurrence ignorée, confirmation enregistrée et règle en pause : absentes du flux prévisionnel restant.
- Confirmation d'un salaire de 1 800 € ajusté à 1 805,50 € : règle à 1 800 € inchangée, journal à 1 805,50 €.
- Raccourci fixe à 3,40 € : ajout direct à `transactions[]`.
- Raccourci variable à 24,80 € et date choisie : ajout validé, sans montant prédéfini.
- Vues Vue d'ensemble, Récurrences, Journal, Statistiques : rendus simulés valides.

**Non encore vérifié** : affichage final et interactions complètes sur Safari iPhone réel. Aucune migration serveur ni modification du Worker Cloudflare.
