# NEXUS — second cerveau PWA (prototype V0.2)

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

## Déploiement visé (non effectué à ce stade)

1. Base de test V0.2 → tests fonctionnels et design sur iPhone.
2. Dépôt **public** `nexus-app` → GitHub Pages pour PWA gratuite (code uniquement, jamais de données personnelles).
3. Cloudflare Workers + D1 avec authentification côté serveur, modèle de relations et synchro multiappareil.
4. Notifications Web Push iPhone via Worker + Cron et service worker adapté, avec consentement explicite.
5. Améliorations progressives, toujours sans abonnement ni plan facturé.

Consulter `docs/ARCHITECTURE-CIBLE.md` et `docs/schema-d1-projet.sql` (proposition **non déployée**).

## Compatibilité
Le stockage local utilise **le même nom de base IndexedDB que la V0.1** (`nexus-v0-1`) pour préserver les données si l'origine du site est identique. Le schéma JSON de sauvegarde est désormais en V2, et l'import V1 reste pris en charge.

## Limitations importantes
- Suggestions de notes basées sur expressions régulières, **pas une IA**. Les dates et noms doivent être vérifiés avant confirmation.
- Pas de synchronisation Apple Calendrier, Contacts ou Rappels, ni banque liée.
- Pas de notifications push ni de connexion cloud tant qu'une API sécurisée n'a pas été mise en place.
- Si la PWA est publiée sur une autre URL, ce sera une **autre origine** : utiliser l'export/import pour retrouver tes données.
