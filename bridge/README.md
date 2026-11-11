# NEXUS LINK v1 — encrypted relay (bêta technique)

Worker `nexus-link-api` avec D1 `nexus-link-db` dans la juridiction UE.

**Statut : infrastructure isolée**, pas d'échange d'informations personnelles des apps activé. Les endpoints requièrent une connexion créée avec des vérificateurs de jetons dérivés localement. Le serveur ne reçoit ni clé de récupération, ni titres/valeurs des notes, ni prix : seulement des métadonnées de connexion et messages chiffrés AES-GCM.

Routes : `/api/health`, `/api/v1/link/pair`, `/api/v1/link/status`, `/api/v1/link/events`, `/api/v1/link/inbox`, `/api/v1/link/ack`, `/api/v1/link/revoke`.

**Sécurité** : scopes côté serveur, writer/reader jetons séparés, CORS origine stricte, limite de 10 pairages/jour/IP hachée avec pepper secret Worker, 250 éléments en attente/connexion, 30 jours de lecture, idempotence (source_key,revision), révocation avec purge. Ne pas placer `LINK_PEPPER` dans GitHub.

Le jumelage réel dans les PWAs nécessite le client WebCrypto et une interface de consentement. Jusqu'à validation iPhone, il n'y a aucune liaison utilisateur active.


## Hotfix 2026-11-11 — PAIR_ALREADY_EXISTS trompeur (V0.21)

**Cause vérifiée sur la D1 de production :** la migration initiale `bridge/migrations/0001_init.sql` définissait `CHECK(source_app IN ('gaming','rituel'))`. Le Worker connaissait `vestiaire`, mais l'insertion était refusée par SQLite. Le `catch` du Worker retournait **`PAIR_ALREADY_EXISTS` pour toutes les erreurs**, y compris cette contrainte.

**Correction déjà exécutée sur D1 de production via API Cloudflare** : `bridge/migrations/0002_vestiaire.sql`. Remplacement des tables `connections` **et** `encrypted_events` en préservant les foreign keys. Le nouveau CHECK autorise `gaming`, `rituel` et `vestiaire`.

- Contrôles réalisés immédiatement avant/après la migration : **3 connexions → 3**, **40 messages chiffrés → 40**, `PRAGMA foreign_key_check` → **0 erreur**.
- Code testé en SQLite local avec données simulées et relations `ON DELETE CASCADE` : tous les messages préservés.
- Une sauvegarde D1 « Time Travel » était disponible avant l'opération. **Ne pas restaurer sans décision explicite : un retour en arrière effacerait les éventuelles nouvelles écritures.**
- Le Worker `nexus-link-api` a été redéployé ensuite, en héritant strictement des bindings `DB` et `LINK_PEPPER`. Le message **`PAIR_ALREADY_EXISTS` n'est désormais renvoyé que pour une véritable collision d'identifiant** ; les autres erreurs d'insertion renvoient `PAIR_SAVE_FAILED` sans exposer les détails SQL.
- Tests : `tests/bridge-vestiaire-migration.test.cjs`.
- Aucune modification de la PWA nécessaire pour résoudre ce problème ; l'utilisateur peut relancer `Réglages → Créer la connexion Vestiaire`.
- **Attention aux migrations futures** : dans D1, `PRAGMA defer_foreign_keys` ne bloque **pas** `ON DELETE CASCADE`. Toujours migrer les tables enfants avec le parent, puis vérifier les comptes et les clés étrangères. Cette migration a été appliquée directement via API ; vérifier l'état réel avant toute réexécution avec Wrangler.
