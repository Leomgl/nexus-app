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
- Persiste l'identifiant de chaque règle avant toute requête réseau. Les ACK sont écrits individuellement après validation serveur ; le reste se retente sans inventer de nouveaux IDs.
- Enregistre les changements non acquittés dans une file d'attente locale. Un événement \`online\`, une remise au premier plan ou un nouveau changement les retente, **sans intervalle ni polling Cloudflare**.
- Annule l'intention quand l'élément est supprimé ou la tâche terminée. Une restauration ou réactivation renouvelle l'époque de la règle après l'ACK d'annulation, car l'identifiant antérieur est terminal.
- Reste *local-only* tant qu'aucun client staging autorisé n'a été enrôlé. Ne récupère JAMAIS le token Hub de production.

## Ce qui n'est pas encore opérationnel en staging

Vérification **en lecture seule** du Worker \`link-notifications-staging\` et de la base D1 \`link-notifications-staging\` :
- L'app \`nexus\` est enregistrée, avec l'origine \`https://leomgl.github.io\`.
- La permission \`notification_app_grants.notifications_allowed\` de Nexus est encore à **0**.
- \`hub_clients\` ne contient encore **aucun client** dans cette base.
- Le staging PWA sait déjà envoyer un **push manuel générique** à l'iPhone, démontré par capture utilisateur ; mais le moteur de nouveaux messages chiffrés, le planificateur automatique Durable Object et l'inscription Hub de Nexus ne sont pas encore publiés ensemble sur ce Worker.

Il serait donc incorrect d'annoncer que Nexus peut déjà déclencher automatiquement une notification sur l'iPhone. **Aucune notification automatique n'est censée fonctionner à ce stade.**

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

Références :
- [Nexus PR #24](https://github.com/Leomgl/nexus-app/pull/24)
- [LINK PR #5](https://github.com/Leomgl/link-app/pull/5)
- [Forge #32](https://github.com/Leomgl/forge-app/issues/32)
