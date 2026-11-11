# NEXUS · REPRISE PROJET / NOTES POUR LES PROCHAINS THREADS

> **LIRE CE FICHIER EN PREMIER EN NOUVEAU THREAD.** Mis à jour le 11 novembre 2026.
> Dépôt : https://github.com/Leomgl/nexus-app
> PWA : https://leomgl.github.io/nexus-app/
> Branche de production : `main`
> Version du code : **V0.21.0 Vestiaire contextuel** (NEXUS), accompagnée de **VESTIAIRE V0.6**. Code GitHub, tests automatisés et mises à jour Cloudflare réussis le 11/11/2026 ; **test de bout en bout et affichage réel sur iPhone à confirmer**. L'utilisateur a validé V0.18 à V0.20.

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

**Budget V0.20.1** : trois sections principales **Quotidien / Engagements / Objectifs**. Le module `budget-v08.js` conserve les calculs historiques du journal, des récurrences et des statistiques. `budget-v020.js` affiche abonnements, prêts et objectifs d'épargne ; `budget-v020.css` conserve un rendu compact iPhone. Les abonnements/prêts sont **des règles `data.recurrences[]` typées**, sans duplication de prévisions. Conversion possible d'une règle existante avec le même identifiant. Les objectifs sont dans `data.savingsGoals[]` (somme initiale, mouvements manuels, progression, projet), inclus dans sauvegardes et corbeille. Une contribution d'épargne ne modifie pas `transactions[]`. Restes de prêt = **mensualités théoriques non confirmées**, pas capital restant dû. Voir [BUDGET-V020.md](BUDGET-V020.md).

**Connect V0.19.1** : nouveau `connect-v019.js`, réception des messages LINK lors des ouvertures de NEXUS et du retour au premier plan (configurable), inscriptions budgétaires automatiques **désactivées par défaut** et autorisables séparément pour Gaming (`pass_paid`) et Rituel (`product_paid`), identifiant stable `originApp + originSourceId` et vérification IndexedDB avant confirmation. Gaming a un champ **date réelle d'achat** distinct de la fin de saison. Une révision d'une opération existante ne modifie jamais le Journal silencieusement. Voir [CONNECT-V019.md](CONNECT-V019.md).

**Pulse V0.18.0** : nouveau `pulse-v018.js` et `pulse-v018.css`, priorités du jour, météo Open-Meteo, budget du mois, projet, propositions inter-app et activité récente. Widgets contrôlés par `UI.widgets` dans `app.js`. Voir [PULSE-V018.md](PULSE-V018.md).

**Vestiaire V0.6 / NEXUS V0.21** : connexion dédiée `vestiaire → nexus` utilisant le scope LINK `outfit_catalog`, transfert chiffré **uniquement de résumés de tenues** (nom, ID, occasion, style, disponibilité, chaleur), sans photos, vêtements détaillés, mannequin ou agenda. Jumelage et envoi **explicitement autorisés**, auto-envoi désactivé par défaut. NEXUS affiche jusqu'à trois propositions dans Pulse selon le prochain RDV éligible (72 h), la météo Pulse en cache et les tenues disponibles ; choix local associé à l'événement, **sans changement du planning VESTIAIRE**. Nouveau `vestiaire-v021.js/css`, `vestiaireCatalogs[]`, `vestiaireSelections[]`, widget `outfit`. Backend NEXUS et LINK + Worker d'hébergement Vestiaire mis à jour en conservant les bindings. Consulter [VESTIAIRE-V021.md](VESTIAIRE-V021.md). Tests automatisés réussis, mais recette iPhone inter-PWA toujours nécessaire.

**Rituel/Gaming** : dépôts séparés, ne pas inventer de flux au-delà de leurs contrats Connect 2.0 existants.

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

### V0.18 — Pulse + météo : VALIDÉ PAR L'UTILISATEUR
- Accueil réorganisé pour ce qui compte **aujourd'hui**.
- Widgets extensibles et réordonnables, météo locale avec ville/GPS facultatif.
- Maintien de la capture éclair existante, comportement local et confirmation.
- Tests GitHub/Pages, puis contrôle réel iPhone demandé.
- **Prochain checkpoint** : retour utilisateur sur visuel, fonctionnement météo, navigation des cartes, dimensions et ordre des widgets.

### V0.19 — Connect 2.0 : VALIDÉ PAR L'UTILISATEUR SUR IPHONE
- Le protocole LINK, ses scopes et l'origine des données ont été relus. La réception de propositions Gaming/Rituel a été automatisée lorsque NEXUS est ouverte. Option d'inscription automatique des achats réels avec autorisation dédiée et stockage vérifié.
- **Gaming → NEXUS** : un pass acheté avec prix et date réelle peut créer automatiquement **une seule** dépense si l'utilisateur autorise `autoGaming`. Correction de prix/date → **validation manuelle**. Restent à développer : signal d'annulation et audit de réconciliation.
- **Rituel → NEXUS** : achat explicitement enregistré avec prix/date réelle peut rejoindre le budget avec permission `autoRituel`. Les réassorts estimés et rappels restent des propositions manuelles ; le stock conserve RITUEL comme source.
- **Vestiaire → NEXUS** : contrat de contexte d'événement et suggestion de tenue sans répliquer l'inventaire ; confidentialité, accès révoquable, confirmation.
- Propositions et transactions gardent leur `sourceId` et leur `originLink`; pas de transfert automatique de tout le stock ou de la bibliothèque. **Recette réelle** : source Cloudflare Gaming/Rituel, iPhone NEXUS, vérification absence de doublon et rejumelage.

### V0.20 — Budget enrichi : CODE PUBLIÉ, RECETTE IPHONE À FAIRE
- Vues **Quotidien / Engagements / Objectifs** intégrées, Journal et statistiques historiques conservés.
- Abonnements mensuels et annuels, prêts à mensualités fixes avec début/durée/fin et calendrier ; conversion de récurrences existantes sans duplication.
- Objectifs d'épargne manuels avec versements/retraits datés, cible, date, progression, projet associé, historique et corbeille.
- `savingsGoals[]` ajouté au modèle et aux exports/restaurations NEXUS ; projet d'épargne séparé de `transactions[]` pour éviter les doubles dépenses.
- **Attention** : une mensualité non confirmée n'est pas forcément impayée ; un capital restant dû ne peut pas être déduit de la simple mensualité sans intérêts et amortissement.
- Recette attendue : 1 abonnement existant reclassé, 1 échéance confirmée, 1 objectif créé puis restauré, aucun impact sur les chiffres Journal et sauvegardes.
- Prochain travail après validation : V0.21 Vestiaire contextuel.

### V0.21 — Vestiaire contextualisé : CODE LIVRÉ, RECETTE IPHONE À FAIRE
- NEXUS affiche un widget **Tenue du jour** dans Pulse et un bloc Tenue prévue dans les fiches RDV.
- Jumelage chiffré NEXUS LINK à scope dédié `outfit_catalog` ; Vestiaire envoie au plus 24 résumés de looks, sans photo ni détail privé, après accord.
- Suggestions locales selon contexte restaurant / travail / soirée / sortie / sport / voyage, disponibilité et météo Pulse déjà choisie ; **3 propositions maximum**.
- Sélection/révocation locales avec vérification de persistance. Pas d'écriture dans le dressing ou planning Vestiaire, pas de nouvelle dépense.
- VESTIAIRE V0.6 avec lien vers un look précis, bouton Envoi manuel et option envoi auto uniquement quand l'application est ouverte. NEXUS reçoit quand ouvert/visible.
- Trois Workers Cloudflare modifiés via API (LINK relay, NEXUS gateway, Vestiaire static PWA), bindings et secrets hérités/confirmés. Code de la couche Worker dans GitHub, pas de migration D1.
- **Tests :** NEXUS GitHub Actions + GitHub Pages réussis, Vestiaire tests GitHub réussis avant le dernier correctif documentaire. À revérifier à la toute dernière révision.
- **Recette requise :** test réel jumelage NEXUS/Vestiaire sur iPhone, partage sans photos, réception, suggestion sur RDV « restaurant ce soir », choix et retour arrière, et stabilité des liens Gaming/Rituel. Détails : [VESTIAIRE-V021.md](VESTIAIRE-V021.md).

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
4. Pour NEXUS : `app.js` = routeur, prefs, objets et adaptateurs ; `pulse-v018.js/css` = accueil et insertion de widget ; `vestiaire-v021.js/css` = tenues contextuelles ; `link-core.js` = chiffrement/jumelage ; `connect-v019.js`, `connections.js`, `link-import.js`, `rituel-import.js` = connexions Gaming/Rituel ; `nexus-travel.js` = trajet Rituel ; `budget-v08.js` + `budget-v020.js/css` = budget. Pour VESTIAIRE : `app.js`, `vestiaire-nexus-v06.js/css`, `nexus-link-core.js`, `edge-web/worker.js`.
5. Modifier de manière additive et tester sans altérer IndexedDB, clef de coffre, passkeys ou notifs.
6. Avant chaque release : tests, note de version, incrementation cache `sw.js` + assets `index.html`, puis vérifier sur iPhone.
7. Maintenir ce fichier à jour avec versions, décisions et état exact **livré / en tests / futur**. **Jamais de secrets ou de données réelles de contacts.**

## Points de vigilance actuels

- L'accueil se reconfigure via `UI.widgets` ; le fallback de l'ancienne version est encore présent dans `homeView()`, le conserver jusqu'à stabilisation sur iPhone.
- Open-Meteo reçoit une ville ou des coordonnées approximatives **seulement via la météo** ; l'utilisateur peut choisir une autre ville et son accès GPS n'est sollicité qu'après clic.
- V0.19 peut créer automatiquement des transactions réelles inter-app **uniquement si l'option correspondante est activée**, si les deux apps ont transmis un message chiffré valide et si la date d'achat/prix sont présents ; cela reste à vérifier sur vrais iPhone/Workers déployés. Les anciennes propositions sans date réelle demandent une validation manuelle.
- La synchronisation du coffre doit éviter les conflits entre appareils.
- Prochain retour de l'utilisateur : V0.20.1 visible et validé sur iPhone, bon rendu des trois espaces Budget, transformation sans doublon d'une récurrence et restauration d'un objectif. Une fois confirmé, ouvrir le chantier V0.21 Vestiaire → NEXUS.

**Hotfix V0.19.1 :** rollback intégral des écritures Connect après échec de vérification et mise à jour SW/cache ; la recette iPhone reste à faire. Les apps spécialisées ont des versions internes indépendantes.

## Attention : modifications simultanées entre threads (11 novembre 2026)

Un autre thread a fait évoluer le pont NEXUS ↔ Rituel (notamment `nexus-travel.js`, `connections.js` et leurs scripts versionnés) en même temps que V0.20. Les mises à jour de Budget ont été isolées dans `budget-v020.js/css` et l'écran Budget historique. Toujours **relire la dernière branche `main`** avant d'écrire, pour préserver les modifications de l'autre thread et aligner l'index, le Service Worker et la version affichée. Les tests CI vérifient désormais que chaque script/style de `index.html` figure dans le cache offline.

## Journal du 11/11/2026 — Passage V0.21

- Vision produit : NEXUS centre, Vestiaire spécialiste ; jamais de copie de dressing complète ou d'images. Le calendrier, les notes privées et la météo ne quittent pas NEXUS vers Vestiaire.
- Mise à jour des sources GitHub de NEXUS, Vestiaire et des Workers Cloudflare avec consentement et scopes distincts.
- Cloudflare déployé via script upload avec héritage strict et vérification des ressources, sans changer DB ni secrets : `nexus-app-api`, `nexus-link-api`, `vestiaire-app`. Attention : un push Github sur `backend/` ne déploie toujours pas les Workers à lui seul.
- 0.21 ne prétend pas synchroniser en temps réel lorsque les PWA sont fermées. Aucun Web Push supplémentaire.
- À la première reprise : récupérer `main` à jour, lire [VESTIAIRE-V021.md](VESTIAIRE-V021.md), vérifier CI des deux dépôts, version servie sur les PWA, puis faire recette iPhone. Ne pas supprimer les PWA ou leur IndexedDB.
- Sécurité : l'invitation LINK et les préférences Vestiaire contenant la graine de jumelage sont incluses dans des sauvegardes `.vestiaire` en clair ; conserver ces exports hors de portée de tiers. Les données IndexedDB NEXUS restent non chiffrées au repos.
