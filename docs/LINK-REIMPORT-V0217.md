# NEXUS V0.21.7 — Réimportation d’une dépense Gaming supprimée

## Contexte
Une proposition Gaming déjà acceptée peut référencer une transaction déplacée vers la corbeille, notamment après « Réinitialiser le Budget ». Les données NEXUS LINK (linkInbox) continuent d'exister pour préserver l'historique, mais l'ancien formulaire bloquait une nouvelle confirmation.

## Correctif
- LINK → Gaming → **Voir / réexaminer** affiche « Dépense supprimée » lorsque la transaction liée n'existe plus.
- La fiche indique explicitement que la dépense précédente a été supprimée et offre **Réimporter dans le Budget**.
- Il s'agit d'une action **manuelle et explicite**, jamais d'un traitement automatique au rechargement de NEXUS ou d'un message qui revient de Gaming.
- L'import recrée **une seule** transaction avec son ID neuf, sa provenance Gaming (sourceId, sourceKey, pairId, revision), sa date et son montant approuvés. Le nouvel identifiant est enregistré sur la proposition existante.
- Si une transaction active porte déjà la même provenance, la proposition retrouve cette transaction et la met à jour au lieu d'en fabriquer une nouvelle, y compris pour une seconde proposition historique acceptée.
- Aucune suppression ou modification automatique des anciennes entrées de corbeille.
- Sur restauration d'une transaction supprimée, qu'elle soit isolée ou dans un reset Budget groupé, une détection d'identité Gaming/Rituel bloque la restauration entière **sans mutation**, si un équivalent existe déjà dans le Budget. Pour restaurer l'ancienne, supprimer d'abord la version recréée.
- Après persistence, le formulaire vérifie à la fois l'inbox et, pour une transaction, l'écriture durable du Journal (ID + type + montant + association à la proposition). En cas de vérification échouée, rollback en mémoire et tentative de restauration du snapshot durable.
- Les autres destinations LINK (agenda, tâches, notes, achats) conservent leur comportement de restauration habituel.

## Tests
Tests ajoutés : \`tests/link-reimport-v0217.test.cjs\` : réimport transaction supprimée, double validation, deuxième proposition de même origine, conflit de restauration isolée, conflit de restauration après reset de module, rollback d'écriture et de vérification du Journal.

## Architecture
- \`link-import.js\` : réimport explicite, déduplication sur provenance, statut du panneau et vérification de sauvegarde.
- \`recycle.js\` : garde à la restauration des achats LINK payés réimportés.
- \`app.js\` : passage de \`verifyLinkedBudgetRecord\` à l'adaptateur Gaming, version \`0.21.7\`.
- \`index.html\` et \`sw.js\` : nouveaux scripts versionnés et cache offline \`nexus-v0.21.7.0\`.
- \`tests/contacts-budget.test.cjs\` et \`tests/settings-v0214.test.cjs\` : assertions de version et cache.

## Recette iPhone
1. Ouvrir NEXUS 0.21.7 sur l'écran d'accueil et vérifier la version dans Réglages.
2. Aller dans LINK → Gaming → Voir / réexaminer un pass de combat dont le budget a été nettoyé.
3. Vérifier le bouton « Réimporter dans le Budget », le montant et la date, puis confirmer.
4. Vérifier l'apparition d'une unique dépense dans Budget → Journal, avec la date initiale.
5. Réexaminer la même proposition une seconde fois : mise à jour de l'existant, jamais doublon.
6. Ouvrir Corbeille → restaurer l'ancienne dépense : l'application refuse toute restauration qui ajouterait une deuxième écriture pour le même achat.
7. Les propositions Gaming non supprimées continuent de mettre à jour leurs éléments d'origine.
8. Tester une restauration d'un reset Budget groupé avec une transaction réimportée, puis une restauration ordinaire sans conflit.
9. Vérifier en ligne, puis hors ligne après chargement du Service Worker.

Aucune opération bancaire réelle ni demande de ré-envoi Gaming n'est déclenchée.
