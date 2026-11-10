# NEXUS V0.7 — Spécification et livraison UX

## Intention

> NEXUS doit être un centre de pilotage personnel : capture, gestion, organisation, centralisation et mémoire. Chaque bloc possède ses fonctionnalités, mais les relations entre blocs sont explicites.

## Navigation (mobile + desktop)

| Emplacement | Destination | Personnalisation |
|---|---|---|
| 1 | Accueil | Fixe |
| 2 | Catégories | Fixe |
| 3 | Raccourci 1 : Projets | Choix parmi 7 modules |
| 4 | Raccourci 2 : Budget | Choix parmi 7 modules |
| 5 | Réglages | Fixe |

Les raccourcis utilisent les `data-nav` `slot1`/`slot2`, résolus au moment du clic. Leur icône et libellé se mettent à jour sans réinstaller la PWA. La navigation active souligne le slot lorsque sa destination est affichée. Si un module sans raccourci est ouvert, l'onglet Catégories reste actif.

## Accueil : ce qui exige mon attention

- Carte de bienvenue contextualisée au jour, compteurs de rendez-vous, tâches prioritaires et projets actifs.
- **Capture rapide** : textarea → note locale → fiche note → suggestions explicites. Contrôle : rien n'est automatiquement converti en RDV / opération budgétaire.
- Actions rapides : RDV, tâche, achat, dépense.
- Widgets réordonnables : Aujourd'hui / Projet en focus / Budget / Activité récente.
- Contrôles de personnalisation en pied de page.

Les widgets sont constitués à partir des données déjà disponibles en mémoire locale, sans nouvel appel réseau.

## Catégories : bibliothèque des blocs

Trois groupes : CAPTURER & PLANIFIER (Notes, Agenda, Rappels) ; ORGANISER & RELIER (Projets, Personnes) ; SUIVRE & PILOTER (Achats, Budget).

Chaque carte a un pictogramme, une description et un indicateur provenant des données utilisateur locales. Les modules conservent leurs fonctionnalités V0.6. Le fil d'Ariane « Catégories / module » permet d'en sortir. « Slot 1 / Slot 2 » permet de l'épingler.

## Réglages : une page, pas un panneau fourre-tout

- Navigation : deux `select` personnalisables, prévention des doublons avec échange.
- Apparence : palette Sauge / Ardoise ; densité Confortable / Compacte. Les deux palettes sont **claires** : le mode sombre n'est pas présenté comme implémenté.
- Accueil : affichage et classement des quatre widgets.
- Notifications : accès au module Web Push existant (pas de changement serveur).
- Sécurité : Face ID / Passkey, coffre et synchro.
- Données : export/import JSON et suppression locale sous confirmation.

## Persistance et données

- **Aucune migration** de la base IndexedDB principale.
- Préférences UI : `localStorage` avec clé `nexus_interface_v07`, validées et normalisées au chargement.
- Deux raccourcis distincts ; clés inconnues ignorées ; thème/densité inconnus ramenés aux valeurs par défaut ; widgets dédupliqués.
- Réinitialiser l'interface ne touche **ni aux notes, ni au coffre, ni aux notifications**.
- Les réglages d'interface ne suivent pas le coffre cloud (choix explicite en V0.7 : préférences propres à l'appareil).

## Validation

Tests exécutés sur une copie des scripts récupérés du dépôt :
- Syntaxe JS : tous les scripts métiers valides.
- Navigation : les cinq boutons existent en double (desktop et mobile).
- Rendu sans données et avec données de démonstration : accueils, catégories et réglages.
- Raccourcis : valeur par défaut, personnalisation, échange en cas de doublon, persistance.
- Widgets : ordre personnalisé persistant.
- Cohérence : les clients Cloudflare push, coffre et passkeys n'ont pas été modifiés.
- Service worker : cache `nexus-v0.7.0`.

**Limites des tests** : pas de validation de rendu réelle sur Safari iPhone dans l'environnement connecté. À vérifier sur l'appareil avant d'en faire une version stable.

## Prochaines pistes

Système de liens transversaux plus visible, centre de recherche global, activité filtrée, widgets prioritaires sélectionnables, mode sombre avec audit des contrastes, personnalisation par glisser-déposer. Ne pas confondre ces pistes avec des fonctions déjà livrées.
