# NEXUS App Link — Architecture proposée, contrat V1 (10/11/2026)

> **ÉTAT ACTUEL : DESIGN + PRÉFÉRENCES LOCALES.** La passerelle, le jumelage, le chiffrement de messages et l'échange de données réelles ne sont PAS déployés.

## Objectif

Trois applications **autonomes** :

- **NEXUS** : informations consolidées, rendez-vous, rappels, achats, projets, budget, validation utilisateur. Source d'autorité sur ce qu'il enregistre dans ses propres blocs.
- **RITUEL** : routines, suivi, stock, produits, dates de rupture estimées. Source d'autorité pour le stock et les routines.
- **Gaming** : matériel/stockages/jeux installés, passes actifs, DLC et nouveautés, événements vidéoludiques, dépenses planifiées. Source d'autorité pour la bibliothèque de jeux et leurs événements.

Chaque PWA doit continuer à fonctionner **sans réseau** et **sans NEXUS**. Les liens sont une option.

## Architecture cible

\`\`\`text
 RITUEL PWA -- RITUEL Worker ---\
                                 \
                                  > [NEXUS LINK relay Worker] -- D1 queue de messages chiffrés
                                 /                  |
 Gaming PWA -- Gaming Worker --/                   | messages non lisibles par le serveur
                                                    v
                                    NEXUS PWA: Boîte de réception
                                     |      |        |
                                     v      v        v
                                    Achats Agenda  Budget / Rappels / Projets
\`\`\`

- Hébergement PWA : GitHub pour le code source et un domaine HTTPS distinct par application (Cloudflare Workers Static Assets possible gratuitement dans les limites du plan).
- Workers : RITUEL et NEXUS existent ; Gaming disposera de son propre Worker seulement si nécessaire. Un **Worker LINK** isole l'autorisation, la file d'attente et le jumelage. Les *Service Bindings* permettent de connecter des Workers du même compte sans URL publique entre eux ; le Worker de liaison conserve un endpoint public limité aux appariements/clients.
- D1 : une petite base de métadonnées des jumelages et de file **chiffrée**, pas un duplicata des bases de chaque app. Pas de KV ou de service supplémentaire au départ.
- Web Push : NEXUS produit ses propres rappels seulement à partir d'éléments réellement acceptés ; éviter d'envoyer des notifications en double lorsque RITUEL conserve son rappel original.

## Avertissement sécurité critique

\`https://leomgl.github.io/nexus-app/\` et \`https://leomgl.github.io/rituel-app/\` **partagent la même origine** (schéma, hôte, port), malgré deux chemins distincts. Dans un contexte navigateur standard, le chemin ne garantit ni isolation \`localStorage\` ni isolation IndexedDB. L'isolation effective d'une PWA installée varie selon son contexte d'exécution ; elle ne doit pas être tenue pour une garantie de sécurité.

Pour la connexion chiffrée, il faut des **origines web distinctes** (domaines / sous-domaines propres à chaque app) et un audit stockage. Ne PAS changer l'adresse des deux PWAs existantes sans procédure de sauvegarde/restauration et tests de Web Push : le stockage local de l'ancienne origine ne sera pas transféré tout seul.

Ne jamais lire les clés \`rituel_personal_v1\` ou \`nexus-v0-1\` d'une autre application directement comme mécanisme d'intégration.

## Permissions proposées

**RITUEL → NEXUS** :

| Flux | Cible NEXUS | Règle |
|---|---|---|
| Stock faible | Achat proposé | Validation humaine ; lien vers produit/source |
| Rupture estimée | Rappel proposé | Délai calculé dans RITUEL ; l'estimation peut changer |
| Achat de produit | Dépense proposée | Confirmation du montant et de la date ; jamais sans validation |
| Planning routine | Agenda (optionnel) | Ne pas dupliquer les notifications de RITUEL |
| Synthèse routines | Widget (optionnel) | Un indicateur agrégé, pas les données intimes |

**Gaming → NEXUS** :

| Flux | Cible NEXUS | Règle |
|---|---|---|
| Bibliothèque installée | Widget résumé (optionnel) | Pas de création automatique de tâches |
| Achat futur | Achat / Projet associé | Prix estimé ≠ dépense réelle |
| Pass actif (fin) | Agenda + rappels | Date de fin confirmée ou « à vérifier » |
| Pass acheté | Dépense proposée | Prix réellement payé et devise demandés |
| DLC annoncé | Agenda + achat proposé | Date et prix facultatifs + source |
| Sortie de jeu | Agenda + achat proposé | Dates provisoires marquées comme telles |
| Événement ingame | Agenda / rappel | Fuseau horaire, éventuel budget à prévoir |

**Par défaut : toutes les permissions DÉSACTIVÉES.** Écran dans NEXUS V0.12 = choix locaux préparatoires uniquement. La vraie connexion nécessitera appariement, approbation NEXUS, consentement et révocation indépendants pour chaque source.

## Jumelage et authentification — non implémenté

1. Depuis NEXUS, générer une invitation éphémère avec un secret de 256 bits ; durée 5 minutes, usage unique et limitation des tentatives. Montrer un QR/lien dont le secret se trouve uniquement dans le fragment local d'URL, pas dans une requête serveur ni des logs.
2. Ouvrir RITUEL ou Gaming, vérifier le nom de la source et confirmer explicitement les permissions demandées.
3. Revenir à NEXUS et confirmer une seconde fois. Le Worker LINK émet un jeton **propre à la connexion**, révocable, de durée / renouvellement gérés ; il n'apprend **jamais** le jeton coffre NEXUS, sa clé de récupération ou les secrets push d'une autre app.
4. Chaque connexion possède \`source_app\`, \`connection_id\`, scopes, \`created_at\`, \`revoked_at\`, statut, compteurs de révisions et last-seen. Jetons stockés hachés côté serveur, jamais dans le dépôt GitHub.
5. Les appels API vérifient la connexion **et** les scopes ; CORS est strict, mais CORS **n'est jamais** une preuve d'identité.

**Précondition** : définir une méthode cryptographique auditée et compatible Safari iPhone avant de réaliser l'échange de clés. Schéma visé : clé publique NEXUS propre au destinataire, ECDH P-256 éphémère par message, HKDF SHA-256, AES-GCM avec nonce unique et métadonnées authentifiées. La clé privée est conservée chiffrée localement, protégée par un secret non partagé. Un schéma inventé et non testé ne doit pas être déployé sur le coffre réel.

## Messages et protection des informations

Le Worker LINK doit voir uniquement : l'ID de liaison, l'origine logique, un ID d'événement opaque, une révision, un horodatage/expiration et une charge **chiffrée**.

Exemples de **contenu à chiffrer** (jamais en clair sur le relais) :
- \`{kind:"purchase.propose", product:{...}, estimatedPriceCents:2400, currency:"EUR"}\`
- \`{kind:"calendar.propose", title:"Fin du pass", localDate:"2026-11-30", sourceUrl:"..."}\`
- \`{kind:"budget.propose", type:"expense", amountCents:699, currency:"EUR", purchaseState:"paid"}\`

NEXUS déchiffre **sur l'appareil**, vérifie la connexion, le type, la date, le budget, et place une **proposition** dans « À valider ». Aucune opération bancaire ni facturation externe n'est exécutée.

### Anti-doublons

Une relation NEXUS ↔ source doit tenir un identifiant logique stable \`(source_app, source_entity_id, proposal_kind, occurrence_key)\`, plus \`source_revision\`. Le relais stocke une clé opaque dérivée de ce tuple, pas les titres.

- Même identifiant et même révision reçus deux fois : **ignorer**.
- Révision supérieure : **mettre à jour la proposition** ; si l'utilisateur a déjà confirmé un élément, demander s'il veut réviser ce lien.
- Événement annulé : marquer « Source annulée » et proposer un traitement manuel. **Ne jamais supprimer** automatiquement une dépense réelle ni un élément qu'on a modifié dans NEXUS.
- Réponse de NEXUS à la source : accusé d'acceptation ou refus et ID de relation opaque ; ne jamais renvoyer l'ensemble du budget ou du coffre.
- Une récurrence financière n'est créée que pour un vrai renouvellement régulier explicitement défini ; une saison / pass acheté une fois n'est **pas** une récurrence.

La corbeille NEXUS V0.10 continue de gouverner toute suppression dans les modules NEXUS. Supprimer un jeu ou DLC côté Gaming ne purge aucune écriture historique côté Budget.

## Modèle de stockage proposé (futur D1)

\`connections(id,recipient_hash,source_app,source_token_hash,scopes_json,recipient_key_id,created_at,revoked_at)\`

\`pairing_sessions(id,code_hash,source_app,created_at,expires_at,consumed_at,attempts)\`

\`encrypted_inbox(id,connection_id,source_event_hash,revision,action,iv,ciphertext,encrypted_key_metadata,created_at,expires_at,ack_state)\`

Contrainte d'unicité recommandée : \`(connection_id,source_event_hash,revision)\`. Expiration / purge des propositions non consommées avec une politique clairement affichée (par exemple 30 jours, **à confirmer**). Les écritures acceptées restent ensuite dans le coffre NEXUS et non dans la file d'attente.

## API envisagée (aucun endpoint créé)

- \`POST /link/v1/pair/start\` : inviter, authentifié côté NEXUS.
- \`POST /link/v1/pair/complete\` : associer l'app source après double confirmation.
- \`GET /link/v1/connections\` et \`PATCH /link/v1/connections/:id/scopes\`.
- \`POST /link/v1/events\` : publier un message chiffré et authentifié.
- \`GET /link/v1/inbox\` : récupérer un lot de messages chiffrés.
- \`POST /link/v1/inbox/:id/ack\` : accusé de réception/idempotence.
- \`DELETE /link/v1/connections/:id\` : révocation immédiate.

Prévoir limites par connexion, audit des événements techniques sans données privées, protection anti-rejeu, versionnement du protocole et tests de collision/idempotence.

## Plan de livraison, sans engagement de dépense

**Étape A (effectuée)** : analyse des deux apps, registre des permissions souhaitées en local dans NEXUS, contrat documentaire.

**Étape B** : origin-isolation planifiée, export/restauration vérifiés, prototype de jumelage et chiffrement avec deux comptes de test synthétiques. Pas de clés / données réelles.

**Étape C** : Worker LINK + D1 dédié, scopes, boîte de réception, tests d'autorisation négatifs, prévention des doublons, révocation. Ne pas déployer une interface « Connecté » avant tests end-to-end.

**Étape D** : intégration RITUEL stock → proposition d'achat, puis Gaming événements/pass → agenda/achats/budget. Validation en iPhone réel.

**Étape E** : console globale des intégrations, provenance, journal de synchronisation et permissions, déconnexion et suppression des messages en attente.

Règle budgétaire : respecter les quotas gratuits actuels de Workers / D1 ; mesurer le trafic. Aucun plan payant activé automatiquement.

## Sources de référence

- https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developer.mozilla.org/fr/docs/Web/Security/Defenses/Same-origin_policy
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
