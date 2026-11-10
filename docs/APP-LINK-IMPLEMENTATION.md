# NEXUS LINK — implémentation et protocole de test V0.13

## Statut opérationnel
- NEXUS PWA : générateur de jumelage et boîte de réception de test en interface.
- Gaming PWA : import d'invitation et envoi de message de test (pas de données métier).
- RITUEL : `link-core.js` ajouté en source, **inactif** ; aucune routine transmise.
- Relais : Worker `nexus-link-api`, D1 `nexus-link-db` sous juridiction **EU**, secret Worker `LINK_PEPPER` jamais commité.
- Références : `bridge/worker.js`, `bridge/migrations/0001_init.sql`, `link-core.js`, `connections.js`.

## Protocole concret
1. NEXUS génère un identifiant UUID et un secret aléatoire 256 bits. WebCrypto HKDF SHA-256 dérive une clé AES-GCM et deux jetons de 256 bits (lecture et écriture), **avec des étiquettes différentes**.
2. Le serveur reçoit seulement `id`, `sourceApp`, scopes, **SHA256 des jetons**. Jamais la graine du secret, ni la clé de récupération du coffre.
3. NEXUS affiche un code `NXL1.` + JSON encodé base64url qui comprend le secret de jumelage. Il ne doit pas être envoyé dans un chat et n'est pas transmis dans les URL ou paramètres réseau.
4. Gaming reçoit ce code manuellement, vérifie la connexion avec son jeton d'écriture, puis peut publier un événement **`test.ping`**.
5. Le message est chiffré côté Gaming avec AES-GCM et IV aléatoire 96 bits ; l'AAD lie ID, clé opaque de source, révision, scope et version du protocole. Le serveur conserve uniquement métadonnées et texte chiffré.
6. NEXUS récupère puis déchiffre localement, et peut accuser réception. Les doublons `(connection_id,source_key,revision)` sont ignorés.
7. Révoquer NEXUS LINK depuis NEXUS marque la connexion inactive et détruit ses messages encore stockés dans le relais.

## Permissions / limites
Les scopes ont été sélectionnés dans NEXUS *avant* le jumelage et sont vérifiés par le serveur. Un nouveau choix de permissions demande **révocation puis nouveau jumelage**.

Le relais accepte seulement les origines HTTPS prévues et une authentification séparée lecture / écriture. Limitation de 10 créations par jour et par IP hachée avec un secret propre au Worker, et 250 messages non lus maximum par connexion. Les messages sont consultables jusqu'à 30 jours : **la purge physique automatique des messages expirés n'est pas encore implémentée**, sauf à la révocation. Aucun contenu des messages n'est en clair côté Cloudflare.

Les copies d'export JSON Gaming et NEXUS peuvent contenir les secrets de connexion localement : à protéger comme des données personnelles, sans les partager.

## Test iPhone
- Dans NEXUS installé depuis l'écran d'accueil : Réglages → Applications & connexions → Gaming → Configurer → cocher au moins un flux → Terminer → Jumeler.
- Copier le code `NXL1...` localement (pas dans le chat).
- Dans Gaming installé depuis son domaine workers.dev : Réglages → NEXUS LINK → Jumeler → coller le code et confirmer.
- Toucher « Envoyer un test » dans Gaming.
- Dans NEXUS → Applications & connexions → Messages : voir « Test de connexion reçu », le marquer comme lu.
- Depuis NEXUS, tester la révocation ; le bouton « Vérifier » côté Gaming doit alors signaler l'expiration.
- Ne pas désinstaller une PWA pour actualiser les fichiers : fermer/réouvrir et actualiser si nécessaire.

## Vérifications automatisées réalisées
- Tests WebCrypto synthétiques : code de jumelage, token dérivé, aucun secret envoyé au relais, chiffrement, déchiffrement, isolation des scopes.
- 15 tests de relais + D1 avec connexion de test nettoyée : santé, CORS, création, statut autorisé, mauvais jeton 401, scope interdit 403, publication 201, idempotence 200, réception, ACK, révocation, refus d'accès après révocation.
- Le parcours *en conditions réelles Safari iOS* reste à confirmer. Ne pas annoncer les échanges de budget, calendrier, achats et RITUEL comme actifs.

## Coût / infra
Quatre Workers : `nexus-app-api`, `rituel-app`, `gaming-app` et `nexus-link-api`. Trois D1 : coffre NEXUS, push RITUEL et LINK. Le tout sur les limites gratuites Cloudflare, avec surveillance à maintenir.

## CI/CD Gaming
Gaming appartient au dépôt `Leomgl/gaming-app` et Cloudflare Builds est configuré. Les builds manuels lancés depuis la configuration GitHub ont réussi. **Un déclenchement automatique sur un push GitHub n'a pas encore été observé** ; vérifier que l'installation GitHub « Cloudflare Workers and Pages » autorise bien le nouveau dépôt. Dans ce cas, ouvrir GitHub → Settings → Applications → Installed GitHub Apps → Cloudflare Workers and Pages → Configure → Repository access → ajouter `gaming-app`.
