# NEXUS · REPRISE PROJET / NOTES POUR LES PROCHAINS THREADS

> **LIRE CE FICHIER EN PREMIER EN NOUVEAU THREAD.** Mis à jour le 11 novembre 2026.
> Dépôt : https://github.com/Leomgl/nexus-app
> PWA : https://leomgl.github.io/nexus-app/
> Branche de production : `main`
> Version du code : **V0.19.0 Connect 2.0**, sous réserve des vérifications de publication et des tests réels sur iPhone.

## Vision confirmée avec l'utilisateur

**NEXUS est le cœur / cockpit. Les autres apps sont des spécialisations.**

- Une fonctionnalité reste dans NEXUS si elle est compacte, utile à l'organisation quotidienne et bénéficie des objets relationnels existants.
- Une nouvelle app se justifie lorsqu'un domaine devient trop dense (Gaming = saisons/passes/bibliothèque, Rituel = produits/stock/routines, Vestiaire = dressing/tenues).
- NEXUS doit recevoir les **faits et propositions importants** de ces apps, pas leur inventaire complet ni un doublon de leur moteur.
- Expérience d'accueil rapide et compacte, moderne, personnalisable ; possibilité d'ajouter à l'avenir des widgets, événements, accessoires et raccourcis.
- Rester **PWA iOS sans App Store ni signature hebdomadaire**, GitHub Pages + Cloudflare Free, zéro dépendance payante imposée.
- Respecter l'autorisation utilisateur : aucune dépense ou RDV créé automatiquement sur la seule base d'une proposition en attente non validée.
- Ton travail de développement doit rester **documenté dans GitHub** pour reprise entre conversations, sans secrets ni données personnelles.

## État réel des fonctionnalités à la livraison

**NEXUS (core)** : notes, agenda, rappels et push, contacts importés depuis vCard (fiches compactes, photos/tags/favoris, recherche A–Z, reimport contrôlé), projets, achats, Journal budget et prévisions, corbeille, capture locale, navigation et widgets personnalisables.

**NEXUS LINK existant** : Gaming et Rituel envoient des propositions vers la boîte `data.linkInbox`. Revue humaine, rejet/acceptation, champs `originApp` et `originLink` conservés. Ne pas présenter l'interop comme entièrement automatique : c'est le prochain chantier.

**Connect V0.19.0** : nouveau `connect-v019.js`, réception des messages LINK lors des ouvertures de NEXUS et du retour au premier plan (configurable), inscriptions budgétaires automatiques **désactivées par défaut** et autorisables séparément pour Gaming (`pass_paid`) et Rituel (`product_paid`), identifiant stable `originApp + originSourceId` et vérification IndexedDB avant confirmation. Gaming a un champ **date réelle d'achat** distinct de la fin de saison. Une révision d'une opération existante ne modifie jamais le Journal silencieusement. Voir [CONNECT-V019.md](CONNECT-V019.md).

**Pulse V0.18.0** : nouveau `pulse-v018.js` et `pulse-v018.css`, priorités du jour, météo Open-Meteo, budget du mois, projet, propositions inter-app et activité récente. Widgets contrôlés par `UI.widgets` dans `app.js`. Voir [PULSE-V018.md](PULSE-V018.md).

**Rituel/Gaming/Vestiaire** : dépôts séparés, architecture et versions à relire dans GitHub au moment d'un prochain chantier transversal ; ne pas inventer d'API ou d'échanges déjà déployés. Le connecteur Vestiaire→NEXUS est à définir, pas à déclarer terminé.

## Contrats architecturaux non négociables

1. **Données métier NEXUS** : `data` dans `app.js`, persistance IndexedDB `nexus-v0-1`, copie locale fallback `nexus_local_fallback_v1`. Conserver les IDs et relations. `assignData()` ne migre que les collections connues ; ajouter une collection exige une migration/sauvegarde testées.
2. **Préférences appareil** : `localStorage['nexus_interface_v07']`, y compris `UI.widgets`, thème, densité, deux raccourcis et `pulseVersion`. Pulse météo stocke sa ville et son cache dans des clés locales distinctes.
3. **Budget** : montants en **centimes entiers** ; les achats prévus ne comptent pas dans le Journal. Les achats marqués « achetés » créent déjà une dépense liée `purchaseId` si le prix est renseigné et sans doublon. Corriger les écriture historiques depuis le Journal, pas en effaçant une source.
4. **Import apps** : projets, objets et transactions dérivés doivent porter `originApp` et `originLink` (incluant `pairId`, `sourceKey`, `revision`), être idempotents et révocables avec une politique explicite. Une app ne modifie pas directement les collections privées d'une autre app.
5. **Sécurité** : données IndexedDB locales **non chiffrées**, export JSON en clair. Le coffre Cloudflare chiffre les snapshots côté client AES-256-GCM, mais l'origine `leomgl.github.io` est commune à plusieurs PWAs : cette isolation insuffisante reste une dette importante. Une passkey protège l'UI mais ne chiffre pas IndexedDB. Ne pas exposer d'identifiants/clefs/secrets dans GitHub.
6. **Worker** : le backend Cloudflare n'est **pas automatiquement déployé** depuis GitHub ; une modification backend ne signifie pas qu'elle est en prod. Toujours vérifier les deux plans séparément.
7. **Notifications** : génériques, autorisation préalable, jamais les noms/notes de contacts sur écran verrouillé. Garder une dégradation locale hors ligne.
8. **Qualité** : incrémenter version affichée + `sw.js` cache + querystring assets + tests CI. iPhone PWA doit être validé en vrai, sans désinstaller l'app (risque de perdre IndexedDB).

## Roadmap priorisée (validée avec utilisateur)

### V0.18 — Pulse + météo : EN COURS DE RECETTE
- Accueil réorganisé pour ce qui compte **aujourd'hui**.
- Widgets extensibles et réordonnables, météo locale avec ville/GPS facultatif.
- Maintien de la capture éclair existante, comportement local et confirmation.
- Tests GitHub/Pages, puis contrôle réel iPhone demandé.
- **Prochain checkpoint** : retour utilisateur sur visuel, fonctionnement météo, navigation des cartes, dimensions et ordre des widgets.

### V0.19 — Connect 2.0 : CODE LIVRÉ, RECETTE MULTI-APPS À FAIRE
- Le protocole LINK, ses scopes et l'origine des données ont été relus. La réception de propositions Gaming/Rituel a été automatisée lorsque NEXUS est ouverte. Option d'inscription automatique des achats réels avec autorisation dédiée et stockage vérifié.
- **Gaming → NEXUS** : un pass acheté avec prix et date réelle peut créer automatiquement **une seule** dépense si l'utilisateur autorise `autoGaming`. Correction de prix/date → **validation manuelle**. Restent à développer : signal d'annulation et audit de réconciliation.
- **Rituel → NEXUS** : achat explicitement enregistré avec prix/date réelle peut rejoindre le budget avec permission `autoRituel`. Les réassorts estimés et rappels restent des propositions manuelles ; le stock conserve RITUEL comme source.
- **Vestiaire → NEXUS** : contrat de contexte d'événement et suggestion de tenue sans répliquer l'inventaire ; confidentialité, accès révoquable, confirmation.
- Propositions et transactions gardent leur `sourceId` et leur `originLink`; pas de transfert automatique de tout le stock ou de la bibliothèque. **Recette réelle** : source Cloudflare Gaming/Rituel, iPhone NEXUS, vérification absence de doublon et rejumelage.

### V0.20 — Budget enrichi : À CONSTRUIRE
- Vues claire **Quotidien / Engagements / Objectifs**.
- Abonnements, prêts, mensualités, échéances, reste à payer et projection.
- Réconcilier transactions importées d'autres apps avec `originLink` et achats NEXUS.
- Ne jamais présenter la projection comme un solde bancaire réel.

### V0.21 — Suggestions contextualisées : À CONSTRUIRE
- RDV « restaurant ce soir » + météo / contexte → suggestion(s) de tenue issues de Vestiaire, dans Pulse, avec permissions explicites et choix utilisateur.
- Modèle de suggestion sans création d'événement/achat automatique.

### V0.22 — Command Center : À CONSTRUIRE
- Recherche transversale noms/notes/projets/contacts/budget + capture contextuelle plus rapide.
- Optimisation locale gratuite, pas de service IA payant obligatoire.

### Plus tard — Bloc professionnel
- **Décision non prise** : module NEXUS compact (tâches/échéances) ou PWA spécialisée (BAT, workflows de fichiers, stats et production), puis résumés choisis vers NEXUS.
- Ne pas mélanger les données pro et perso automatiquement.

## Comment reprendre le développement efficacement

1. Lire ce fichier et le README du dépôt, puis les documents de version récents.
2. Lire les **fichiers actuels de `main`**, ne pas partir d'un ancien extrait de chat.
3. Vérifier Actions GitHub et version effectivement déployée sur GitHub Pages.
4. Pour Nexus app : `app.js` = routeur, prefs, objets ; `pulse-v018.js/css` = accueil ; **`connect-v019.js`** = réception automatique et import d'achats réels ; `connections.js`, `link-import.js`, `rituel-import.js` = jumelage et propositions ; `budget-v08.js` = Journal enrichi.
5. Modifier de manière additive et tester sans altérer IndexedDB, clef de coffre, passkeys ou notifs.
6. Avant chaque release : tests, note de version, incrementation cache `sw.js` + assets `index.html`, puis vérifier sur iPhone.
7. Maintenir ce fichier à jour avec versions, décisions et état exact **livré / en tests / futur**. **Jamais de secrets ou de données réelles de contacts.**

## Points de vigilance actuels

- L'accueil se reconfigure via `UI.widgets` ; le fallback de l'ancienne version est encore présent dans `homeView()`, le conserver jusqu'à stabilisation sur iPhone.
- Open-Meteo reçoit une ville ou des coordonnées approximatives **seulement via la météo** ; l'utilisateur peut choisir une autre ville et son accès GPS n'est sollicité qu'après clic.
- V0.19 peut créer automatiquement des transactions réelles inter-app **uniquement si l'option correspondante est activée**, si les deux apps ont transmis un message chiffré valide et si la date d'achat/prix sont présents ; cela reste à vérifier sur vrais iPhone/Workers déployés. Les anciennes propositions sans date réelle demandent une validation manuelle.
- La synchronisation du coffre doit éviter les conflits entre appareils.
- Prochain retour de l'utilisateur : V0.19 visible dans NEXUS, champs date d'achat et envoi Gaming/RITUEL disponibles sur leurs origines Cloudflare, puis essai d'un pass payé (sans doublon) et d'un produit acheté Rituel. Ensuite V0.20 Budget.
