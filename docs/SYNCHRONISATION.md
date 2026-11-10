# NEXUS V0.4 — Synchronisation prudente (opt-in)

## Objectif
Réduire les exports manuels sans mettre en danger les données locales ni les sauvegardes cloud.

## Mise en route
1. Utiliser le coffre chiffré déjà créé.
2. Depuis le téléphone principal, choisir **Sauvegarder vers le cloud** au moins une fois sur la V0.4.
3. Choisir **Activer la synchro automatique**.
4. Les nouvelles modifications enregistrées localement sont envoyées en snapshot chiffré. En arrière-plan sur iOS, les tâches Javascript ordinaires ne sont **pas garanties** : NEXUS resynchronise essentiellement à l'ouverture, lorsque l'app est active ou qu'une connexion revient.
5. Un appareil connecté qui n'a pas de modification locale depuis sa dernière version sauvegardée peut récupérer la version cloud plus récente. Les données locales précédentes sont copiées dans un point de récupération IndexedDB (non exposé dans l'UI pour l'instant).

## Résolution de conflits
Les envois s'effectuent avec **expectedVersion**. Le serveur refuse une écriture si la version a changé (409). Lorsqu'une modification locale et une modification distante sont détectées, la synchro s'arrête, et il faut résoudre manuellement. L'app **ne fusionne pas** encore notes, tâches ou opérations de deux appareils.

Aucune destruction silencieuse en cas de concurrence. Mais **ce mécanisme n'est pas une solution de synchronisation multi-appareils complète**. Ne pas modifier sur deux appareils simultanément avant une future gestion des tombstones et fusion par objet.

## Confidentialité
Les snapshots sont chiffrés côté PWA par WebCrypto, la clé de récupération est stockée sur cet appareil dans IndexedDB et nécessaire sur un nouvel appareil. Le serveur ne reçoit pas les textes en clair. Les données locales et la clé ne sont pas chiffrées de façon supplémentaire dans IndexedDB.

Le coffre repose toujours sur une clé de récupération, pas Face ID. Une intégration WebAuthn/passkeys devra vérifier les défis, signatures et l'identité côté serveur, sans perdre la possibilité de déchiffrer les sauvegardes en bout en bout. **Ne pas simuler Face ID avec une simple vérification frontend.**

## Futur
- Résolution par objet avec versions, tombstones, conflits affichés et journal des opérations.
- Rotation/révocation des clés et gestion sécurisée des appareils.
- Passkeys WebAuthn vérifiées côté serveur avec solution de secours.
- Chiffrement local renforcé et origine web dédiée.
