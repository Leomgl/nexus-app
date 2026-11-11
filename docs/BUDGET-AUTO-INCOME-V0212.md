# NEXUS V0.21.2 — Revenus récurrents automatiques

> Correctif demandé le 11 novembre 2026 après les abonnements, crédits et objectifs de la V0.20.
> **NEXUS reste le cœur**. Aucune banque, aucun employeur ni service financier n'est connecté : NEXUS peut inscrire **un revenu programmé**, mais ne peut pas savoir qu'un virement est réellement arrivé.

## Ce qui change

Dans **Budget → Engagements**, une section **Revenus réguliers** affiche salaire, primes régulières, loyers reçus et toute autre règle de type `income`, avec son état **Automatique**, **Manuel** ou **En pause**. Le bouton **+ Revenu** ouvre le formulaire de récurrence existant, préconfiguré en recette. Les règles déjà créées restent éditables ; elles ne sont pas dupliquées.

Le formulaire de récurrence propose désormais, **seulement lorsque Nature = Recette** :

- **Inscrire automatiquement ce revenu au Journal** : décoché par défaut pour toutes les règles nouvelles et historiques ;
- un avertissement sur la date d'activation, les éventuelles saisies manuelles et l'absence de vérification bancaire.

Lorsque l'option est activée, la règle porte `autoBook:true` et `autoBookFrom:'YYYY-MM-DD'` (**date locale d'activation**). Aucun ancien salaire n'est repris avant cette date. Lorsqu'une règle passe en pause puis est réactivée, la date d'automatisation repart à **la date de réactivation** : les mois suspendus ne seront pas ajoutés.

## Moteur d'échéances

Le moteur `budget-v08.js` réutilise **strictement** les méthodes `occurrences(rule,month)`, `dateWithin()`, `skips[]` et la clé stable `(recurrenceId,occurrenceKey)`, comme la confirmation manuelle existante.

- Fréquences **mensuelle, hebdomadaire et annuelle**, avec report du jour 29/30/31 en fin de mois, y compris année bissextile ;
- à l'initialisation de l'app **après la lecture IndexedDB** (`startAutoIncome()`), au retour au premier plan, au retour en ligne et pendant les périodes où NEXUS reste ouverte ;
- rattrapage des échéances depuis la date d'activation, dans une fenêtre maximale de **36 mois** (avec limite de 160 écritures par passage pour éviter les volumes anormaux) ;
- **aucune transaction** avant échéance, aucune sur les règles inactives, les montants nuls, les dates invalides ou les occurrences marquées « Ignorer » ;
- vérification par l'identifiant stable déjà présent dans le Journal. Une saisie manuelle **liée à la récurrence** vaut déjà une échéance enregistrée et bloque un doublon ;
- si une **saisie libre non liée** a exactement les mêmes titre, date et montant que le revenu attendu, l'automatisation n'en crée pas un second : un message demande de vérifier/ignorer manuellement la période. Cette prudence évite les doublons sans créer de fausse relation ;
- après écriture, `app.js` relit le snapshot depuis IndexedDB (ou le fallback localStorage) et vérifie IDs, montants, dates et clés d'occurrence. En cas d'échec, tentative de rollback et avertissement.

Les revenus automatiques deviennent des écritures `data.transactions[]` au même titre que les opérations saisies, avec :

```js
{
  id, title, type: 'income', amountCents, category, date,
  projectId, recurrenceId, occurrenceKey,
  autoRecorded: true,
  incomeVerified: false,
  notes: 'Revenu inscrit automatiquement selon le calendrier NEXUS. Réception bancaire à vérifier.',
  createdAt, updatedAt
}
```

Le montant et la date restent modifiables manuellement dans le Journal. Les montants entrent dans les totaux de recettes **parce qu'ils sont enregistrés comme prévisions programmées**, mais la mention « non vérifié » est visible. **Ce total n'est pas un relevé bancaire.**

## Confirmer la réception réelle

Dans le **Journal**, une transaction automatique non vérifiée affiche un bandeau **« Revenu programmé automatiquement · réception non vérifiée »** et un bouton **« Confirmer reçu »**. L'échéancier affiche aussi **« Programmé · à vérifier »** avec le raccourci **« Reçu ✓ »**.

Confirmer modifie `incomeVerified:true` et `verifiedAt` sur la transaction **sans ajouter une deuxième somme**. Aucun appel au compte bancaire, aucune détection automatique de virement.

**Suppression :** si une transaction de revenu auto est déplacée à la corbeille, sa clé d'occurrence rejoint `rule.skips[]` afin qu'elle ne soit **pas recréée lors de l'ouverture suivante**. Restaurer la transaction enlève ce skip pour retrouver l'ancienne relation, sans nouvelle écriture.

## Fichiers modifiés

- `budget-v08.js` : calcul, opt-in, affichages, rattrapage, recette confirmée, garde anti-doublons.
- `budget-v020.js` : nouvelle section Revenus réguliers dans Engagements et commandes d'édition/création.
- `budget-v020.css` : champs et statuts compacts iPhone.
- `app.js` : vérification de sauvegarde et démarrage après chargement des données.
- `recycle.js` : skip sur suppression et réactivation sur restauration d'un revenu programmé.
- `index.html` / `sw.js` : cache et version **V0.21.2**.
- `tests/budget-auto-income.test.cjs` : tests de calendrier, permission, rattrapage, doublons, rollback et confirmation.
- `tests/contacts-budget.test.cjs` : version et intégrité du cache offline.

Pas de nouvel endpoint, Worker, abonnement payant, table D1 ou base IndexedDB. Les champs supplémentaires sont inclus automatiquement dans les sauvegardes NEXUS.

## Recette réelle sur iPhone

1. Ouvrir NEXUS **V0.21.2** → Budget → Engagements → Revenus réguliers.
2. Ajouter un salaire mensuel ou modifier un revenu existant. Définir montant, jour et catégorie.
3. Sans l'option automatique : vérifier que seul l'échéancier affiche le paiement prévu.
4. Cocher **Inscrire automatiquement**. Si une échéance tombe **aujourd'hui**, elle entre dans le Journal, sinon elle attend son jour. Les mois passés ne sont pas créés rétroactivement.
5. Fermer puis rouvrir NEXUS : **aucun doublon**.
6. Journal → repérer « réception non vérifiée », cliquer **Confirmer reçu** : le montant total ne bouge pas, seul le statut évolue.
7. Créer un autre revenu (prime hebdomadaire ou rente annuelle), vérifier le calendrier.
8. Mettre un revenu en pause puis le réactiver : les périodes en pause n'apparaissent pas soudainement.
9. Supprimer une recette automatique, fermer puis rouvrir NEXUS : la transaction ne revient pas. La restaurer depuis la Corbeille.
10. Si un ancien revenu a déjà été saisi à la main sans être lié à une récurrence, contrôler le doublon potentiel avant d'activer l'automatisation. Le moteur bloque les copies strictement identiques, mais ne peut pas reconnaître tous les équivalents.
11. Faire un export JSON avant une période de tests avec de vrais montants ; **ne pas publier le fichier de sauvegarde**.

## Limites importantes

- **Aucun traitement iOS en arrière-plan garanti PWA fermée.** Les revenus dont l'échéance est passée sont inscrits **au prochain lancement / retour au premier plan**.
- **Pas de contrôle bancaire** : l'écriture est un revenu prévu, même si elle compte dans le total du Journal. Confirmer les virements réels manuellement.
- Des revenus **variables** doivent être corrigés manuellement après inscription si le montant reçu diffère.
- L'anti-doublons repose sur les IDs liés ; des copies issues de sauvegardes divergentes sur plusieurs appareils exigent encore une stratégie de résolution des conflits cloud.
- Les données IndexedDB locales restent non chiffrées ; seules les sauvegardes du coffre sont chiffrées avant transfert.

## Décision produit

Conserver **Abonnements / Prêts** en validation de dépense manuelle. Seuls les **revenus réguliers** proposent l'automatisation opt-in. Une évolution générale d'automatisation des dépenses nécessitera un chantier et une autorisation distincts.
