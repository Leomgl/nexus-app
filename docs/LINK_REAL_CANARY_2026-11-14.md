# Nexus → vrai LINK : canary de notifications

**14 novembre 2026 | Forge #32 | production Nexus opt-in uniquement**

## Livré
- [PR Nexus #25](https://github.com/Leomgl/nexus-app/pull/25) **fusionnée** dans `main` par squash, commit `1d4ac40aa6b09149bb0224623fe8fbcc966d3db8`.
- GitHub Actions `NEXUS JavaScript checks` et `pages build and deployment` : **succès** sur ce commit.
- Aucun remplacement du manifest PWA, de l'origine, des données Nexus, du coffre, ni des API de production. Les anciens rappels ne sont pas migrés automatiquement.
- Nouveau bouton dans la section LINK de Nexus : **« Tester les notifications via le vrai LINK »**. Il ouvre le même Nexus installé avec le paramètre `?linkNotificationsLive=1` ; **le mode est désactivé par défaut**. Dans le canary, le bouton permet de quitter le mode de test.
- Le moteur notifications utilise l'inscription Hub existante, à travers `LinkHubAdapter.notificationCapability` : seul un jeton **notifications de 5 minutes** est délégué, jamais le credential Hub longue durée.
- La file locale est distincte du labo, `nexus-link-notifications-live-canary-v1`. Aucune reprise des intentions staging. Les commandes ne contiennent que ID opaque, catégorie, échéance UTC et révision.
- Le composant **Me notifier** propose jusqu'à cinq alertes par rendez-vous ou rappel. Les écritures se font sur l'élément modifié ; aucune boucle/polling D1. En mode canary, Nexus ne reconstruit pas les jobs de l'ancien moteur lors des enregistrements.
- Service worker/caches versionnés pour l'iPhone. Les anciennes notifications déjà programmées peuvent encore être livrées par les anciens systèmes : **utiliser un nouvel événement exclusivement pour les tests.**

## LINK réel
- Le transport Web Push manuel du vrai LINK est **validé par capture de bannière iOS**.
- Cloudflare `link-app` version `6f844caa-1355-4bdb-9c2b-d77be6278475` à 100 % à **19:37:29 UTC**.
- `LINK_NOTIFICATIONS_ENABLED=true`, `LINK_NOTIFICATION_DISPATCH_ENABLED=true`, `LINK_NOTIFICATION_AUTO_DISPATCH_ENABLED=true` ; `LINK_NOTIFICATION_CANARY_APP=nexus` limite l'émission de nouvelles intentions à Nexus, y compris pour les capacités déjà signées d'autres apps.
- D1 `link-hub-db` : au dernier contrôle **1 appareil actif**, **6 grants**, **0 intention**, **0 job**, **0 écriture D1** lors du contrôle. Scheduler : **Durable Object avec alarmes événementielles, aucun cron**.
- Rien n'a été activé pour Santé, Rituel, Gaming, Vestiaire ou Garage. LINK Test reste disponible temporairement en rollback/diagnostic.

## Recette iPhone

1. Lancer la **PWA habituelle Nexus** depuis l'icône (après prise en compte du nouveau service worker). Dans ses réglages/section LINK, toucher **« Tester les notifications via le vrai LINK »**. Un bouton flottant **« 🔗 LINK · Réel (test) »** doit apparaître.
2. Ouvrir ce bouton. Il doit indiquer « Connexion Nexus ↔ LINK détectée ». Sinon, le Hub Nexus doit être réinscrit via le **vrai** LINK, pas LINK Test. Aucune clé staging à copier.
3. Créer un **nouveau rendez-vous à 5–7 minutes**. Dans « Me notifier », sélectionner deux règles relatives, **2 minutes avant** et **1 minute avant**, puis enregistrer. Ne pas utiliser un événement existant potentiellement programmé chez l'ancien fournisseur.
4. Laisser l'iPhone en arrière-plan/verrouillé. Observer deux bannières émises par **LINK**, distinctes de celles de Nexus. Dans le même mode canary, modifier ensuite un autre RDV de test plus tôt/plus tard ; supprimer et vérifier l'absence d'alertes résiduelles.
5. Contrôler D1 : intentions created/pending, jobs queued puis accepted, clôtures sent et tombstones annulés, charge de lecture/écriture. Vérifier les cas offline / perte ACK sans doublons.
6. **Supprimer les rendez-vous de test** et attendre la validation de leurs annulations avant de quitter le mode canary. Cela évite qu'une intention laissée en attente délivre une bannière plus tard.
7. Après validation Nexus, tester Santé (les rendez-vous synchronisés passent uniquement par Nexus), Rituel, Gaming. Conserver le canary Nexus jusqu'à la fin des tests inter-apps.

## Rollback

Si la planification auto sur LINK se comporte mal, remettre **immédiatement** les trois flags `LINK_NOTIFICATIONS_ENABLED`, `LINK_NOTIFICATION_DISPATCH_ENABLED`, `LINK_NOTIFICATION_AUTO_DISPATCH_ENABLED` à `false`, préserver les intentions/tombstones D1 et vérifier l'arrêt des alarmes. Version LINK pré-activation `aa32ccc0-f71c-4ba2-b8c8-78cb3a98b127`; rollback du Nexus `main` précédent : `ce1d8816985312d90e6d0df36db8b2f077dff045` (le retour des anciens scripts doit être explicitement contrôlé, pas de suppression D1).

## Statut

**Code du canary publié et planificateur live activé pour Nexus seulement.** Réception iPhone des notifications **programmées** : **encore à vérifier** ; ne pas fermer Forge #32 ni supprimer le labo avant cette confirmation.
