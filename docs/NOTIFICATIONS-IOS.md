# NEXUS V0.4 — Notifications iOS

## Configuration

Le Worker `nexus-app-api` a une API privée, la clé VAPID publique dans `backend/wrangler.toml` et la clé privée dans le secret Cloudflare Runtime `VAPID_PRIVATE_JWK`.

Le Cron Cloudflare `*/5 * * * *` est **actif**. Le service Worker PWA `sw.js` écoute les messages `push` et les clics `notificationclick`. Toutes les notifications sont génériques par confidentialité.

### Parcours iPhone

1. Ouvrir NEXUS depuis l'icône de l'écran d'accueil iOS 16.4+.
2. Aller à **Réglages → Notifications iPhone**.
3. Pour un **rendez-vous**, ouvrir Agenda → événement → Modifier et choisir ses délais spécifiques : 1 jour, 2 h, 45 min, 15 min, etc., avec cumul possible. Pour les **tâches**, leurs délais par défaut se configurent dans les réglages de notifications.
4. **Activer les notifications**, accepter le dialogue iOS ; cliquer sur **Envoyer une notification test**.
5. Créer un rendez-vous à une date future et rouvrir le panneau de notification pour contrôler l'état.
6. Fermer NEXUS et vérifier la notification à l'échéance (délais non garantis à la minute).

Pour les tâches, si une échéance a une date mais aucune heure explicite, une heure locale de 09:00 s'applique. Sans date : aucun push.

### Données échangées

Le client envoie à l'API authentifiée : souscription Web Push (`endpoint`, clés publiques/chiffrables), ID opaque de l'appareil, type `event` ou `task`, horodatage de déclenchement `fireAt`, ID opaque SHA256 pour déduplication. Aucun titre, nom, lieu, téléphone, e-mail ou corps de note.

Le contenu du push est chiffré selon RFC 8291 et signé VAPID ES256 (RFC 8292). Les clés privées VAPID ne sont pas stockées dans GitHub.

### Serveur

- `GET /api/v1/push/config` : clé publique et état de préparation.
- `POST /api/v1/push/register` : enregistre souscription, liée au coffre authentifié.
- `POST /api/v1/push/schedule` : remplace les rappels futurs de cet appareil.
- `POST /api/v1/push/test` : envoi immédiat, limité à 90 secondes entre tests.
- `POST /api/v1/push/unsubscribe` : supprime souscription et jobs.

Un cron toutes les 5 minutes parcourt les rappels dus, réserve les envois pour éviter les doublons et purge les anciens. Le serveur ne peut pas envoyer si l'abonnement Apple est invalidé ou si les quotas sont épuisés.

**Important** : lorsque l'appareil est hors ligne pendant qu'un rendez-vous est modifié, l'ancien planning côté serveur ne peut pas être annulé immédiatement. NEXUS le met à jour dès qu'il retrouve Internet et s'ouvre. Les fuseaux peuvent varier si on change de pays entre création et échéance.

### Tests effectués

- Chiffrement de la charge utile testé avec paire ECDH de réception simulée : déchiffrement identique.
- Signature VAPID testée contre la clé publique : valide.
- D1 testée : abonnement 200, planification 200, accès avec mauvaise clé 401, désabonnement 200.
- Les envois vers le véritable service Apple **ne sont pas encore validés**, à vérifier depuis l'iPhone.

### Débogage

Si le bouton est indisponible : vérifier l'installation écran d'accueil, les permissions iOS et la présence du coffre chiffré. Si le test échoue : réouvrir NEXUS en ligne, vérifier l'abonnement et les paramètres iOS. Ne pas désinstaller l'app pour une simple mise à jour.

## Évolution V0.6 — chaque rendez-vous choisit ses propres rappels

Le champ `event.reminderMinutes` est un tableau de minutes avant `event.start`, par exemple `[1440,120,15]` (médecin) ou `[45]` (train). Un tableau vide `[]` signifie **aucune notification**. Les événements historiques n'ayant pas ce champ continuent d'utiliser `settings.eventMins` jusqu'à leur modification.

La génération des `push_jobs` utilise désormais cette liste par événement, sans envoyer de titres ni de lieux au Worker. Les rappels enregistrés sont annulés/reprogrammés après sauvegarde d'un événement, y compris modification ou suppression, à condition que l'iPhone soit connecté et que les notifications soient activées.

**Test local du calcul :** médecin à 1 jour + 2 heures + 15 minutes, train à 45 minutes, aucun rappel pour un événement désactivé et conservation d'un ancien rappel de 1 heure : 5 jobs générés, aux délais attendus.


## V0.21.3 — Messages contextualisés et Budget (FORGE #5)

La planification reste `{id,kind,fireAt}`, sans texte privé transmis à Cloudflare. Les messages personnalisés résident dans l'IndexedDB local, sous `nexus_push_context_v1`, et le Service Worker les lit à la réception via le tag opaque existant. Les notifications de récurrences Budget sont transportées avec `kind:task` pour respecter le schéma D1 actuel (pas de migration).

Dans Réglages → Notifications iPhone : activer/désactiver les échéances de Budget ; cocher facultativement **Afficher les détails** pour les noms, lieux, contacts et montants sur écran verrouillé. Désactivé par défaut. Dans chaque règle Budget → Engagements : J-7, J-2, jour J (défaut J-2 et jour J), ou aucune alerte. Heure 09:00 locale. Le calendrier sert aux prévisions, pas de confirmation de débit ou de virement. Voir [PUSH-V0213.md](PUSH-V0213.md) pour limites, confidentialité et recette.
