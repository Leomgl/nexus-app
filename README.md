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

**Important :** le stockage local IndexedDB reste en clair. Seules les sauvegardes cloud effectuées sur demande sont chiffrées. N'y saisis pas encore d'informations très sensibles. Si tu supprimes l'icône ou les données de Safari, une sauvegarde JSON ou une clé de récupération cloud sera indispensable.

## Publication GitHub et installation iPhone

- **Code V0.3 publié** dans le dépôt public [Leomgl/nexus-app](https://github.com/Leomgl/nexus-app), branche `main`, sans données personnelles.
- **GitHub Pages activé** : https://leomgl.github.io/nexus-app/ ; vérifié sur l'iPhone de l'utilisateur avec la V0.2. Tests V0.3 à refaire.
- Une fois le site actif, ouvrir `https://leomgl.github.io/nexus-app/` dans Safari, puis `Partager > Sur l'écran d'accueil > Ajouter`. Ouvrir ensuite NEXUS depuis son icône.
- Tester l'ouverture hors ligne, la création d'une note, la sauvegarde JSON et l'import JSON avant d'enregistrer des informations importantes.
- Les données restent **sur l'appareil**, sauf si une sauvegarde cloud chiffrée est déclenchée volontairement. Ne jamais publier de données ou de clés dans GitHub.
- **Déployé pour V0.3** : Cloudflare Worker + D1 et authentification par clé de récupération pour les sauvegardes chiffrées manuelles. Passkeys, synchronisation continue et notifications Web Push sont à venir.

Le prototype est gratuit dans les limites des services utilisés. GitHub Pages doit être activé sur le dépôt pour rendre l'URL accessible.

Consulter `docs/ARCHITECTURE-CIBLE.md`, `docs/schema-d1-projet.sql` (V1 déployée) et `docs/COFFRE-CHIFFRE.md` (V2 déployée).

## Compatibilité
Le stockage local utilise **le même nom de base IndexedDB que la V0.1** (`nexus-v0-1`) pour préserver les données si l'origine du site est identique. Le schéma JSON de sauvegarde est désormais en V2, et l'import V1 reste pris en charge.

## Limitations importantes
- Suggestions de notes basées sur expressions régulières, **pas une IA**. Les dates et noms doivent être vérifiés avant confirmation.
- Pas de synchronisation Apple Calendrier, Contacts ou Rappels, ni banque liée.
- Pas de notifications push ni de connexion cloud tant qu'une API sécurisée n'a pas été mise en place.
- Si la PWA est publiée sur une autre URL, ce sera une **autre origine** : utiliser l'export/import pour retrouver tes données.

## Infrastructure Cloudflare V0.3 (préparatoire)

La base `nexus-app-db` (D1, juridiction UE) et le schéma relationnel V1 ont été créés le 10 novembre 2026. Le backend `backend/` utilise un Worker **séparé** de RITUEL. Depuis V0.3, seules des sauvegardes **chiffrées sur le téléphone et déclenchées manuellement** peuvent être enregistrées dans D1 avec une clé de récupération. La synchronisation automatique reste désactivée. Voir [docs/CLOUD.md](docs/CLOUD.md).

**Backend déployé (état préparatoire)** : `nexus-app-api` est publié sur Cloudflare avec D1 `nexus-app-db`, région de juridiction UE. Les routes [health](https://nexus-app-api.q9pfwtztsc.workers.dev/api/health) et [config](https://nexus-app-api.q9pfwtztsc.workers.dev/api/config) sont destinées à la vérification technique. Les sauvegardes cloud chiffrées sont désormais disponibles sur demande, mais aucune synchronisation automatique n'est activée. Cette publication a été effectuée directement via Cloudflare ; GitHub Builds n'est pas encore activé.

## Nouveauté V0.3 : coffre chiffré facultatif

Dans **Réglages → Coffre cloud**, l'utilisateur peut créer son coffre avec une invitation à usage unique, conserver une clé de récupération, puis envoyer et restaurer des sauvegardes chiffrées manuellement. L'application **ne synchronise jamais automatiquement** et bloque les collisions de version. L'interface a désormais une politique CSP restrictive et le service worker utilise le cache `nexus-v0.3.0`.

La clé aléatoire de 256 bits dérive séparément une clé d'authentification et une clé de chiffrement AES-GCM. Cloudflare D1 ne reçoit que le document chiffré. **Ne perds pas la clé de récupération** : elle n'est pas récupérable. Les données restent non chiffrées sur l'appareil.

Voir [docs/COFFRE-CHIFFRE.md](docs/COFFRE-CHIFFRE.md) pour l'architecture. La connexion par passkey (Face ID) et la synchronisation bidirectionnelle restent des objectifs ultérieurs.

### Premier test du coffre (V0.3)

1. Ouvrir NEXUS dans Safari depuis son icône, actualiser si l'ancienne version est affichée.
2. Aller dans **Réglages → Coffre cloud**, entrer le code d'invitation à usage unique transmis séparément.
3. Conserver immédiatement la **clé de récupération de 43 caractères** dans un gestionnaire de mots de passe ; ne pas la publier dans GitHub.
4. Déclencher **Sauvegarder vers le cloud** et vérifier l'état du coffre.
5. Sur un second appareil, choisir **Retrouver mon coffre** avec la clé de récupération et, après export JSON local si nécessaire, restaurer volontairement la sauvegarde.

**Précaution d'origine web :** GitHub Pages héberge RITUEL et NEXUS sur le même domaine `leomgl.github.io` (chemins différents). Les chemins ne sont **pas des frontières de sécurité web**. Une faille de script sur ce même domaine pourrait affecter des données locales de NEXUS. Prévoir une origine dédiée avant d'y placer des données sensibles.
