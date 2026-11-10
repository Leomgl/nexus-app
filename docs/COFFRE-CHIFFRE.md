# NEXUS — Coffre chiffré V0.3

La V0.3 apporte **une sauvegarde cloud manuelle**, pas une synchronisation continue. Les données restent locales tant que l'utilisateur ne choisit pas explicitement de les envoyer.

## Modèle de sécurité
- À l'inscription, le téléphone génère une **clé aléatoire de 256 bits** qui sert aussi de clé de récupération (à garder confidentielle).
- WebCrypto HKDF-SHA256 en dérive **deux clés distinctes** : un jeton de connexion et une clé AES-GCM 256 bits.
- Le serveur stocke seulement SHA-256 du jeton et un **document JSON chiffré**. Il ne reçoit pas la clé AES ni les notes en clair.
- Chaque export utilise un nonce AES-GCM aléatoire de 96 bits.
- Pour créer un coffre, il faut un **code d'invitation à usage unique**. Le serveur conserve seulement son empreinte SHA-256.
- La restauration vérifie le chiffrement authentifié AES-GCM puis le format NEXUS et réclame une confirmation ; jamais d'effacement automatique.
- Les mises à jour exigent une version attendue avec comparaison atomique côté D1 (409 en cas de conflit).
- Pas de secrets dans GitHub ou dans le Worker source. CORS seul **n'est pas** une authentification.
- Le code de récupération permet également l'accès au coffre : toute personne le possédant peut y accéder. Il est **impossible de récupérer les données cloud si cette clé est perdue** et que plus aucun appareil n'est connecté. Il faudra ajouter une rotation/révocation et la prise en charge des passkeys avant généralisation.
- IndexedDB conserve les données **en clair sur l'appareil** comme en V0.2. Les clés enregistrées dans IndexedDB dépendent de la sécurité du téléphone et de l'absence d'attaques XSS. Ne pas prétendre à un chiffrement local.
- La V0.3 ne chiffre pas de bout en bout les métadonnées de transport (date de dernière sauvegarde et taille du document).

## API
- `GET /api/health`, `GET /api/config` : publics, uniquement techniques.
- `POST /api/v1/register` : corps `{invite,verifier}`, code d'invitation fourni séparément et à usage unique.
- `GET /api/v1/snapshot` : `Authorization: Bearer <jeton>`.
- `PUT /api/v1/snapshot` : `{expectedVersion,payload:{alg,iv,ciphertext}}` ; contrôle de version.
- Pas d'API acceptant les notes en clair et aucune clé de chiffrement sur le serveur.

## Limites et prochaines étapes
- Le premier appareil doit faire une sauvegarde cloud manuellement.
- Le deuxième appareil doit se connecter avec la **même clé de récupération** et demander explicitement la restauration.
- Aucun écrasement automatique ou synchronisation bidirectionnelle en arrière-plan.
- Une clé de récupération compromise doit être considérée comme une compromission du coffre. **La rotation de clé est un chantier suivant.**
- Avant une future connexion Face ID/passkey : vérifier WebAuthn côté serveur avec bibliothèque auditée, challenge à usage unique, RP ID `leomgl.github.io`, origine `https://leomgl.github.io`. Ne jamais faire confiance à une prétendue vérification biométrique envoyée par le client.
- GitHub Pages héberge l'interface, Worker Cloudflare `nexus-app-api` et D1 `nexus-app-db` hébergent les données chiffrées.

## Vérification technique (10 novembre 2026)
- La migration V2 est appliquée sur D1 en juridiction UE.
- Les tests du handler avec une vraie D1 via le connecteur ont validé : inscription (201), lecture (200), envoi (200), conflit de version (409), refus d'un mauvais jeton (401).
- Le coffre de test a été nettoyé. Il reste un seul code d'invitation non utilisé, réservé à l'installation personnelle.
- Le Worker a été uploadé sur Cloudflare et GitHub Pages sert le code client V0.3. Le parcours complet chiffré sur iPhone n'est **pas encore vérifié en situation réelle**.
- **Limitation importante** : tous les chemins `https://leomgl.github.io/...` partagent la même origine web et l'accès à IndexedDB. Ce coffre n'est pas encore adapté aux données sensibles tant qu'une origine dédiée et un modèle de révocation ne sont pas en place.
