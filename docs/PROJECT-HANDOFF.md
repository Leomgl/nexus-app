## ACTU — NEXUS V0.21.9, résumé Santé hydratation (12/11/2026)
- Reprise de la branche main contenant Vestiaire V0.21.8 ; ajout de l'agrégat boissons (ml/eau/caféine) facultatif dans le widget Santé Pulse. Consentement demandé dans Santé, stockage reçu Nexus non chiffré, validDaily compatible ancien schéma, tests et cache mis à jour. Voir docs/SANTE-HYDRATATION-V0219.md. Recette iPhone requise.

# NEXUS · REPRISE PROJET / NOTES POUR LES PROCHAINS THREADS

> **LIRE CE FICHIER EN PREMIER EN NOUVEAU THREAD.** Mis à jour le 11 novembre 2026.
> Dépôt : https://github.com/Leomgl/nexus-app
> PWA : https://leomgl.github.io/nexus-app/
> Branche de production : `main`
> Version du code : **V0.21.5 Santé Connect** (incluant V0.21.3 Notifications contextuelles) (avec V0.21 Vestiaire contextuel) (NEXUS), accompagnée de **VESTIAIRE V0.6**. Code GitHub, tests automatisés et mises à jour Cloudflare réussis le 11/11/2026 ; **test de bout en bout et affichage réel sur iPhone à confirmer**. L'utilisateur a validé V0.18 à V0.20.

## Dernière livraison — NEXUS V0.21.5 Santé Connect (11/11/2026)

**À lire en premier avec les docs Santé** : dépôt privé Leomgl/sante-app, docs/PROJECT-HANDOFF.md, et NEXUS documents actuels. Définition fonctionnelle validée : **Nexus pilote rendez-vous, vaccins et notifications Agenda ; Santé possède le dossier clinique, les traitements et les notifications de prises.**

Nouveaux fichiers Nexus : sante-link-core.js, nexus-sante.js, nexus-sante.css. Modifiés : app.js (NEXUS_VERSION 0.21.5), pulse-v018.js (widget « health »), settings-v0214.js (panneau Santé), index.html (CSP + scripts), sw.js (cache nexus-v0.21.5), tests/sante-bridge-v0215.test.cjs.

**Connexion** : Worker indépendant sante-nexus-link, adresse https://sante-nexus-link.q9pfwtztsc.workers.dev, base D1 EU sante-nexus-link-db identifiant 5dc83559-bd23-437b-8e0b-b5bf0c5bfff3. Source dans Santé/backend/health-link-relay.mjs. Permissions dose_summary et health_calendar exclusivement, E2EE HKDF + AES-GCM, invitation privée NXS1. Son secret LINK_PEPPER Cloudflare est à préserver ; ne jamais toucher au relay original des autres apps.

**NEXUS DATA** : santeDaily[] et santeCalendars[] ajoutés sans effacer les autres champs ; linkConnections[] contient un pair sourceApp=sante. Ce contenu est conservé en local en clair par Nexus même si le transport E2EE est chiffré. Le consentement doit rester explicite. Les noms des traitements sont cachés par défaut dans les projections. Le widget Pulse n'affiche pas un suivi du jour périmé comme actuel : si la date est ancienne, il demande une actualisation.

**Agenda et notifications** : Santé transmet appointments/vaccine due dates ; Nexus les conserve temporairement en santeCalendars[] puis les ajoute à events[] sur import manuel ou autorisation d'import auto. Chaque événement importé reçoit originApp/originSourceId/sourceRevision et des champs syncedTitle/syncedStart/syncedLocation. Révisions et suppressions n'écrasent pas silencieusement les éditions manuelles de Nexus. Notifications Nexus déclenchées via reminderMinutes (RDV J−1 et H−1, vaccins J−7 et J−1) et seulement si les notifications iOS Nexus sont autorisées et les événements effectivement importés. Santé ne génère plus ces notifications. Les traitements sont confirmés exclusivement dans Santé et les prises sont un widget en lecture seule dans Nexus.

**Limites** : Flux disponible actuellement seulement **Santé → Nexus**. Ne pas annoncer « synchronisation bidirectionnelle complète ». Prochaine étape : éditer RDV/rappels depuis Nexus avec retour sécurisé dans Santé, arbitrage des conflits/anti-doublons. Ni publication automatique des modifications lorsque PWA fermée, ni test E2E sur iPhone confirmé.

**Recette iPhone avec données fictives** : Nexus → Réglages → Applications connectées → Santé → Créer / Copier code. Santé → ⚙ → Nexus LINK → Coller / Relier → Envoyer. Nexus → Recevoir, vérifier carte 1/2 et suivi des heures, puis importer RDV dans Agenda, tester notification Nexus, modification, absence de doublon, suspension du lien. Ne pas réinstaller/effacer les données pour actualiser la PWA.

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

**Revenus récurrents V0.21.2** : `budget-v08.js` et `budget-v020.js` proposent un mode automatique **opt-in par règle `type:'income'`** pour salaires et autres recettes régulières. Chaque règle conserve son ID et son échéancier, avec `autoBook:true` et `autoBookFrom` (date locale de consentement). Le démarrage NEXUS lance `startAutoIncome()` **après `loadData()`**, puis au retour au premier plan ; pas de garantie de traitement PWA fermée. Écritures `autoRecorded:true`, `incomeVerified:false` ; elles **comptent dans les recettes du Journal** comme revenu programmé mais NE PROUVENT PAS que l'argent est viré. Confirmation manuelle « Reçu » sans nouvelle somme. Même `recurrenceId+occurrenceKey` => pas de doublon ; une saisie manuelle non liée strictement équivalente bloque l'auto et demande vérification. Les périodes avant activation sont ignorées ; suppression auto ajoute un skip à l'occurrence, restauration l'annule. `app.js` relit la persistance, `recycle.js` protège les suppressions. **Voir [BUDGET-AUTO-INCOME-V0212.md](BUDGET-AUTO-INCOME-V0212.md)** et les tests. Vérification iPhone réelle encore nécessaire.

**Budget V0.20.1** : trois sections principales **Quotidien / Engagements / Objectifs**. Le module `budget-v08.js` conserve les calculs historiques du journal, des récurrences et des statistiques. `budget-v020.js` affiche abonnements, prêts et objectifs d'épargne ; `budget-v020.css` conserve un rendu compact iPhone. Les abonnements/prêts sont **des règles `data.recurrences[]` typées**, sans duplication de prévisions. Conversion possible d'une règle existante avec le même identifiant. Les objectifs sont dans `data.savingsGoals[]` (somme initiale, mouvements manuels, progression, projet), inclus dans sauvegardes et corbeille. Une contribution d'épargne ne modifie pas `transactions[]`. Restes de prêt = **mensualités théoriques non confirmées**, pas capital restant dû. Voir [BUDGET-V020.md](BUDGET-V020.md).

**Connect V0.19.1** : nouveau `connect-v019.js`, réception des messages LINK lors des ouvertures de NEXUS et du retour au premier plan (configurable), inscriptions budgétaires automatiques **désactivées par défaut** et autorisables séparément pour Gaming (`pass_paid`) et Rituel (`product_paid`), identifiant stable `originApp + originSourceId` et vérification IndexedDB avant confirmation. Gaming a un champ **date réelle d'achat** distinct de la fin de saison. Une révision d'une opération existante ne modifie jamais le Journal silencieusement. Voir [CONNECT-V019.md](CONNECT-V019.md).

**Pulse V0.18.0** : nouveau `pulse-v018.js` et `pulse-v018.css`, priorités du jour, météo Open-Meteo, budget du mois, projet, propositions inter-app et activité récente. Widgets contrôlés par `UI.widgets` dans `app.js`. Voir [PULSE-V018.md](PULSE-V018.md).

**Vestiaire V0.6 / NEXUS V0.21.1** : connexion dédiée `vestiaire → nexus` utilisant le scope LINK `outfit_catalog`, transfert chiffré **uniquement de résumés de tenues** (nom, ID, occasion, style, disponibilité, chaleur), sans photos, vêtements détaillés, mannequin ou agenda. Jumelage et envoi **explicitement autorisés**, auto-envoi désactivé par défaut. NEXUS affiche jusqu'à trois propositions dans Pulse selon le prochain RDV éligible (72 h), la météo Pulse en cache et les tenues disponibles ; choix local associé à l'événement, **sans changement du planning VESTIAIRE**. Nouveau `vestiaire-v021.js/css`, `vestiaireCatalogs[]`, `vestiaireSelections[]`, widget `outfit`. Backend NEXUS et LINK + Worker d'hébergement Vestiaire mis à jour en conservant les bindings. Consulter [VESTIAIRE-V021.md](VESTIAIRE-V021.md). Tests automatisés réussis, mais recette iPhone inter-PWA toujours nécessaire.

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

### Hotfix V0.21.1

- Lorsqu'une tenue est retirée depuis la fiche Agenda ouverte, la fiche est immédiatement rafraîchie pour ne plus afficher l'ancienne sélection.
- Numéro affiché et assets JS de NEXUS versionnés `0211`, Service Worker `nexus-v0.21.1` ; ne jamais désinstaller la PWA pour actualiser.
- [Issue recette réelle #5](https://github.com/Leomgl/nexus-app/issues/5) et [future V0.22 Command Center #6](https://github.com/Leomgl/nexus-app/issues/6).


### Incident de jumelage V0.21 — corrigé côté D1 le 11/11/2026

- Symptôme sur iPhone : bouton **Créer la connexion Vestiaire** → toast `Connexion impossible : PAIR_ALREADY_EXISTS` sans code généré.
- Cause **confirmée** : table SQL `connections` du relais LINK limitée aux sources `gaming` et `rituel` par `CHECK`. L'acceptation Vestiaire était uniquement dans le Worker ; le `catch` masquait toutes les erreurs D1 derrière `PAIR_ALREADY_EXISTS`.
- **Correction appliquée directement en production** : `bridge/migrations/0002_vestiaire.sql` migre le parent et ses événements enfants. Résultats : **3 connexions conservées, 40 événements chiffrés conservés, 0 anomalie FK**.
- Worker LINK redéployé en héritant `DB` et `LINK_PEPPER`, avec messages d'erreur justes : `PAIR_ALREADY_EXISTS` seulement pour conflit UUID, `PAIR_SAVE_FAILED` sinon.
- Les données et connexions Gaming/Rituel ont été préservées, aucun reset utilisateur. **Le test manuel de création du code sur iPhone doit encore être confirmé par l'utilisateur.**
- En cas de nouvelle erreur, vérifier en priorité `bridge/migrations`, CHECK SQL, `pairing_rate` (limite 10 tentatives/jour/IP), `nexus-link-api` et ses bindings. Ne jamais afficher/partager le code privé de jumelage dans un ticket GitHub ou ici.

### Correctif NEXUS V0.21.2 — salaires et revenus réguliers

- Code `main` et tests unitaires : opt-in par revenu dans Budget → Engagements ; dates de paie mensuelles/hebdomadaires/annuelles ; rattrapage au redémarrage ; stockage vérifié.
- **Par défaut, aucune automatisation :** l'utilisateur active l'option sur la fiche d'un revenu. Les anciennes périodes ne sont jamais écrites rétroactivement.
- **Surtout :** `incomeVerified:false` veut dire revenu attendu automatiquement inscrit, pas virement bancaire constaté. Le Journal propose « Confirmer reçu ». L'inscription automatique ne modifie pas les dépenses récurrentes ni les prêts.
- Tests à effectuer sur vrai iPhone : activer sur une échéance aujourd'hui, vérifier Journal, redémarrer sans doublon, confirmer reçu, supprimer/restaurer, tester une recette à venir et un revenu manuel existant.
- Le service worker et les URLs `index.html` passent à `0212` pour les assets modifiés ; **ne pas désinstaller** la PWA pour mettre à jour.
- Une autre conversation peut faire évoluer Vestiaire/Rituel parallèlement : toujours lire `main` avant toute modification d'`app.js`, `index.html`, `sw.js`.


### V0.21.3 — Ticket FORGE #5, notifications contextuelles / budget

- Nouveau `push-context-v0213.js` : `NexusBudget.occurrences()` utilisé pour préparer J-7/J-2/J0 (défaut J-2/J0, 9h), règles en pause/skips et mouvements déjà confirmés exclus. Les revenus auto non confirmés restent à vérifier, pas de débit réel déclenché.
- `push-client.js` transmet à Cloudflare **uniquement** `id,kind,fireAt`, et écrit localement une table `nexus_push_context_v1` dans la même IndexedDB. `sw.js` résout les détails sur l'iPhone via `tag=nexus-<prefix>`. Une nouvelle option `showDetails` OFF par défaut contrôle l'exposition sur écran verrouillé ; `budgetEnabled` autorise les échéances récurrentes. Pas de nouveaux secrets ni de migration D1 : budget utilise `kind:'task'` pour compatibilité de transport avec le CHECK SQL existant.
- Nouveau champ additif `recurrence.notifyDays`, optionnel. Édition de chaque règle Budget sans migration. Les anciennes règles utilisent virtuellement `[2,0]`, sans écriture préalable.
- `index.html`, `app.js`, `sw.js` et tests incrémentés à 0.21.3. **Vérifier l'arrivée effective des notifications PWA iOS et le rendu des détails en essai réel** ; l'app peut recevoir un ancien job si la modification a été faite hors ligne. Documentation [PUSH-V0213.md](PUSH-V0213.md).

### V0.21.4 — Réglages regroupés (11 novembre 2026)

- Remplacement du long écran Réglages par un accueil à **six rubriques**, recherche locale sans accent et sous-pages : Interface, Notifications, Applications connectées, Sécurité, Données, À propos.
- `settings-v0214.js/css` contient le nouvel écran et ses styles iPhone. `app.js` délègue l'affichage à ce module ; l'ancien `legacySettingsView()` est conservé comme fallback. Tous les `data-action` existants sont réutilisés, sans migration.
- Gaming/Rituel affichés séparément via `NexusConnections.settingsCard(appId)`, voyages Rituel dans Rituel, Vestiaire dans Vestiaire, Connect 2.0 dans Automatisations. Santé est seulement un emplacement futur, **aucune intégration fictive**.
- Constante de version UI `NEXUS_VERSION='0.21.4'` ; indicateur HTML alimenté dynamiquement ; Service Worker cache `nexus-v0.21.4` ; fichiers versionnés dans index et SW.
- Tests ajoutés dans `tests/settings-v0214.test.cjs` ; tests de cache existants alignés. Validation syntaxique, des 13 vues/sous-vues et du cache effectuée ; **vraie recette Safari iOS toujours attendue**.
- Aucune modification des objets métier, IndexedDB, préférences existantes, coffre, passkeys, push, Workers Cloudflare. Ne pas désinstaller Nexus pour rafraîchir.
- Documentation : [SETTINGS-V0214.md](SETTINGS-V0214.md).


## V0.21.6 — Import local de budget

- Fiche de référence : [BUDGET-IMPORT-V0216.md](BUDGET-IMPORT-V0216.md).
- Import CSV Notion ou JSON privé sur iPhone, fichier local uniquement, jamais de sommes personnelles en code public.
- Aperçu et dédoublonnage avant ajout ; salaire existant ignoré ; prêts et abonnements gardent les mêmes récurrences ; aucun ajout au Journal ou reprise des états CSV.
- Dates et durées inconnues sont à compléter ; `schedulePending:true` empêche échéances, auto-écritures et notifications fictives. Après édition, `schedulePending:false`.
- Tests : `tests/budget-import-v0216.test.cjs` ; version 0.21.6.


## V0.21.7 — Réimportation explicite LINK → Budget

- Référence : [LINK-REIMPORT-V0217.md](LINK-REIMPORT-V0217.md).
- Réexaminer un pass Gaming payé après suppression de la dépense Budget permet de recréer une écriture avec un nouvel ID, en conservant l'ancienne dans la corbeille et en rapprochant la provenance de l'achat.
- Si la transaction est déjà active (même `originApp` + `originSourceId`), une mise à jour est faite au lieu d'une nouvelle écriture.
- Restaurer l'ancienne transaction (y compris dans une réinitialisation groupée) est bloqué en cas de doublon de provenance ; aucun élément du bundle n'est alors restauré.
- Vérification durable du Journal et rollback en cas d'échec ; tests `tests/link-reimport-v0217.test.cjs`; version 0.21.7.

## V0.21.10 — Prêts révisables et revenus variables (12/11/2026)

- Référence détaillée : [BUDGET-FINANCE-V02110.md](BUDGET-FINANCE-V02110.md).
- Prêts : simulation de remboursement anticipé avec capital dû et taux déclarés, scénarios mensualité réduite ou durée raccourcie, vérification et confirmation du versement, ajustement manuel ultérieur selon échéancier bancaire.
- Données financières additives et locales : `loanScheduleRevisions[]` dans la récurrence de prêt, transaction distincte avec `loanExtraPaymentFor` ; aucun paiement bancaire, aucune donnée personnelle dans le code public. Les écritures passées restent intactes.
- Calculs de prévision et notifications par `occurrence.amountCents`, y compris dernière mensualité partielle. Simulation nominale hors frais/assurance, non contractuelle.
- Revenus réguliers : **Pause / Reprendre** ; reprise de l'automatisation sans rattrapage. Recettes variables CPAM/employeur saisies au Journal manuellement, sans récurrence ni estimation automatique.
- Version 0.21.10, cache iOS `nexus-v0.21.10.0`, tests `tests/budget-finance-v02110.test.cjs`. Tests Node/Pages réussis à la livraison ; **recette Safari iPhone à faire**.

## FORGE #25 — Agenda médical ↔ Santé, Nexus V0.21.11 (12/11/2026)

- Source : `nexus-sante.js` (projection medical, IDs, révisions, tombstones, merge conservative, consentement `sendMedical`, réception E2EE) ; `app.js` (case « médical » et gestion de l'édition) ; `recycle.js` (suppression/restauration) ; `index.html`, `sw.js` (cache V0.21.11), tests.
- Contrat entrant `sante.calendar.v1` inchangé, sortant `nexus.calendar.v1` paginé 12 événements par page, max 8 pages. Même jumelage NXS1, scope `health_calendar`, relais dédié Santé ; aucun nouveau secret, D1 ou entitlement.
- L'agenda Nexus reste non chiffré localement. Santé reste coffre AES-GCM. Notifications rendez-vous Nexus, médications Santé. Consentement explicite dans Réglages → Santé, auto-import activé lors de l'opt-in. Deux PWAs ouvertes successivement pour synchroniser, pas de tâche de fond iOS. Ne jamais exposer données médicales dans FORGE.
- Vérifier CI et recette réelle iPhone : événement préexistant au titre ambigu via case Médical, double création identique, modification des deux côtés, suppression, corbeille, hors ligne/reprise, conflits, DST et installation sans perte de l'IndexedDB.

## NEXUS V0.21.12 — Voyages Garage et NEXUS LINK (12/11/2026)
- PR #13 fusionnée, commit `5ef0b3369d4c81f7a947615858f950f85d9d9f63`, GitHub Pages et CI 77 tests (corrigés) réussies. Version JS `0.21.12`, cache `nexus-v0.21.12.0`. Véritable recette Safari iPhone à faire.
- `nexus-travel.js` propose un séjour explicite vers **Garage** séparément de Rituel. Consentement : Nexus → Réglages → Voyages → jumelage Garage `trip_context`, code privé `NXL1` à coller dans Garage → Réglages. Le séjour n'importe aucune adresse/participant/contact et ne crée ni notification/dépense ni déplacement automatique. `travelGarageOutbox[]` permet la déduplication ; ancienne liaison Rituel et agenda conservés.
- `link-core.js` autorise `sourceApp=garage`. CORS `nexus-app-api` et relais `nexus-link-api` étendus à l'origine Garage, nouveaux scopes `rituel_catalog`, `rituel_location_request`, `garage_locations`, `trip_context` ; aucune modification du chiffrement AES-GCM ni des canaux existants.
- Migration SQL D1 `bridge/migrations/0003_garage.sql` appliquée à `nexus-link-db` le 12/11/2026 : préflight 4 connexions / 51 messages, postflight 4/51, PRAGMA foreign_key_check = 0, nouveau CHECK accepte Garage. Export et bookmark disponibles. Worker `nexus-link-api` `b7d768a5-63df-46f3-9a97-08f83ff65df8`, `nexus-app-api` `39754953-124c-49d7-83a5-80912bd31cb7`, déployés à 100 % avec bindings D1/service/VAPID/PEPPER conservés.
- Sens Rituel↔Garage à valider de bout en bout sur PWA iPhone, versions et caches à contrôler. Rétrocompatibilité : ne pas effacer `travelOutbox`, `linkConnections`, ou les autres données Nexus. Ne jamais partager les codes de jumelage dans FORGE/GitHub.
