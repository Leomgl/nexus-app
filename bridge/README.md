# NEXUS LINK v1 — encrypted relay (bêta technique)

Worker `nexus-link-api` avec D1 `nexus-link-db` dans la juridiction UE.

**Statut : infrastructure isolée**, pas d'échange d'informations personnelles des apps activé. Les endpoints requièrent une connexion créée avec des vérificateurs de jetons dérivés localement. Le serveur ne reçoit ni clé de récupération, ni titres/valeurs des notes, ni prix : seulement des métadonnées de connexion et messages chiffrés AES-GCM.

Routes : `/api/health`, `/api/v1/link/pair`, `/api/v1/link/status`, `/api/v1/link/events`, `/api/v1/link/inbox`, `/api/v1/link/ack`, `/api/v1/link/revoke`.

**Sécurité** : scopes côté serveur, writer/reader jetons séparés, CORS origine stricte, limite de 10 pairages/jour/IP hachée avec pepper secret Worker, 250 éléments en attente/connexion, 30 jours de lecture, idempotence (source_key,revision), révocation avec purge. Ne pas placer `LINK_PEPPER` dans GitHub.

Le jumelage réel dans les PWAs nécessite le client WebCrypto et une interface de consentement. Jusqu'à validation iPhone, il n'y a aucune liaison utilisateur active.
