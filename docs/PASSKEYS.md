# NEXUS V0.5 bêta — Passkeys / Face ID

## Objet

NEXUS propose une **protection de confort de l'interface** : lorsque l'utilisateur active l'option, la PWA demande une vérification WebAuthn (Face ID, Touch ID ou code d'appareil selon iOS) à chaque lancement. Un Worker Cloudflare vérifie la signature contre la clé publique précédemment enregistrée.

Cette protection n'est **pas un chiffrement IndexedDB**, et ne remplace pas la clé de récupération (qui déchiffre les sauvegardes cloud). Le bearer de récupération reste nécessaire au Worker et se trouve dans le stockage local. Une faille de script sur la même origine pourrait contourner la protection visuelle.

## Flux WebAuthn

**Inscription :** utilisateur déjà connecté au coffre → `POST /api/v1/passkey/options` avec `kind: register` → défi CSPRNG 32 octets, limité à 180 s et lié au coffre → `navigator.credentials.create` ES256 avec `rp.id='leomgl.github.io'` et `userVerification=required` → `POST /api/v1/passkey/register`.

Le serveur vérifie l'origine exacte `https://leomgl.github.io`, le type `webauthn.create`, le défi, l'empreinte du RP ID, les indicateurs UP/UV et AT, le Credential ID dans les données de l'authentificateur, et la validité de la clé SPKI P-256 avant stockage. La création de passkey est autorisée seulement avec la clé de récupération déjà valide.

**Déverrouillage :** `POST /api/v1/passkey/options` avec `kind: verify` → `navigator.credentials.get` avec `userVerification=required` → `POST /api/v1/passkey/verify` avec `clientDataJSON`, authenticatorData et signature.

Le serveur vérifie challenge et origine, UP/UV, RP ID hash, signature ECDSA ES256 sur `authenticatorData || SHA256(clientDataJSON)`, et compteur si disponible. Le défi est à usage unique, chaque assertion est contrôlée avant de déverrouiller l'interface.

## Sécurité et limites

- Les clés privées des passkeys restent dans l'authentificateur Apple/iCloud, seule la clé publique SPKI est enregistrée en base D1.
- Le coffre existant n'est ni déplacé ni déchiffré par la passkey.
- Le verrou iPhone reste **facultatif** et nécessite Internet pour la vérification côté Cloudflare. La clé de récupération fournit un accès de secours local.
- Les appareils avec passkeys synchronisées peuvent présenter un compteur de signatures toujours à zéro : le compteur n'est pas utilisé comme une protection parfaite contre le clonage.
- Le backend n'authentifie **pas encore** un nouvel appareil seulement avec la passkey : la clé de récupération reste nécessaire. Le verrou ne doit pas être présenté comme une authentification forte indépendante.
- L'application partage l'origine `leomgl.github.io` avec les autres dépôts GitHub Pages : un domaine séparé ou une autre origine dédiée reste recommandé avant des données sensibles.
- Aucun identifiant, mot de passe ou clé privée WebAuthn n'est exposé dans GitHub.

## Test conseillé sur iPhone (sans Mac)

1. Après ouverture/mise à jour de NEXUS, vérifier que **Réglages → Face ID / Passkey** apparaît.
2. Activer une passkey. Confirmer la demande iOS.
3. Un écran de verrouillage NEXUS doit s'afficher.
4. Déverrouiller avec Face ID ou le code iOS.
5. Fermer puis rouvrir NEXUS : la vérification doit être redemandée.
6. En cas de problème, utiliser le champ **Clé de récupération**. Ne jamais publier ni envoyer cette clé à un tiers.

**Statut :** API Cloudflare déployée ; migration D1 V4 appliquée ; tests cryptographiques en environnement contrôlé validés ; inscription et déverrouillage sur le véritable iPhone à vérifier.
