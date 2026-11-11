# NEXUS · Pulse V0.18 — spécification livrée

> Dernière mise à jour : 2026-11-11. Lire aussi [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md).
> Aucun changement de schéma IndexedDB, de Worker Cloudflare, de coffre ou des notifications. Évolution d'interface et de préférences locales.

## Objectif produit

NEXUS est le **centre de contrôle quotidien**. Gaming, Rituel, Vestiaire et d'autres apps restent des spécialisations autonomes. Elles ne doivent remonter vers NEXUS que les informations utiles et explicitement autorisées, jamais dupliquer silencieusement une source de vérité.

Pulse fournit un accueil orienté **aujourd'hui**, compact sur iPhone, extensible par widgets, sans supprimer la capture intelligente existante.

## Modules Pulse (0.18)

| ID widget | Contenu | Source réelle |
|---|---|---|
| `today` | RDV restants du jour et rappels urgents / en retard | `data.events` et `data.tasks` |
| `weather` | Température, ressenti, météo, max/min, probabilité de pluie | Open-Meteo, client uniquement |
| `budget` | Dépenses du mois, plafond restant et échéances prévues | `monthTotals()`, `data.limits`, `NexusBudget.forecast()` |
| `focus` | Projet actif le plus récemment modifié, barre de tâches | `data.projects` et `data.tasks` |
| `links` | Nombre de propositions en attente et apps jumelées | `data.linkInbox`, `data.linkConnections` |
| `recent` | Notes, projets, achats récemment modifiés | Collections locales |

- Les widgets sont activables, désactivables et réordonnables via **Réglages → Accueil personnalisé** ; `HOME_WIDGETS` reste le registre du menu existant.
- Les choix existants sont conservés dans `localStorage['nexus_interface_v07']`. Une migration locale non destructive via `pulseVersion:18` active la météo après le widget `today` et ajoute le bloc `links`, sans toucher à l'ordre et aux masquages précédents ; les nouveaux widgets peuvent ensuite être masqués.
- `NexusPulse.view(UI.widgets)` est appelé au début de `homeView()`. L'ancienne implémentation d'accueil est conservée comme fallback si le module n'est pas chargé.
- L'ancien `quick-capture` et `data-action='quick-save'` restent inchangés : toujours **une note puis suggestions**, jamais un RDV ou une transaction silencieuse.
- Petits raccourcis RDV, Rappel, Achat et Dépense déjà reliés aux formulaires existants ; les raccourcis n'enregistrent rien sans confirmation.
- La navigation cinq emplacements et les données sont intactes. Pas de nouvelle base persistante.

## Météo (Open-Meteo)

- API : `https://api.open-meteo.com/v1/forecast` avec `latitude`, `longitude`, `current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m`, `daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max`, `timezone=auto`, `forecast_days=2`.
- Recherche de ville : `https://geocoding-api.open-meteo.com/v1/search?name=...&count=6&language=fr`, choix explicite dans les suggestions.
- Ville initiale de ce projet personnel : **Lille** (météo régionale). Modification via **Météo → Modifier la ville**, ou **Ma position** après clic et autorisation iOS.
- La localisation GPS n'est **jamais demandée automatiquement**. Si l'utilisateur la choisit, les coordonnées envoyées à l'API sont arrondies à 2 décimales pour éviter une précision au mètre ; les données sont toujours révélatrices d'une zone géographique approximative.
- `localStorage['nexus_pulse_weather_v018']` pour la ville/position choisie, `localStorage['nexus_pulse_forecast_v018']` pour les réponses mises en cache. Cache frais ~45 minutes ; dernier cache utilisé jusqu'à 24 h si déconnexion. Pas de synchro dans le coffre ni de stockage de coordonnées dans GitHub.
- Les requêtes météo partent directement du navigateur vers Open-Meteo, **sans passer par le Worker NEXUS**. La CSP de `index.html` autorise seulement les deux domaines nécessaires en plus du Worker existant.
- Toujours afficher l'attribution **Open-Meteo** avec lien. Service gratuit pour usage personnel/non commercial sous les conditions du fournisseur ; surveiller les conditions avant une diffusion commerciale.
- Si l'API échoue : carte d'indisponibilité ou dernière météo enregistrée, aucune fausse valeur.

Sources : [Documentation prévisions Open-Meteo](https://open-meteo.com/en/docs) et [Géocodage](https://open-meteo.com/en/docs/geocoding-api).

## Fichiers et raccordement

- `pulse-v018.js` : calcul des priorités, templates des widgets, client météo, choix de ville/position, mise à jour des éléments météo sans rerender complet.
- `pulse-v018.css` : layout responsive isolé par `.nx-pulse` / `.nxp-*` ; une seule colonne iPhone, deux colonnes grand écran, bloc `today` pleine largeur sur desktop.
- `app.js` : tableau `HOME_WIDGETS`, migration préférences, délégation accueil/actions, attachement de l'adaptateur Pulse ; **pas de modification des données métier**.
- `index.html` : CSS/script de Pulse, CSP météo, version affichée V0.18.0.
- `sw.js` : cache `nexus-v0.18.0` et assets versionnés `?v=0180`.
- `tests/contacts-budget.test.cjs` : syntaxe, ancien annuaire et Pulse.

## Périmètre volontairement non réalisé

- Aucun widget Vestiaire avec recommandation automatique : le contrat de contexte n'est pas encore défini.
- Aucun achat Gaming directement comptabilisé : **les propositions actuellement importées exigent encore une validation**, avant de devenir une transaction réelle. La V0.19 devra éviter les doublons via `originLink` / identifiant source et gérer les corrections / annulations.
- Aucun moteur de commande universel ni parsing IA supplémentaire.
- Aucun widget professionnel et aucune synchronisation de données de travail.
- Aucune géolocalisation en arrière-plan, ni notification météo automatique.

## Recette manuelle iPhone (à faire par l'utilisateur)

1. Ouvrir NEXUS **V0.18.0**, vérifier que l'accueil Pulse remplace l'ancien, sans perte de navigation.
2. Vérifier Capture éclair : saisir une phrase puis Capturer et retrouver la note créée, sans RDV/dépense involontaire.
3. Avec un rendez-vous aujourd'hui et une tâche en retard, vérifier le tri et la navigation vers leurs fiches.
4. Réglages → Accueil personnalisé : masquer / remonter / réactiver widgets, fermer puis rouvrir la PWA.
5. Météo : vérifier l'affichage initial Lille, changer de ville par recherche, puis actualiser ; mode avion = dernier cache ou message explicite.
6. Ma position : contrôler le **consentement iOS**, puis la ville affichée, sans requête automatique avant le clic.
7. Widget budget : ne jamais appeler « solde bancaire » le montant dépenses/plafond ; comparer avec le Journal.
8. Widget Applications liées : compteurs cohérents avec Gaming/Rituel, ouvrir une proposition puis refuser/valider sans doublon.
9. Vérifier le rendu à 320–430 px de largeur, pas de scrollbar horizontale, clavier stable pour Capture.
10. Après mise à jour, vérifier que le service worker charge les assets `0180`; ne **jamais désinstaller** la PWA pour forcer la mise à jour.

## Critères de sortie

- GitHub Actions `NEXUS JavaScript checks` réussi.
- GitHub Pages déployé sur `main`.
- Test réel iPhone encore nécessaire ; ne pas confondre CI serveur et validation utilisateur.
