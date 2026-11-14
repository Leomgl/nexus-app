# Nexus → LINK — pilote « Me notifier » (Forge #32)

**État le 14/11/2026 : branche d'essai \`feat/nexus-link-notifications-pilot\`, PR #24 ouverte en brouillon. Aucun déploiement sur la PWA Nexus, aucune activation production.**

## Ce qui fonctionne dans le code de la branche

Les formulaires **Rendez-vous** et **Rappel** montent le même composant natif LINK \`<link-notify-picker>\` au lieu du vieux sélecteur uniquement quand l'URL contient **\`?linkNotificationsPilot=1\`**. Hors de ce mode, le comportement et le système de notifications historiques restent inchangés.

Le bloc permet de sauvegarder localement 0 à 5 alertes par élément (jours/heures/minutes avant l'échéance et/ou dates/heures fixes), de les modifier et de les supprimer. Un changement de date recalcule les horaires relatifs, pas les dates fixes. Une tâche terminée désactive la livraison jusqu'à sa réactivation.

L'adaptateur \`link-notifications/nexus-pilot.mjs\` :
- Conserve les préférences dans \`event.linkNotificationSchedule\` / \`task.linkNotificationSchedule\`.
- Conserve **seulement** un secret HMAC, le journal de livraison et une file de changements à rejouer dans une IndexedDB locale séparée \`nexus-link-notifications-pilot-v1\`.
- Ne transmet à LINK que \`id\` opaque HMAC, \`dueAt\`, \`category\`, \`revision\`, \`operation\`. Les titres, lieux, personnes, notes, montants et autres données métier restent dans Nexus.
- Cible **l'élément modifié**, jamais une reconstruction de toutes les notifications. Sans changement, 0 appel au serveur et 0 écriture D1.
- Persiste l'identifiant de chaque règle **et la commande exacte** dans une outbox `inflight:` AVANT toute requête. Les ACK sont écrits individuellement après validation serveur ; si la réponse HTTP est perdue après un succès serveur, le même ID + la même révision sont rejoués sans doublon. Une suppression/restauration attend d'abord la résolution des commandes précédentes.
- Enregistre les changements non acquittés dans une file d'attente locale. Un événement \`online\`, une remise au premier plan ou un nouveau changement les retente, **sans intervalle ni polling Cloudflare**.
- Annule l'intention quand l'élément est supprimé ou la tâche terminée. Une restauration ou réactivation renouvelle l'époque de la règle après l'ACK d'annulation, car l'identifiant antérieur est terminal.
- Reste *local-only* tant qu'aucun client staging autorisé n'a été enrôlé. Ne récupère JAMAIS le token Hub de production.

## Déploiement réel staging validé — 14 novembre 2026

- **Nexus Test** est servi sur `https://nexus-link-notifications-test.pages.dev/index.html?linkNotificationsPilot=1`, depuis la branche pilote. Son `manifest.webmanifest` porte le nom **Nexus Test**, démarre avec le paramètre du pilote et garde ses données locales séparées des apps installées. La CSP ne permet que LINK notifications staging et les API publiques météo, **aucune API métier de production**.
- **LINK Test** conserve `https://link-notifications-staging.q9pfwtztsc.workers.dev/`. Ses Web Push manuels chiffrés par type ont été réceptionnés sur iPhone (capture utilisateur du 14/11).
- Le Worker staging dispose de `LinkNotificationScheduler`, **Durable Object SQLite** avec alarme événementielle, et d'un rate limiter séparé `LINK_NOTIFICATION_DISPATCH_RATE_LIMITER` (24/minute). Les trois flags `AUTO_DISPATCH`, `DISPATCH` et `SMART_PAYLOAD` sont activés **seulement en staging**. Aucun polling cron/5 minutes.
- L'accès propriétaire `/api/v2/owner/notifications/pilot` est protégé par **Face ID / session passkey existante**, limite de débit, et permet : voir le statut, créer une invitation Nexus à usage unique valable 15 minutes, autoriser/révoquer les notifications Nexus.
- `/api/v2/hub/enroll` en staging n'accepte **que** l'origine `https://nexus-link-notifications-test.pages.dev` et le vrai code éphémère. Aucune clé de production n'est copiée. Le Nexus Test reçoit ensuite une capacité courte durée via les endpoints standards de LINK.
- La D1 staging enregistre `nexus` sous l'origine dédiée ci-dessus. Au moment du déploiement, **aucun client Nexus n'est inscrit, son grant = 0** : il faut que le propriétaire procède à la liaison et à l'autorisation depuis LINK Test. Une ligne d'intention annulée préexistante est conservée comme tombstone.
- La production `link-app` a été revérifiée : aucun binding de scheduler automatique, aucun flag `AUTO_DISPATCH`. Les PR restent non fusionnées.

La logique est déployée, mais **la livraison Nexus → LINK → iPhone n'est pas validée en conditions réelles** : elle requiert encore une inscription propriétaire, un rendez-vous créé dans Nexus Test et une réception constatée sur l'iPhone.

### Première recette sur iPhone

1. Ouvrir **LINK Test** (déjà installé), déverrouiller avec Face ID puis descendre à **« Raccorder Nexus (staging) »**. Toucher **« Vérifier Nexus »** puis **« Créer un code Nexus (15 min) »**. Copier l'invitation.
2. Dans Safari, ouvrir `https://nexus-link-notifications-test.pages.dev/index.html?linkNotificationsPilot=1`. Le badge rouge **NEXUS TEST** et le bouton **🔗 LINK · Test** confirment la préversion. Ouvrir ce panneau, coller le code et toucher **« Inscrire Nexus au staging »**.
3. Retourner dans **LINK Test**, toucher **« Autoriser les notifications Nexus (test) »**, puis **« Vérifier Nexus »**. Le statut doit montrer **Client(s) : 1** et **Notification : autorisée**.
4. Dans Nexus Test, créer un **rendez-vous pour dans 5 minutes**, cocher **Me notifier**, ajouter **1 minute avant**, puis enregistrer. Laisser l'iPhone verrouillé. LINK Test devrait envoyer une alerte environ 4 minutes après la création, indépendamment de la fermeture de Nexus Test.
5. Confirmer la réception puis tester déplacement, suppression, restauration, réseau hors ligne, absence de doublon et compteur de lecture/écriture D1. Révoquer depuis LINK Test en cas d'anomalie.

L'autorisation d'un rappel **sur une date passée ou sans date** n'est pas garantie par le pilote. Pour les 1ères minutes, mieux vaut utiliser un rendez-vous à heure précise (pas une tâche sans échéance).

## Pré-requis de la recette iPhone

1. Déployer une preview isolée de Nexus PR #24 (éviter le domaine GitHub Pages de production) et garder la PWA test LINK sur son domaine staging ; vérifier les origines dans les permissions.
2. Exposer l'enrôlement **staging uniquement**, sans réutiliser le token Hub production ni devoir saisir une clé pour chaque application en production. Ouvrir la permission Nexus en staging après enrôlement et validation de l'owner.
3. Déployer le nouveau Worker de staging avec Web Push chiffré et Durable Object alarm derrière ses flags ; laisser les flags et le Worker de production inchangés.
4. Ouvrir la preview Nexus depuis un iPhone, créer un rendez-vous avec 5 alertes mixtes. Vérifier le premier push programmé LINK, puis modifier l'heure (même ID opaque, révision incrémentée), supprimer, restaurer et activer/désactiver.
5. Tester Wi-Fi coupé/reconnecté, iPhone verrouillé, autorisation push révoquée, plus de 100 sauvegardes inchangées, quotas D1 et aucun doublon.
6. Tester la source Santé → Nexus et les modifications venant d'un autre appareil. Les secrets HMAC locaux **ne sont pas encore synchronisés entre appareils** : ne pas activer une deuxième source d'émission d'intentions tant que l'identité multi-appareils n'est pas définie.
7. Documenter l'arrêt de l'ancien \`/api/v1/push/schedule\` sans laisser de jobs hérités ; seulement ensuite préparer la bascule de production.

## Limites explicitement non résolues

- La programmation côté LINK accepte actuellement un horizon **de 90 jours**. Les préférences d'un événement plus lointain restent sauvegardées localement, mais ne sont pas automatiquement garanties sans mécanisme dédié de programmation différée au-delà de cet horizon.
- Le calcul des jours relatifs suit le fuseau local de l'appareil. Les événements de voyage ayant un fuseau différent nécessitent un adaptateur IANA.
- La migration et le nettoyage définitif des anciens moteurs dans les autres PWAs sont des étapes séparées, jamais à effectuer avant validation de l'envoi depuis LINK.

## Validation automatisée

Le workflow GitHub Actions \`.github/workflows/link-notifications-pilot.yml\` exécute sous Node 22 :
- Analyse syntaxique Nexus \`app.js\` et tous les modules de pilotage ;
- Tests du sélecteur, des règles J/H/min/date fixe, UTC/DST, des identifiants HMAC, des révisions et du SDK sans réseau.
- Test d'intégration **mock du réseau et d'IndexedDB** `tests/link-notification-pilot-outbox.test.mjs` : un upsert appliqué côté serveur mais sans ACK côté client, retry identique, suppression, restauration sous nouvel ID et 100 sauvegardes inchangées sans nouvel appel. Cette preuve est **simulée**, elle ne remplace pas le test iPhone.

Références :
- [Nexus PR #24](https://github.com/Leomgl/nexus-app/pull/24)
- [LINK PR #5](https://github.com/Leomgl/link-app/pull/5)
- [Forge #32](https://github.com/Leomgl/forge-app/issues/32)
