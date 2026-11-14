# Nexus ↔ LINK réel — recette canary après réception Web Push validée

**14 novembre 2026 — Forge #32 / Nexus PR #24 / LINK PR #5**

## Validation acquise

Le propriétaire a confirmé sur capture iPhone une bannière native **« LINK · Rappel »** reçue du **véritable LINK** et le retour positif « Apple a accepté le test » dans l'interface. L'inscription unique du même iPhone et le Web Push manuel sur l'origine live fonctionnent.

Il reste à prouver la **planification d'un rendez-vous Nexus via le Durable Object du LINK réel** ; la réussite d'un push manuel ne le valide pas automatiquement.

## État du pilote Nexus et risque

Le fichier `link-notifications/nexus-pilot.mjs` utilise aujourd'hui :
- `STAGING = https://link-notifications-staging.q9pfwtztsc.workers.dev`;
- une invitation puis un credential créés **uniquement** dans la D1 staging ;
- un journal / un secret HMAC isolés dans `nexus-link-notifications-pilot-v1`;
- un opt-in `?linkNotificationsPilot=1` et une préversion `nexus-link-notifications-test.pages.dev`.

Le pilote **ne peut pas être basculé sur le vrai LINK en changeant la constante d'URL seule** : l'origine enregistrée de Nexus dans la D1 live est `https://leomgl.github.io`, alors que la préversion a une origine `pages.dev`, et les credentials staging ne sont pas acceptables sur LINK réel.

## Séquence courte, sans multi-appareils

1. Prévoir le **canary depuis l'origine réelle Nexus**, derrière un flag explicite de test et **sans scanner les événements existants**. Utiliser la session d'enrôlement déjà valide de Nexus dans le vrai Hub, avec token lu localement uniquement par son propriétaire (jamais envoyé à un serveur de test, jamais mis dans une URL ou un log). Ne pas inclure de token dans un commit.
2. **Conserver le pilote staging intact** jusqu'à validation du canary réel. Isoler le journal de commandes live des données staging afin de ne pas rejouer les IDs du laboratoire sur la D1 réelle. Garder le même SDK de commandes et les 5 slots.
3. Vérifier l'origine autorisée / les grants : Nexus live déjà inscrit et notifications accordées. Ne pas réenrôler Nexus en doublon et ne pas révoquer les autres autorisations.
4. Activer dans LINK réel uniquement les trois flags nécessaires à l'ingress/alarme/dispatch **après** que le code Nexus sur l'origine réelle existe, a été testé et peut créer un rendez-vous de test. Les autres applications ne doivent pas encore publier d'intentions ; ne pas activer leur ancien système.
5. Sur iPhone, créer un **rendez-vous de test dans 5 minutes avec 2 notifications (−2 min et −1 min)** dans Nexus live via le mode canary, puis confirmer l'heure de réception. Tester modification plus tôt / plus tard, suppression, suppression après première livraison, reprise hors ligne, pas de doublon et les catégories.
6. Vérifier les lignes D1 écrites/lues, aucune régression Hub, capacité à remettre les flags à false sans effacer les tombstones et sans restaurer l'ensemble de D1.
7. Tester ensuite Santé / Rituel / Gaming sur **LINK réel**, puis seulement retirer le backend LINK Test et fusionner les PR.

## Interdictions de recette

- Aucune migration de secret HMAC de staging à live ; aucune copie d'invitation ou token entre les deux.
- Aucun test de diffusion live via une origine non enregistrée, aucun polling D1, aucun mécanisme multi-appareils supplémentaire.
- Ne pas déclarer le chantier terminé avant réception réelle des **notifications programmées** sur iPhone.

**Statut : Web Push manuel LINK réel VALIDÉ ; canary programmé Nexus→LINK réel NON ENCORE VALIDÉ.**
