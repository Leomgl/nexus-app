# Nexus V0.21.8 — Hydratation Santé facultative (12/11/2026)

- `nexus-sante.js` étend `validDaily` avec validation d'un sous-objet `hydration` **optionnel** : le flux des prises existant fonctionne sans lui. Rejette valeurs négatives, dépassements incohérents et date divergente.
- Widget Pulse de Santé enrichi avec boissons du jour / objectif, eau seule et caféine estimée. Un résumé absent ou périmé n'est pas affiché comme actuel. Pas de détail des boissons ni de journal intime.
- Le consentement n'est jamais activé côté Nexus : il est demandé dans Santé, chiffré en transport. Les agrégats reçus sont conservés dans le stockage local **non chiffré au repos** de Nexus comme l'ancien suivi des prises. En désactivant le partage et après une nouvelle réception, les totaux disparaissent du snapshot courant.
- Version affichée V0.21.8, cache SW `nexus-v0.21.8.0`, scripts cache-bustés `nexus-sante.js/css?v=0218`.
- Vérifier iPhone : PWA Nexus se met à jour sans désinstallation ; Santé envoie le résumé après opt-in ; Nexus réceptionne ; désactivation retire le bloc après réception ; prises, notifications et autres liens restent fonctionnels.
