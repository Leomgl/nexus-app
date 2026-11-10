# NEXUS — second cerveau PWA (V0.3, coffre chiffré manuel)

Application personnelle **100 % gratuite**, installable sur iPhone comme une PWA. Développée en HTML, CSS et JavaScript avec IndexedDB (local-first). Cette version est **un prototype de test**, pas encore un service synchronisé.

## Fonctionnalités testables

- **Accueil** : capture rapide, prochains rendez-vous, tâches, dépenses du mois, projets et achats.
- **Notes** : rédaction, suggestions locales de rendez-vous/rappels/achats, confirmation manuelle et liens vers les éléments créés.
- **Calendrier** : vue mensuelle, rendez-vous, lien vers une personne et export `.ics`.
- **Rappels** : échéances, actions cochables, rattachement à une note, à une personne ou à un projet.
- **Personnes** : mini-répertoire avec `tel:` et `mailto:`.
- **Projets** : état, description, échéance, budget estimé, tâches liées (progression), notes, achats, dépenses.
- **Achats** : wishlist avec priorité, prix estimé, projet, note d'origine, états « à acheter / acheté / abandonné ». Un achat marqué comme effectué peut être transformé en dépense via confirmation.
- **Budget** : revenus et dépenses manuels, catégories, navigation par mois, plafond mensuel, regroupement par projets.
- **Recherche** : recherche sur les sept types d'objets, accessible depuis la loupe.
- **Sauvegarde** : export JSON V2 et restauration JSON V1/V2, sans perdre les données existantes.

Les prix et budgets sont stockés en **centimes**, et aucune opération financière n'est créée automatiquement lors de l'achat.

## Installation locale

```sh
cd nexus-v02
python3 -m http.server 8080
```

Ouvrir `http://localhost:8080/` dans un navigateur. Pour installer sur iPhone, il faut une origine HTTPS (après la publication sur GitHub Pages), ouvrir la page dans **Safari → Partager → Sur l'écran d'accueil**.

**Important :** les données ne quittent pas l'appareil, mais ne sont **pas chiffrées par NEXUS**. N'y saisis pas d'informations médicales ou financières sensibles dans cette V0.2. Effacer les données du site ou désinstaller l'app peut détruire son contenu. Utilise l'export JSON.

## Publication GitHub et installation iPhone

- **Code V0.2 publié** dans le dépôt public [Leomgl/nexus-app](https://github.com/Leomgl/nexus-app), branche `main` (14 fichiers), sans données personnelles.
- **GitHub Pages reste à activer** dans le dépôt : `Settings > Pages > Build and deployment > Deploy from a branch > main / (root) > Save`.
- Une fois le site actif, ouvrir `https://leomgl.github.io/nexus-app/` dans Safari, puis `Partager > Sur l'écran d'accueil > Ajouter`. Ouvrir ensuite NEXUS depuis son icône.
- Tester l'ouverture hors ligne, la création d'une note, la sauvegarde JSON et l'import JSON avant d'enregistrer des informations importantes.
- Les données de cette V0.2 restent **sur l'appareil**. Ne jamais publier d'export de données sur GitHub.
- **Étapes futures, non déployées** : Cloudflare Workers + D1 avec authentification côté serveur, synchronisation, notifications Web Push iPhone avec consentement explicite.

Le prototype est gratuit dans les limites des services utilisés. GitHub Pages doit être activé sur le dépôt pour rendre l'URL accessible.

Consulter `docs/ARCHITECTURE-CIBLE.md` et `docs/schema-d1-projet.sql` (proposition **non déployée**).

## Compatibilité
Le stockage local utilise **le même nom de base IndexedDB que la V0.1** (`nexus-v0-1`) pour préserver les données si l'origine du site est identique. Le schéma JSON de sauvegarde est désormais en V2, et l'import V1 reste pris en charge.

## Limitations importantes
- Suggestions de notes basées sur expressions régulières, **pas une IA**. Les dates et noms doivent être vérifiés avant confirmation.
- Pas de synchronisation Apple Calendrier, Contacts ou Rappels, ni banque liée.
- Pas de notifications push ni de connexion cloud tant qu'une API sécurisée n'a pas été mise en place.
- Si la PWA est publiée sur une autre URL, ce sera une **autre origine** : utiliser l'export/import pour retrouver tes données.

## Infrastructure Cloudflare V0.3 (préparatoire)

La base `nexus-app-db` (D1, juridiction UE) et le schéma relationnel V1 ont été créés le 10 novembre 2026. Le backend `backend/` est prévu pour un Worker **séparé** de RITUEL. À ce stade il ne propose que des vérifications techniques : **aucune donnée personnelle n'est synchronisée ni envoyée au cloud**. Le verrou d'authentification doit être développé et testé avant activation de la synchronisation. Voir [docs/CLOUD.md](docs/CLOUD.md).

**Backend déployé (état préparatoire)** : `nexus-app-api` est publié sur Cloudflare avec D1 `nexus-app-db`, région de juridiction UE. Les routes [health](https://nexus-app-api.q9pfwtztsc.workers.dev/api/health) et [config](https://nexus-app-api.q9pfwtztsc.workers.dev/api/config) sont destinées à la vérification technique. Cloud Sync reste désactivée en attendant l'authentification. Cette publication a été effectuée directement via Cloudflare ; GitHub Builds n'est pas encore activé.

## Nouveauté V0.3 : coffre chiffré facultatif

Dans **Réglages → Coffre cloud**, l'utilisateur peut créer son coffre avec une invitation à usage unique, conserver une clé de récupération, puis envoyer et restaurer des sauvegardes chiffrées manuellement. L'application **ne synchronise jamais automatiquement** et bloque les collisions de version. L'interface a désormais une politique CSP restrictive et le service worker utilise le cache `nexus-v0.3.0`.

La clé aléatoire de 256 bits dérive séparément une clé d'authentification et une clé de chiffrement AES-GCM. Cloudflare D1 ne reçoit que le document chiffré. **Ne perds pas la clé de récupération** : elle n'est pas récupérable. Les données restent non chiffrées sur l'appareil.

Voir [docs/COFFRE-CHIFFRE.md](docs/COFFRE-CHIFFRE.md) pour l'architecture. La connexion par passkey (Face ID) et la synchronisation bidirectionnelle restent des objectifs ultérieurs.
