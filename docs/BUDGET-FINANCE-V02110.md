# NEXUS V0.21.10 — Remboursements anticipés et revenus variables

> Code livré le 12 novembre 2026 ; version effectivement installée sur iPhone à contrôler. Source de vérité : branche main et tests du dépôt NEXUS.

## Objectifs

- Ajouter un remboursement anticipé réellement payé à un prêt, calculer l'effet sur les mensualités ou sur la date de fin, et permettre une correction manuelle d'après l'échéancier bancaire.
- Mettre en pause puis reprendre le salaire récurrent, sans supprimer l'historique.
- Suivre des rentrées variables effectivement reçues (CPAM, complément employeur et autres), distinctes du salaire fixe et sans récurrence artificielle.

## Remboursements anticipés

- Les prêts restent dans `data.recurrences[]` avec `commitmentKind:'loan'`. Le tableau additif `loanScheduleRevisions[]` décrit chaque modification du calendrier : id, transactionId, date, effectiveMonth, extraCents, principalBeforeCents, principalAfterCents, aprPercent, mode, months, monthlyCents, lastCents, endDate.
- L'enregistrement d'un remboursement anticipé confirme une transaction **expense** unique dans `data.transactions[]`, identifiée par `loanExtraPaymentFor` et `loanAdjustmentId`. Elle est distincte de la mensualité habituelle et n'a pas de `occurrenceKey` mensuelle.
- L'utilisateur fournit le **capital exact restant dû avant le remboursement** et le **taux nominal annuel** (0 % si simulation sans intérêt). Nexus ne déduit jamais le capital du seul cumul des mensualités déclarées.
- Deux simulations : conserver le montant mensuel et raccourcir le prêt (`reduce-term`) ; conserver le nombre d'échéances et réduire le montant mensuel (`reduce-payment`). Calcul de mensualités à partir d'intérêts mensuels nominaux, avec arrondi au centime et dernière échéance d'un montant éventuellement différent.
- L'échéancier ajusté commence le mois suivant le paiement. Il modifie la date de fin théorique du prêt et les prévisions, mais **jamais** une transaction déjà confirmée. Une tentative de recalcul qui chevauche des échéances futures déjà validées est refusée.
- L'éditeur **Ajuster** permet de remplacer le montant, la durée et la dernière échéance par ceux communiqués par la banque, sans créer de transaction supplémentaire.
- `budget-v08.js` produit un `occurrence.amountCents` pour chaque échéance. Journal, projections et notifications locales réutilisent ce montant. Le compteur « Confirmées » d'un prêt restructuré se rapporte au **nouvel échéancier**, sans effacer les anciens mouvements.
- Enregistrement vérifié par relecture IndexedDB ou localStorage de secours ; tentative de rollback si la sauvegarde n'est pas confirmée.

**IMPORTANT :** outil de simulation, **pas** décompte contractuel. Assurance, frais, indemnités de remboursement anticipé et règles spécifiques au contrat ne sont pas pris en compte. La banque doit fournir le capital réel, le taux et l'échéancier mis à jour.

## Revenus

- Les règles `income` existantes ont un bouton **Pause / Reprendre**. Quand `active:false`, elles ne participent ni aux prévisions futures, ni aux notifications, ni aux écritures automatiques. Les opérations passées ne changent pas.
- Reprendre un revenu `autoBook:true` décale `autoBookFrom` à la date du jour ; pas de rattrapage des périodes suspendues. Une recette déjà automatiquement inscrite au Journal, même non vérifiée, n'est pas effacée rétroactivement.
- **Versement variable** crée une transaction manuelle `type:'income'` à la date effectivement reçue, `incomeSource:'cpam'|'employer'|'other'`. Catégorie Indemnités ou Salaire, note facultative. Aucun versement CPAM n'est estimé ou automatisé.
- Doublon exact (titre, date, montant) refusé pour éviter un double comptage. Deux versements identiques légitimes devront être saisis avec des libellés distincts depuis le Journal.

## Fichiers et déploiement

- Nouveau : `budget-finance-v02110.js` ; tests : `tests/budget-finance-v02110.test.cjs`.
- Modifiés : `budget-v08.js`, `budget-v020.js`, `budget-v020.css`, `push-context-v0213.js`, `app.js`, `index.html`, `sw.js` et assertions de version des tests.
- Version visible **0.21.10** ; cache iOS `nexus-v0.21.10.0`.
- Aucune nouvelle table IndexedDB, aucun changement Cloudflare Worker/D1, aucune donnée utilisateur réelle committée.

## Recette physique iPhone restante

1. Sauvegarder NEXUS avant la première vraie saisie financière et vérifier que la PWA affiche **0.21.10**.
2. Prêts → **Remboursement anticipé** ; essayer un calcul fictif sans confirmer de virement inexistant.
3. Pour un versement réellement effectué, confirmer : une seule transaction au Journal, montant pris en compte dans les dépenses, échéances futures uniquement recalculées.
4. Vérifier fin anticipée et dernière mensualité ; essayer la correction d'après les documents du prêteur.
5. Tester les prévisions et les notifications, fermer et relancer la PWA, vérifier persistance et hors-ligne.
6. Mettre le salaire en pause, vérifier qu'aucune nouvelle échéance/revenu n'est générée ; ne pas supprimer l'historique.
7. Ajouter des versements réellement reçus CPAM/employeur ; chaque montant apparaît une seule fois au Journal.
8. Reprendre le salaire et vérifier qu'aucun mois suspendu n'est rattrapé automatiquement.

GitHub Actions (tests Node et déploiement Pages) vérifiés ; **aucune validation physique Safari iPhone effectuée par l'assistant**.
