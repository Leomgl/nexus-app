# Gaming — Spécification PWA indépendante, architecture V1

> **ÉTAT : CONCEPTION.** Aucune PWA Gaming ni synchronisation PSN n'a été créée. Nom de projet provisoire « Gaming ».

## Mission

Inventaire de jeux / stockage + suivi des saisons, nouveautés, DLC et événements. Gaming est **autonome et offline-first**. NEXUS centralise uniquement les achats, dépenses, rendez-vous, rappels et projets que l'utilisateur décide d'y créer.

## Navigation envisagée

1. **Accueil** : consoles et volumes de stockage, jeux actifs, pass qui expirent bientôt, événements/sorties à venir, dépenses prévues.
2. **Bibliothèque** : jeux installés / non installés / archivés / liste de souhaits ; filtres par console, support et genre.
3. **Calendrier Gaming** : saisons/pass, événements ingame, sorties de jeux, DLC et mises à jour majeures.
4. **Budget & extensions** : passes achetés/à venir, DLC, jeux souhaités, achats planifiés. Les opérations réelles sont gérées dans NEXUS après confirmation.
5. **Réglages & connexions** : espaces de stockage, données, notifications et permissions NEXUS.

## Modèles de données

### consoles[]
\`{id, name, platform:"PS5", capacityBytes?, storageLocations:[...]}\`

### storageLocations[]
\`{id, consoleId, type:"internal"|"m2"|"usb", label, capacityBytes?, usedBytes?}\`

Distinguer **stockage interne**, **SSD M.2** et **USB externe**. Sur PS5, les jeux PS5 peuvent être lancés depuis le SSD interne ou un SSD M.2 compatible, mais **pas directement depuis un disque USB externe** : ils doivent être retransférés. Les jeux PS4 compatibles peuvent être joués depuis USB. Voir https://www.playstation.com/fr-fr/support/hardware/ps5-manage-storage-space/.

### games[]
\`{id, title, platform:"PS5"|"PS4"|"PC"|..., acquisition:"digital"|"disc"|"subscription"|null, status:"installed"|"stored"|"not_installed"|"wishlist", storageLocationId?, sizeBytes?, installedAt?, lastPlayedAt?, coverUrl?, sourceUrl?}\`

Les espaces en octets non renseignés restent **inconnus** ; les soldes de stockage ne sont pas inventés.

**Important :** ne pas promettre de connaître automatiquement la liste des jeux installés sur la console PS5 via une API publique. La V1 utilise une saisie manuelle et des imports explicitement autorisés. Les éventuelles intégrations officielles seront évaluées séparément.

### gameItems[]
Un modèle commun typé pour :
- \`battle_pass\` : passe en cours, niveau de progression optionnel, \`startsAt\`, \`endsAt\`, \`priceEstimateCents\`, \`actualPriceCents\`, \`purchaseState\`.
- \`dlc\` : extension annoncée, date de sortie, prix prévu, achat effectué / non.
- \`release\` : nouveau jeu, date de sortie connue ou provisoire et lien d'origine.
- \`event\` : événement ingame, fuseau horaire, début/fin, coût éventuel.

Objet minimal : \`{id, gameId, kind, title, startAt?, endAt?, releaseDate?, dateConfidence:"confirmed"|"tentative"|"unknown", timezone:"Europe/Paris", sourceUrl?, priceEstimateCents?, actualPriceCents?, currency:"EUR", purchaseState:"none"|"planned"|"paid", autoRenew:false, reminderMinutes:[], projectId?, updatedAt, sourceRevision}\`.

**Une échéance incertaine reste marquée « à confirmer »** : une date inexistante ou approximative ne déclenche pas une notification définitive.

### plannedExpenses[]
\`{id, gameItemId?, gameId?, title, amountCents?, purchaseState:"planned"|"purchased"|"canceled", desiredDate?, priority?, targetProjectRef?}\`

Une dépense prévue est transmise vers **NEXUS Achats**, pas au Journal réel. Une dépense payée est seulement **proposée** au Journal réel, avec montant et date confirmés. Ne jamais répliquer une même dépense dans un modèle Gaming + un modèle NEXUS sans lien de provenance.

## Règles de connexion NEXUS

| Scénario | Événement Gaming | Proposition NEXUS | Confirmation |
|---|---|---|---|
| Jeu installé ou déplacé | \`game.storage.updated\` | Résumé facultatif | Aucune dépense |
| Jeu souhaité | \`game.wishlist.added\` | Achat planifié | Acceptation |
| Achat d'un pass | \`pass.purchased\` | Dépense réelle à confirmer | Montant / date |
| Fin d'un pass | \`pass.expires\` | Agenda + rappels | Date / délais |
| DLC à venir | \`dlc.announced\` | Achat + agenda | Prix et date |
| Sortie proche | \`game.release\` | Agenda + achat optionnel | Date source |
| Événement ingame | \`game.event\` | Agenda + rappels | Date / fuseau |
| Achat lié à un projet | \`spending.planned\` | Achat avec projet | Projet ciblé |

**Exemple demandé :** Delta Force, passe annoncé/acheté à 6,99 € (prix fourni comme exemple, non vérifié). Après validation de l'achat dans Gaming, NEXUS propose une dépense réelle de 6,99 €. La fin de saison, lorsqu'une date réelle est renseignée, propose un événement avec rappels personnalisés. La source et les IDs assurent l'anti-doublon. Il ne s'agit PAS d'une récurrence sauf renouvellement explicite.

## Notifications

- L'app Gaming peut utiliser son propre Worker et un abonnement Web Push iPhone dédié, pour des notifications strictement Gaming si l'utilisateur le souhaite.
- Si un événement est envoyé et accepté dans NEXUS, proposer de choisir **qui envoie le rappel** : Gaming ou NEXUS, **pas les deux par défaut**.
- Utiliser les \`reminderMinutes\` déjà pris en charge par NEXUS ; fuseau et heure explicites, différencier début / fin.
- Pas de notification pour un événement dont la date n'est pas confirmée.

## Écrans et ergonomie

- Carte console avec capacité / libre / occupé **saisi ou mesuré par l'utilisateur**, ventilée par stockage.
- Cartes jeux avec état et support, recherche, transfert déclaré manuel.
- Carte passe avec compte à rebours, progression, coût et rappels.
- Vue dépenses prévues / dépenses réalisées **liées** à NEXUS.
- Liste événements classés par prochaine échéance, filtres par jeu et type.
- Provenance/connexion visible : « Proposition en attente / Relié à NEXUS / Modifié à la source / Connexion révoquée ».

## Tech et coût

Même méthode éprouvée : dépôt GitHub indépendant → PWA HTTPS gratuite → stockage local / export → Worker Cloudflare uniquement pour notifications et interconnexion → D1 minimale si besoin. Pour une **séparation de sécurité** réelle, utiliser un domaine d'application distinct de NEXUS et RITUEL, au lieu d'une simple autre route sous \`leomgl.github.io\`.

Le mode hors ligne, la protection des données et l'absence d'abonnement Apple / de renouvellement de signature sont prioritaires.

## Évolutions futures, non garanties en V1

- Métadonnées de jeux depuis une source officielle / API disposant des droits nécessaires.
- Synchronisation PlayStation / Steam uniquement s'il existe un accès autorisé, stable et compatible ; **aucun accès PSN automatique promis**.
- Bibliothèque partagée avec des amis, export CSV, statistiques de jeu, gestion de backlog, widgets internes et projets communs.
- Affichage des dépenses futures Gaming dans un widget NEXUS distinct sans confondre prévision et opération réelle.

## Scénarios de validation avant lancement

1. Créer un jeu PS5 en stockage interne, puis le déplacer manuellement vers SSD M.2.
2. Saisir un jeu PS5 en USB et montrer « stocké mais non jouable directement », sans fausse promesse.
3. Enregistrer une fin de passe, la corriger, contrôler que **la même** proposition Agenda est mise à jour.
4. Déclarer un DLC futur, accepter son achat planifié dans NEXUS, puis déclarer son paiement réel.
5. Vérifier qu'une dépense réelle n'est jamais dupliquée après un événement rejoué ou une fermeture de PWA.
6. Révoquer la connexion : Gaming reste utilisable seul, NEXUS conserve ses données validées.
