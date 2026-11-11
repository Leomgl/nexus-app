# NEXUS V0.21.4 — Réglages organisés (11 novembre 2026)

## Objectif et état

Refonte de l'écran Réglages **sans changer les données métier ni les permissions**. Les anciennes sections empilées deviennent une page d'accueil compacte, avec recherche instantanée (insensible aux accents) et sous-pages dédiées. Code déposé sur main ; validation visuelle et comportement iPhone réel à effectuer.

### Navigation

Six entrées principales :
1. Apparence et interface : barre de navigation (slots), thèmes, densité, widgets Pulse et réinitialisation de l'interface uniquement.
2. Notifications : réglage Web Push iPhone existant, types Agenda/Rappels/Budget, renvoi au détail des récurrences Budget pour J-7/J-2/J0.
3. Applications connectées : Gaming, Rituel, Vestiaire et emplacement futur Santé. Détails par application et écran distinct Connect 2.0.
4. Sécurité et confidentialité : Face ID/passkeys et clarification sur l'absence de chiffrement IndexedDB local.
5. Données et sauvegardes : coffre distant, export JSON, import, corbeille ; sous-page séparée pour les réinitialisations sensibles.
6. À propos : version actuelle, vérification de mise à jour PWA.

**État des apps** : seul l'existence d'un jumelage local linkConnections est utilisée pour afficher « Jumelé » ; aucune connexion Santé n'est prétendue active. Le jumelage voyage Rituel est séparé du jumelage principal. Aucun secret, code d'invitation ou donnée personnelle n'est affiché sur la page d'accueil.

**Recherche** : filtrage côté appareil, sans réseau ni index des données métier. Résultats statiques de configuration, navigation locale uniquement. Exemples : « salaire », « sécurité », « Face ID », « export », « voyage ».

## Fichiers

- **settings-v0214.js** : composant léger d'interface, sous-pages et recherche, état de navigation en mémoire.
- **settings-v0214.css** : styles compacts, adaptatifs iPhone et desktop.
- **app.js** : délégation de settingsView, actions settings-*, écoute de recherche, version UI NEXUS_VERSION=0.21.4. L'ancien rendu legacySettingsView() subsiste en fallback technique et n'est pas utilisé lorsque le module est chargé.
- **connections.js** : settingsCard(appId) peut filtrer une seule application ; comportement de jumelage inchangé.
- **index.html** et **sw.js** : URLs versionnées et précache complet ; indicateur de version de l'interface alimenté depuis app.js.
- **tests/settings-v0214.test.cjs** : routes, recherche insensible aux accents, actions historiques, cache offline, statut des apps et UI inchangée.
- **tests/contacts-budget.test.cjs** : assertions de version/cache alignées sur V0.21.4.

Les modules cloud.js, passkey-client.js, push-client.js, budget-v08.js, connect-v019.js, les Workers Cloudflare et la base IndexedDB **n'ont pas été modifiés**.

## Principes de compatibilité

- Les événements des contrôles existants conservent **exactement les mêmes attributs** data-action, data-pref-slot, data-pref-option, data-widget, data-connect2-pref.
- Aucune migration de nexus-v0-1, nexus_interface_v07, du coffre ou des connexions LINK.
- Les sous-pages ne lisent que l'état de connexions nécessaire à l'affichage. Les cartes existantes gèrent toujours leurs permissions et leur propre sauvegarde.
- Ne pas désinstaller la PWA pour mettre à jour ! Cela pourrait supprimer IndexedDB et la souscription push.

## Recette manuelle iPhone

1. Ouvrir la PWA existante puis **À propos de Nexus** : V0.21.4. Si nécessaire, « Vérifier les mises à jour » ; ne pas supprimer l'icône.
2. Vérifier la page Réglages (six rubriques, pas de panneaux entassés, haut et bas protégés des zones iOS).
3. Chercher « salaire » puis « securite » ; vérifier la navigation et le bouton Retour. Réouvrir Réglages via la barre du bas : on revient à l'accueil des réglages.
4. Apparence : changer le thème, la densité, un slot et l'ordre d'un widget ; fermer et rouvrir sans perte de préférences.
5. Notifications : ouvrir le panneau push existant, vérifier Budget et mode détails ; aucune nouvelle souscription forcée.
6. Apps : comparer Gaming/Rituel/Vestiaire aux jumelages réels. Modifier l'option Connect 2.0 existante, vérifier Voyage → Rituel, ouvrir Vestiaire et revenir sans perte de codes/permissions. Santé doit apparaître comme **à venir**.
7. Sécurité : ouvrir les options passkeys ; conserver la session existante.
8. Données : vérifier l'accès au coffre, à l'export et la corbeille. **Ne pas effectuer de restauration ou de suppression réelle pour ce test** sauf sauvegarde vérifiée au préalable.
9. Mode avion : rouvrir Réglages déjà mis en cache ; vérifier que l'interface reste disponible.
10. Parcourir Pulse, Budget, Contacts et Agenda ; confirmer l'absence de régression.

## Sécurité / limites

L'application est hébergée en PWA sur GitHub Pages, domaine partagé avec d'autres apps. Le stockage IndexedDB local **n'est pas chiffré** ; ce chantier n'y change rien. Le coffre utilise le chiffrement côté client. Le contrôle d'identité UI ne transforme pas la base locale en coffre chiffré.

Les tests automatisés statiques et la compilation syntaxique ne garantissent ni le rendu Safari iOS, ni la délivrance réelle des push, ni le fonctionnement d'un Worker Cloudflare. Aucune affirmation de recette physique tant que l'utilisateur n'a pas confirmé.

## Reprise future

Lire docs/PROJECT-HANDOFF.md, puis ce fichier. Garder settings-v0214.js comme routeur des Réglages. Pour une nouvelle app, ajouter une entrée au centre Applications connectées **seulement lorsqu'elle existe réellement**, avec contrôles de consentement explicites. Ne pas ressusciter un panneau global qui allongerait la page d'accueil des Réglages.
