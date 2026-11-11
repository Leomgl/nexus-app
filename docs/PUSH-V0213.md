# NEXUS V0.21.3 — FORGE #5 · Notifications contextuelles et échéances Budget

## Architecture / confidentialité

Le push iOS reste soumis au coffre, à la permission Web Push de la PWA installée et au cron Cloudflare existants. Les détails privés **ne sont pas envoyés à Cloudflare** : la requête de planification ne contient que `{id,kind,fireAt}`. Le serveur conserve son schéma D1 `push_jobs` existant. Le `kind` des alertes budgétaires est transmis comme `task` pour préserver la contrainte SQL existante, mais le type « Budget » est conservé **localement** dans le contexte d'affichage.

`push-context-v0213.js` produit les jobs et une table privée en IndexedDB (`nexus-v0-1`, store `data`, clé `nexus_push_context_v1`). Le tag du push, déjà envoyé par le serveur sous la forme `nexus-<16 caractères du job_id>`, sert de clé. Le Service Worker lit cette table *sur l'iPhone* et affiche une notification adaptée. Un push sans contexte disponible revient à la formulation générique. Pas de nouvelle API, migration D1, base, abonnement, permission inter-app ni secret.

Les détails personnels sont **désactivés par défaut** : un utilisateur peut autoriser leur affichage sur écran verrouillé dans Réglages → Notifications iPhone. Même dans ce cas, la localisation et les contacts ne quittent pas l'appareil via l'API de push. Attention : les applications de même origine `leomgl.github.io` partagent les risques du stockage local NEXUS ; ce changement ne résout pas ce risque existant.

## Contenu

- **Agenda** : RDV (ou Restaurant si l'intitulé correspond), heure, titre, lieu et contact/personne associés lorsque les détails sont autorisés. Les délais individuels `reminderMinutes` existants sont conservés ; `[]` continue à désactiver les alertes d'un RDV.
- **Rappels** : tâche, heure et indication « À faire ». Les tâches terminées sont exclues, les options globales existantes sont conservées.
- **Budget** : revenus, prêts, abonnements, factures et autres `recurrences[]`, y compris hebdomadaires et annuelles, au choix par règle **J-7 / J-2 / jour J**, à **09:00 heure locale**. Défaut pour les anciennes et nouvelles règles : **J-2 + jour J**. Tout décocher désactive la récurrence. Une option générale permet de désactiver les push budgétaires.
- Les règles en pause, échéances hors période, occurrences ignorées et mouvements déjà enregistrés sont exclus. Pour un revenu automatique inscrit **mais non vérifié**, le rappel est maintenu : NEXUS ne confirme jamais la réception bancaire tout seul. **Aucune dépense n'est automatiquement débitée ni marquée payée.**
- À la remise au premier plan et au retour réseau, ainsi qu'après les changements locaux, NEXUS régénère les notifications. La PWA fermée ne calcule pas de nouvelles échéances ; elle reçoit uniquement celles déjà transmises au serveur, jusqu'à 366 jours (600 jobs maximum).

## Données / compatibilité

Ajout additif de `recurrence.notifyDays: number[]` pour les règles éditées. Si la propriété est absente, le défaut `[2,0]` s'applique **sans migration ni mutation des anciennes règles**. Les notifications utilisent les mêmes identités de périodes que `NexusBudget.occurrences()`. Les clés de coffre, le format de sauvegarde, les transactions et les IDs existants ne changent pas. La table de contextes est effaçable : aucune donnée métier n'en dépend.

Les modifications restent locales avant envoi du programme au serveur. Après un changement effectué hors ligne, les anciennes notifications planifiées peuvent encore arriver jusqu'à la reconnexion, comme pour les anciennes notifications Agenda.

## Tests et recette

Tests automatisés ajoutés dans `tests/push-context-v0213.test.cjs` : dates J-2/J0, absence de données privées dans les jobs, consentement, pauses, échéances ignorées, revenus programmés non confirmés, dépenses déjà liées, rappels terminés et IDs stables. Le test `tests/contacts-budget.test.cjs` vérifie l'intégrité du cache PWA/version.

**Tests à effectuer sur iPhone :**

1. Mettre à jour sans supprimer l'icône ou la base locale. Confirmer « Version 0.21.3 ».
2. Réglages → Notifications iPhone : conserver l'abonnement existant, activer l'option Budget et, si souhaité, **Afficher les détails** (avertissement de confidentialité).
3. Créer un RDV « Restaurant » avec lieu/personne et un rappel avec heure ; tester l'affichage réel, puis désactiver les détails et vérifier le mode discret.
4. Créer une dépense/recette récurrente à échéance future ; vérifier J-2 / J0 à 09h, J-7 facultatif et « aucune notification » lorsqu'on décoche tout. Tester prêt, salaire, facture, pause, échéance ignorée, revenu confirmé.
5. Fermer NEXUS ; vérifier un push réel. Attention : le cron est exécuté toutes les cinq minutes, donc l'envoi n'est pas garanti à la seconde.
6. Vérifier qu'aucun mouvement n'est créé par une simple notification et qu'il n'y a pas de doublons ; vérifier les reçus au Journal.
7. Reconnecter après une modification hors ligne, contrôler la reprogrammation et l'absence de perte de contacts/Agenda/Budget.

Le test réel Safari/iOS, l'envoi Apple et l'état actuel du déploiement Cloudflare ne peuvent pas être déclarés validés par les tests de code seuls. Le backend Cloudflare **n'a pas besoin d'être modifié** pour ce chantier.

## Retour arrière

Restaurer les anciens fichiers frontend et le cache Service Worker à partir du commit précédent. Les nouveaux champs `notifyDays` sont ignorés par l'ancien code ; l'ancien planning reste compatible avec l'API existante. Ne pas désinstaller la PWA, car cela peut supprimer IndexedDB et la souscription push.
