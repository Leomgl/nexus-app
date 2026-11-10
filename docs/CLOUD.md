# NEXUS — Backend Cloudflare (préparation V0.3)

## État du 10 novembre 2026
- Base D1 créée : `nexus-app-db`, juridiction **eu** ; binding `DB`.
- Schéma SQL V1 appliqué : users, items, tables par type, liens, budgets et index.
- Aucun utilisateur ni aucune donnée privée insérés.
- Worker `nexus-app-api` : routes `GET /api/health` et `GET /api/config` seulement. **Aucune API de synchronisation**, écriture ou lecture des données personnelles.
- GitHub Pages reste la PWA V0.2 local-first ; ne change pas d'URL, ni de base IndexedDB.
- RITUEL reste totalement séparé (Worker et D1 différents).

## Pourquoi ce verrou de sécurité ?
Le site GitHub Pages est public. Une base D1 est privée, mais **une API Web mal protégée rendrait ses données accessibles à tous**.
Ne jamais utiliser CORS comme un mécanisme d'identité. Une route de données doit vérifier l'utilisateur côté serveur, contrôler chaque objet et limiter les abus.

## Avant l'activation de la synchronisation
1. Mettre en place une authentification serveur fiable (comptes, sessions renouvelables/révocables et limitation des tentatives).
2. Séparer strictement les données des utilisateurs et contrôler la propriété de chaque objet et relation.
3. Construire `pull / push` avec révisions, détection de conflit et protection contre effacement involontaire.
4. Proposer explicitement `Exporter JSON` avant import/activation de la sync ; jamais de transfert caché.
5. Mettre en place un canal de sauvegarde/restauration, suppression du compte et des sessions.
6. Tester sur une base de démonstration, puis seulement proposer le consentement pour synchroniser.

## Déploiement depuis GitHub
L'arborescence est `backend/`. Sur Cloudflare Workers Builds, connecter `Leomgl/nexus-app`, définir root `backend`, commande `npm install`, déploiement `npx wrangler deploy`. La base `nexus-app-db` doit être liée comme `DB` (le UUID figure dans `wrangler.toml`).
Le code est conçu pour être testé même sans Cloudflare, mais les endpoints DB ne fonctionnent qu'une fois la liaison active.

## Zéro frais
Garder exclusivement Workers Free et D1 Free. En cas de dépassement des quotas, l'app doit être en erreur/réessayer plus tard, **pas déclencher une migration payante**. Aucun secret ni information personnelle n'est placé dans GitHub.
