# NEXUS V0.20.1 — Budget avancé

> Code implémenté le 11 novembre 2026. Référence principale à relire dans un nouveau thread avec [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md).
>
> **Tests automatisés et recette iPhone à distinguer.** Aucun compte bancaire, aucun prélèvement ni paiement n'est connecté.

## Intentions

NEXUS conserve le statut de **centre de pilotage personnel**. Le module Budget expose désormais trois espaces : **Quotidien**, **Engagements** et **Objectifs**. Les onglets historiques Vue d'ensemble, Journal et Statistiques sont préservés dans Quotidien. Engagements réutilise le moteur de récurrences déjà existant, sans reconstruire une seconde projection.

## Ce qui est développé

### 1. Quotidien

- **Vue d'ensemble** : recettes et dépenses réelles du mois, prévisions et plafond.
- **Journal** : toutes les opérations confirmées, y compris les achats payés qui arrivent depuis Gaming/Rituel via NEXUS LINK.
- **Statistiques** : évolutions des six derniers mois et dépenses par catégorie.
- Les dépenses sont toujours exprimées en **centimes entiers** ; les prévisions ne sont pas des mouvements bancaires réels.

### 2. Engagements — abonnements et prêts

Le système existant `data.recurrences[]` conserve l'autorité sur les échéances.

Un **abonnement** est une règle de récurrence de type `expense`, `commitmentKind:'subscription'`, avec fréquence mensuelle ou annuelle, montant par échéance, première date, fin éventuelle, URL HTTPS de service facultative, notes et état actif/pause. Le montant mensuel équivalent d'un abonnement annuel est un simple **repère indicatif** arrondi, et non une écriture dans le Journal.

Un **prêt** est une règle de récurrence `expense`, `frequency:'monthly'`, `commitmentKind:'loan'`, avec `loanInstallments` (1 à 600), `loanPrincipalCents` facultatif, montant de la mensualité, première échéance, fin calculée au dernier jour du dernier mois et état actif/pause. Le jour des échéances est rabattu au dernier jour du mois quand nécessaire : démarrer un 31 janvier fonctionne en février, y compris les années bissextiles.

Le nombre de mensualités confirmées provient exclusivement des transactions réelles portant le **même** `recurrenceId` et une `occurrenceKey` mensuelle unique. Le montant « reste à confirmer » est un **montant théorique de mensualités planifiées**, pas le capital restant dû : intérêts, frais, remboursements anticipés et amortissement exact ne sont pas calculés.

Le bas de l'écran Engagements conserve l'échéancier et les commandes de confirmation/ignorance des récurrences historiques. Les opérations existantes ne sont jamais effacées lorsqu'on modifie, met en pause ou supprime une règle. Les abonnements et prêts n'apparaissent pas une deuxième fois dans la liste des « Autres récurrences ».

**Conversion sans doublon :** l'action « Classer une récurrence » transforme une dépense récurrente existante en abonnement (mensuel/annuel) ou en prêt (mensuel seulement) en **conservant son identifiant**, ses `skips[]`, ses transactions liées et son historique. La première date proposée est calculée selon le jour/mois effectifs de la règle. L'utilisateur vérifie le calendrier avant d'enregistrer. Aucun prélèvement supplémentaire n'est créé.

### 3. Objectifs d'épargne

Nouveau tableau `data.savingsGoals[]`. Chaque entrée :

```js
{
 id, title, targetCents, startingCents, targetDate, projectId, notes,
 paused, contributions: [
   { id, amountCents, direction: 'deposit'|'withdraw', date, note, createdAt }
 ],
 createdAt, updatedAt
}
```

- **Progression** = somme initiale déclarée + versements manuels − retraits manuels.
- Retrait interdit s'il dépasse le montant actuellement suivi. Montants positifs validés en centimes.
- Cible et montant atteint, échéance facultative, filtre « Tous / En cours / Atteints / En pause ».
- Association facultative avec un projet NEXUS préexistant.
- Historique daté et retrait d'une saisie après confirmation, sans solde négatif.
- Repère mensuel purement indicatif lorsque la date cible est future.
- **Aucune contribution ne crée une transaction dans le Journal**. Cet outil est un suivi déclaré, pas une preuve de transfert bancaire, et ne doit pas être additionné aux dépenses ou au solde d'un compte.

## Stockage, migration, sauvegarde et corbeille

`app.js` ajoute uniquement `savingsGoals:[]` au modèle. `assignData()` continue de migrer sans casse les sauvegardes antérieures : si le champ est absent, il devient une liste vide. Export JSON et coffre reprennent l'objet `data` complet. Pas de nouvelle base IndexedDB, pas de migration D1 ni changement Cloudflare.

Le module `recycle.js` reconnaît maintenant `savingsGoals`, permet restauration de chaque objectif et inclut ces objectifs dans une réinitialisation globale du Budget. Les récurrences typées restent restaurables comme les autres récurrences.

**Contrainte sécurité actuelle :** IndexedDB local non chiffré, export JSON clair, origine GitHub Pages partagée. L'origine dédiée NEXUS reste une dette à traiter prudemment pour ne pas perdre les données ou les notifications iOS.

## Architecture et fichiers

| Fichier | Rôle |
|---|---|
| `budget-v08.js` | Navigation 3 espaces, tous les calculs existants du Journal/récurrences/prévisions |
| `budget-v020.js` | Fiches spécialisées abonnements/prêts, conversion d'anciennes règles, historique et progression des objectifs |
| `budget-v020.css` | Nouveaux éléments responsive, scoped `.b20-*` |
| `app.js` | Ajout `savingsGoals` et routage des actions `b20-` |
| `recycle.js` | Suppression/récupération et reset Budget incluant les objectifs |
| `index.html`, `sw.js` | Version affichée V0.20.1, scripts/styles versionnés, cache offline |
| `tests/budget-v020.test.cjs` | Échéanciers, année bissextile, modèle financier, migration, classification |
| `tests/contacts-budget.test.cjs` | Tests historiques, version et concordance des fichiers offline |

## Parcours de validation iPhone

1. Dans NEXUS → Budget, vérifier les onglets **Quotidien / Engagements / Objectifs**. Dans Quotidien, retrouver le Journal, les statistiques et les prévisions habituelles.
2. Engagements → ajouter un abonnement mensuel de test, puis annuel ; vérifier la projection et le regroupement, **sans nouvelle dépense réelle**.
3. Confirmer une occurrence dans l'échéancier : **une** écriture au Journal et plus d'occurrence en attente pour la même clé.
4. Mettre l'abonnement en pause, vérifier que les anciennes écritures restent visibles.
5. Si tu as déjà une récurrence mensuelle, **Classer une récurrence → Abonnement** : vérifier même identifiant, pas de double prévision.
6. Créer un prêt avec 12 échéances et une date du 31 ; vérifier le calendrier de février et le calcul théorique des mensualités non confirmées.
7. Créer un objectif (par exemple 1 000 €), inscrire un versement puis un retrait ; vérifier la barre et l'historique, **sans augmentation artificielle des dépenses**.
8. Associer un objectif à un projet, tester Pause puis reprendre.
9. Placer un objectif dans la corbeille, le restaurer ; vérifier l'historique des contributions.
10. Fermer et relancer NEXUS : données persistées, version V0.20.1 visible, aucun affichage horizontal cassé sur iPhone.
11. Tester le mode hors ligne : ouvrir Budget et ses fiches, pas d'erreur de chargement des scripts.
12. Sauvegarder en JSON dans Fichiers et vérifier localement que `savingsGoals` fait partie de la sauvegarde (ne jamais publier ce fichier).

## Hors périmètre

- Import bancaire, Open Banking ou synchronisation de comptes réels.
- Calcul précis d'amortissement de prêt, tableau de remboursement avec taux TAEG et capital restant dû.
- Déclenchement automatique d'un transfert bancaire ou d'une opération de carte.
- Inter-app Vestiaire contextualisée, prévue pour V0.21.
- Command Center, prévu pour V0.22.

## Principes de développement

- Toujours lire le code `main` et ce document avant de prolonger la V0.20.
- Ne jamais dupliquer dans une autre collection les récurrences de prêts/abonnements.
- Les projets d'épargne doivent rester hors Journal jusqu'à une **fonction dédiée de rapprochement**, explicitement décidée et approuvée.
- Tenir à jour la version visible, le Service Worker, les scripts/styles et les tests à chaque publication.
