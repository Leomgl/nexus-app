# NEXUS — Second cerveau personnel (V0.4)

NEXUS est une **PWA iPhone installable gratuitement sans App Store**, développée avec HTML, CSS, JavaScript, IndexedDB et Cloudflare Workers/D1. [Ouvrir l’application](https://leomgl.github.io/nexus-app/). Le code est public, mais les données personnelles ne sont jamais placées dans GitHub.

## Fonctions opérationnelles

- **Notes** : capture rapide, texte libre, liens vers les éléments créés et suggestions locales.
- **Agenda** : rendez-vous, date/heure, lieu, personne, notes liées, export iCalendar.
- **Rappels** : tâches, échéance, heure, état terminé, projets, origine.
- **Personnes** : répertoire personnel avec téléphone et courriel.
- **Projets** : budget prévisionnel, progrès par tâches, achats et dépenses liés.
- **Achats** : wishlist, priorités, projet, coût estimé, achat effectué et conversion *volontaire* en dépense.
- **Budget** : recettes, dépenses, catégories et plafond mensuel.

La **capture intelligente V0.4** repère dates/heures/lieux français, personnes du répertoire, rendez-vous, actions à faire, achats, projets et dépenses. Elle propose, mais ne crée jamais rien sans validation. Les détections restent locales et déterministes (pas de modèle IA distant, pas de frais d'API).

## Notifications iOS V0.4

Le Worker Cloudflare `nexus-app-api` et son Cron **toutes les 5 minutes** sont déployés. Le calendrier des alertes est transmis **uniquement après activation explicite des notifications** sur l'iPhone. Cloudflare reçoit l'identifiant opaque du rappel, son échéance, son type `event`/`task` et une souscription Web Push, **jamais le titre, le lieu, le contact ou la note**. Une notification générique s'affiche même écran verrouillé.

Dans NEXUS installé sur l'écran d'accueil iPhone :
1. Ouvrir **Réglages → Notifications iPhone → Activer les notifications**.
2. Choisir 24 h, 1 h et/ou 15 min avant un rendez-vous ou une tâche.
3. Autoriser les notifications à l'invite iOS, puis toucher **Envoyer une notification test**.
4. Créer ou modifier un rendez-vous futur : NEXUS met à jour son planning côté serveur après l'enregistrement. Tâches sans heure : défaut 09:00 (heure locale du téléphone).

Sur iOS, Web Push nécessite iOS 16.4+, HTTPS, la **PWA installée depuis Safari et ouverte depuis son icône**, ainsi qu'une autorisation iOS. Le cron et le réseau n'offrent aucune garantie à la seconde. Un changement effectué hors ligne ne peut pas immédiatement annuler un ancien rappel sur le serveur : ouvrir NEXUS une fois Internet revenu.

## Coffre chiffré et synchronisation V0.4

- Coffre **optionnel** activé avec un code d'invitation à usage unique ; conserver la clé de récupération de **43 caractères** dans le trousseau iCloud. Ne jamais la communiquer ou la publier.
- Les snapshots sont chiffrés **sur l'appareil** en AES-256-GCM (clé dérivée via HKDF). Cloudflare conserve seulement un document chiffré et un vérificateur d'accès.
- Dans **Réglages → Coffre cloud**, utiliser **Sauvegarder vers le cloud** et, seulement après la première sauvegarde depuis cet appareil, **Activer la synchro automatique**.
- La synchronisation, **désactivée par défaut**, pousse les modifications locales et peut récupérer automatiquement une version distante si aucune modification locale n'est intervenue. Elle conserve aussi une sauvegarde locale avant toute réception.
- Si deux appareils modifient leurs données indépendamment, **la synchronisation est arrêtée**. Il n'existe pas encore de fusion multiéditeur en temps réel ; pour l'instant, ne modifie pas simultanément les données sur deux appareils.
- L'export/import JSON reste disponible et il faut conserver au moins un export indépendant.

**À ne pas confondre** : cette V0.4 n'inclut **ni identification par Face ID/passkey**, ni synchronisation temps réel avec résolution automatique des conflits. Les données **locales** dans IndexedDB restent en clair. L'origine GitHub Pages `leomgl.github.io` est partagée avec d'autres applications du même compte : les chemins ne constituent pas une frontière de sécurité. Ne pas y stocker encore de données très sensibles.

## Architecture

```text
iPhone PWA — GitHub Pages (/nexus-app/)
  ├── app.js : notes, calendrier, budget, projets, capture locale
  ├── cloud.js : chiffrement, coffre, synchronisation opt-in
  ├── push-client.js : permission iOS, préférences, abonnements
  ├── sw.js : offline + notificationclick / push
  └── IndexedDB : données personnelles locales

Cloudflare Worker nexus-app-api
  ├── backend/src/index.js : accès au coffre + API authentifiée
  ├── backend/src/push.js : VAPID, Web Push, planification
  ├── Cron : */5 * * * *
  └── D1 nexus-app-db (juridiction EU)
        ├── tables métier V1 (réservées au futur modèle structuré)
        ├── vaults (snapshots chiffrés) V2
        └── push_devices / push_jobs V3 (horaires et souscriptions)
```

Les secrets VAPID privés **restent dans Cloudflare**, jamais sur GitHub. La clé publique est exposée dans le Worker pour permettre l'abonnement push. Le Worker a été mis en production directement via l'API Cloudflare ; GitHub Workers Builds n'est pas encore configuré. Les mises à jour du dossier `backend/` ne se déploient donc **pas automatiquement**.

## Installation et mises à jour

1. Ouvrir https://leomgl.github.io/nexus-app/ dans Safari, puis **Partager → Sur l'écran d'accueil → Ajouter**.
2. Ouvrir l'app depuis son icône ; le Service Worker gère la mise en cache des ressources.
3. Lors des mises à jour, **fermer et rouvrir ou actualiser l'application**. Ne pas supprimer l'icône, sous peine de perdre IndexedDB et l'abonnement push.
4. Effectuer une sauvegarde locale JSON avant une désinstallation, restauration ou changement d'appareil.

## Suivi des tests

- ✅ Code GitHub V0.4 et schémas D1 V3 déployés.
- ✅ Tests serveur Cloudflare : création coffre, refus mauvaise clé, conflits, abonnement Web Push, planification et désinscription. Données de test nettoyées.
- ✅ Test cryptographique simulé : chiffrement AES128GCM du push et signature VAPID vérifiés.
- ⏳ À vérifier sur vrai iPhone : permission Web Push, réception push de test et rappel planifié après fermeture de l'app.
- ⏳ À vérifier sur plusieurs appareils : restauration, réception automatique sans conflit, comportements hors ligne.
- ⏳ À construire : connexion passkey/Face ID **avec vérification serveur WebAuthn**, rotation/révocation des clés, moteur de fusion multiappareil, refonte UI.

## Gratuité

Projet conçu pour GitHub Free, Cloudflare Workers Free et D1 Free. Les limites et conditions des offres peuvent évoluer. **Ne jamais activer une offre payante sans accord explicite.**

Documentation : [Notifications iOS](docs/NOTIFICATIONS-IOS.md) · [Synchronisation](docs/SYNCHRONISATION.md) · [Sécurité coffre](docs/COFFRE-CHIFFRE.md) · [Architecture cible](docs/ARCHITECTURE-CIBLE.md).
