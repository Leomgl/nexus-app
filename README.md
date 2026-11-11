# NEXUS — Second cerveau personnel (V0.21.3 · Notifications contextuelles)

> **Reprise entre conversations : [PROJECT-HANDOFF.md](docs/PROJECT-HANDOFF.md)** — vision, architecture, roadmap, fichiers clés et état exact des versions. **Documentation de la V0.18 : [PULSE-V018.md](docs/PULSE-V018.md)**.
>
> La suite ci-dessous contient aussi des notes d'anciennes versions ; les sections V0.21.2 et le dossier de reprise font foi pour l'état actuel.

## V0.21.3 — FORGE #5 · Notifications adaptées au contexte

NEXUS prépare maintenant des Web Push distincts pour l'Agenda, les Rappels et les échéances de Budget. Les revenus et dépenses récurrents peuvent alerter **J-2 et le jour J à 9h**, ou selon les options propres à chaque règle (J-7/J-2/J0, y compris désactivation). Aucun paiement n'est automatiquement considéré comme effectué.

Le serveur conserve **uniquement les dates, le type technique et un ID opaque** ; les intitulés, lieux, contacts et montants sont résolus par le Service Worker sur l'iPhone, sans être transmis à Cloudflare. **Afficher les détails sur l'écran verrouillé** est une option explicite dans Réglages → Notifications iPhone ; le mode discret reste le défaut. Aucune migration D1, aucun nouveau Worker ou service payant. Tests de code et validation physique iPhone sont des étapes distinctes. Voir [docs/PUSH-V0213.md](docs/PUSH-V0213.md).

NEXUS est une **PWA iPhone installable gratuitement sans App Store**, développée avec HTML, CSS, JavaScript, IndexedDB et Cloudflare Workers/D1. **NEXUS est le cœur** ; Gaming, Rituel, Vestiaire et les futures apps en sont des spécialisations reliées par permissions. [Ouvrir l’application](https://leomgl.github.io/nexus-app/). Le code est public, mais les données personnelles ne sont jamais placées dans GitHub.


## Correctif V0.21.2 — Revenus réguliers inscrits automatiquement (11 novembre 2026)

La section **Budget → Engagements → Revenus réguliers** permet désormais de suivre salaire, prime régulière, rente ou autre entrée d'argent. Sur chaque récurrence de type Recette, **Inscrire automatiquement ce revenu au Journal** est une option **désactivée par défaut** : après activation, les échéances dues deviennent des recettes programmées dans le Journal au prochain lancement/retour de NEXUS, sans doubler une recette déjà liée.

La date d'activation empêche de recréer automatiquement des salaires des mois précédents. Les revenus sont ajoutés **selon le calendrier déclaré**, sans accès bancaire : le Journal précise **« réception non vérifiée »**, puis propose un bouton **« Confirmer reçu »**. Une écriture supprimée n'est pas recréée immédiatement, les saisies manuelles ambiguës sont signalées plutôt que dupliquées, et aucun paiement de dépense n'est automatisé.

[Documentation complète et recette iPhone V0.21.2](docs/BUDGET-AUTO-INCOME-V0212.md). Les tests automatisés portent sur le rattrapage, les jours de paie particuliers, les permissions, les doublons et les échecs de sauvegarde. Le test final sur iPhone reste à confirmer.

## Version V0.21.1 — Vestiaire contextuel (11 novembre 2026)

**NEXUS × Vestiaire :** propositions de tenues adaptées aux événements Agenda et à la météo Pulse, dans un widget **Tenue du jour** configurable. Classement local selon restaurant, travail, soirée, sortie, sport et voyage, sans IA distante payante.

Vestiaire V0.6 conserve le dressing, les images, la disponibilité et le mannequin. Après jumelage et consentement, il envoie via NEXUS LINK chiffré au plus 24 **résumés de looks** : identifiant, nom, occasion, style, disponibilité et niveau de chaleur. **Aucune photo ni pièce détaillée, aucun contact et aucun événement NEXUS ne sont envoyés vers Vestiaire.** L'envoi automatique est désactivé par défaut, uniquement quand Vestiaire est ouverte.

Depuis NEXUS, on peut **choisir une tenue pour un RDV** et la retrouver sur sa fiche Agenda, puis ouvrir son look dans Vestiaire. Le choix ne modifie **pas** le planning de Vestiaire automatiquement. Aucune dépense ni tâche n'est créée.

**Correctif V0.21.1 :** rafraîchissement immédiat de la fiche Agenda lorsqu'une tenue est retirée, version et cache PWA actualisés. **Mise à jour technique :** NEXUS et Vestiaire intégrés sur GitHub. Workers Cloudflare concernés mis à jour avec bindings existants préservés, sans nouvelle base ni offre payante. Tests automatiques réussis mais validation du jumelage et du rendu sur iPhone encore nécessaire.

[Spécification et recette V0.21](docs/VESTIAIRE-V021.md) · [Dossier de reprise](docs/PROJECT-HANDOFF.md)

## Version V0.20.1 — Budget avancé (11 novembre 2026)

**Quotidien / Engagements / Objectifs** : le module Budget dispose désormais de trois espaces clairs. Toutes les anciennes pages et calculs du Journal, des statistiques et du prévisionnel sont conservés.

- **Quotidien** : Vue d'ensemble, Journal et Statistiques, avec les opérations NEXUS / Gaming / RITUEL déjà réconciliées.
- **Engagements** : abonnements mensuels ou annuels, prêts avec mensualités et échéances de contrat, prévision d'occurrences sans écriture automatique. Possibilité de **classer une récurrence existante** en abonnement ou en prêt sans recréer ni dupliquer la règle.
- **Objectifs** : suivi manuel d'épargne par montant cible, date et projet associé, versements/retraits datés, historique et progression. **Ces mouvements ne sont pas des dépenses du Journal.**
- Les nouveaux objectifs se trouvent dans `data.savingsGoals[]`, inclus dans les sauvegardes et la corbeille ; les abonnements et prêts restent dans `data.recurrences[]` avec des métadonnées spécifiques.
- Le « reste » d'un prêt indique **les échéances non confirmées**, jamais un capital restant dû exact. Aucun calcul bancaire d'amortissement ou paiement réel n'est lancé.

[Documentation V0.20 et recette iPhone](docs/BUDGET-V020.md) · [Reprise de projet](docs/PROJECT-HANDOFF.md).

**Le code est publié dans GitHub ; la recette sur iPhone avec des données personnelles doit être effectuée avant de déclarer l'interface définitivement validée.**

## Version V0.19.1 — Connect 2.0 (11 novembre 2026)

**NEXUS reste le centre**. Gaming et RITUEL lui transmettent des propositions par NEXUS LINK ; les apps restent autonomes. La réception des nouveautés est désormais déclenchée automatiquement quand NEXUS est ouverte et connectée (désactivable). Aucun calendrier, achat ni budget n'est modifié sans une validation ou une autorisation explicite.

**Nouveau :** dans **Réglages → NEXUS Connect 2.0**, possibilité d'autoriser indépendamment l'enregistrement automatique d'un **pass Gaming réellement acheté** et d'un **produit RITUEL réellement payé**. Par défaut, les deux sont désactivés. Les achats doivent fournir une **date réelle**, un **prix positif** et la **devise EUR** et appartenir à une connexion dont le scope financier a été approuvé.

Gaming comporte désormais une **date d'achat du pass**, distincte de la date de fin de saison. Les doublons liés au même achat sont bloqués, y compris après rejumelage si la provenance est conservée. Une révision après enregistrement demande toujours une vérification manuelle : aucune correction silencieuse du Journal. Les réassorts supposés et les passes suivis sans achat ne créent jamais de dépense.

**Recette multi-apps iPhone / Cloudflare requise** après les tests automatiques. Le code NEXUS/Gaming/Rituel est dans leurs dépôts GitHub ; les PWA des apps sources doivent réellement servir leurs nouveaux fichiers pour que l'envoi de métadonnées soit opérationnel.

[Contrat complet et tests Connect 2.0](docs/CONNECT-V019.md) · [Dossier de reprise](docs/PROJECT-HANDOFF.md)

## Version V0.18.0 — NEXUS Pulse (11 novembre 2026)

L'accueil devient un **cockpit de la journée** avec widgets personnalisables :

- **Aujourd'hui** : rendez-vous restants, rappels urgents/en retard et prochain événement ;
- **Météo** : Open-Meteo, ville initiale Lille modifiable, géolocalisation facultative après clic, prévisions du jour et cache local de 45 minutes ;
- **Budget** : dépenses du mois, plafond restant et échéances prévues ;
- **Projet en focus**, **Applications liées** (propositions Gaming/Rituel) et **activité récente** ;
- **Capture éclair** inchangée dans son principe : une note en premier, puis suggestions locales explicites ; raccourcis RDV, Rappel, Achat et Dépense.

Les préférences d'accueil existantes sont conservées ; les deux nouveaux widgets apparaissent une fois et peuvent être masqués ou déplacés dans **Réglages → Accueil personnalisé**. Aucun contenu privé n'est introduit dans GitHub, pas de migration de base. Météo désactivable en masquant le widget. Les données météo partent directement vers Open-Meteo sans transiter par le Worker NEXUS.

**Le passage de Gaming à un achat payé créé dans le Journal, les suggestions de tenues Vestiaire, les abonnements/prêts avancés et le Command Center restent des étapes futures**. Voir la roadmap dans [PROJECT-HANDOFF.md](docs/PROJECT-HANDOFF.md).

**Recette manuelle sur iPhone nécessaire**, même après réussite des tests automatiques : météo réseau/hors ligne, rang et tailles des widgets, conservation des préférences, capture éclair et accès aux modules.

## Modules et fonctionnalités

- **Notes** : capture rapide, texte libre, liens vers les éléments créés et suggestions locales.
- **Agenda** : rendez-vous, date/heure, lieu, personne, notes liées, export iCalendar.
- **Rappels** : tâches, échéance, heure, état terminé, projets, origine.
- **Personnes** : répertoire personnel avec téléphone et courriel.
- **Projets** : budget prévisionnel, progrès par tâches, achats et dépenses liés.
- **Achats** : wishlist, priorités, projet, coût estimé, achat effectué avec **dépense créée automatiquement** lors du passage à « Acheté » si prix valide, sans doublon.
- **Budget V0.8** : récurrences (salaires, prêts, abonnements), journal d'opérations, dépenses rapides fixes ou variables, graphiques et plafond mensuel.

La **capture intelligente V0.4** repère dates/heures/lieux français, personnes du répertoire, rendez-vous, actions à faire, achats, projets et dépenses. Elle propose, mais ne crée jamais rien sans validation. Les détections restent locales et déterministes (pas de modèle IA distant, pas de frais d'API).

## Notifications iOS V0.4

Le Worker Cloudflare `nexus-app-api` et son Cron **toutes les 5 minutes** sont déployés. Le calendrier des alertes est transmis **uniquement après activation explicite des notifications** sur l'iPhone. Cloudflare reçoit l'identifiant opaque du rappel, son échéance, son type `event`/`task` et une souscription Web Push, **jamais le titre, le lieu, le contact ou la note**. Une notification générique s'affiche même écran verrouillé.

Dans NEXUS installé sur l'écran d'accueil iPhone :
1. Activer une fois les notifications dans **Réglages → Notifications iPhone**, puis utiliser **Envoyer une notification test**.
2. **Ouvrir un rendez-vous → Modifier** : régler individuellement ses alertes. Exemples : médecin **1 jour + 2 h + 15 min avant** ; train **45 min avant**. Possibilité de sélectionner zéro, un ou plusieurs délais.
3. Enregistrer : NEXUS met à jour les horaires des rappels côté Cloudflare après sauvegarde (l'appareil doit être en ligne).
4. Pour les **tâches**, les délais par défaut restent réglables dans les paramètres de notifications. Sans heure : 09:00 en heure locale.

Les rendez-vous créés avant V0.6, qui n'ont pas encore de liste de rappels propre, conservent **leurs anciennes préférences générales** jusqu'à leur prochaine modification. Cela évite d'annuler brutalement d'anciennes alertes.

Sur iOS, Web Push nécessite iOS 16.4+, HTTPS, la **PWA installée depuis Safari et ouverte depuis son icône**, ainsi qu'une autorisation iOS. Le cron et le réseau n'offrent aucune garantie à la seconde. Un changement effectué hors ligne ne peut pas immédiatement annuler un ancien rappel sur le serveur : ouvrir NEXUS une fois Internet revenu.

## Coffre chiffré et synchronisation V0.4

- Coffre **optionnel** activé avec un code d'invitation à usage unique ; conserver la clé de récupération de **43 caractères** dans le trousseau iCloud. Ne jamais la communiquer ou la publier.
- Les snapshots sont chiffrés **sur l'appareil** en AES-256-GCM (clé dérivée via HKDF). Cloudflare conserve seulement un document chiffré et un vérificateur d'accès.
- Dans **Réglages → Coffre cloud**, utiliser **Sauvegarder vers le cloud** et, seulement après la première sauvegarde depuis cet appareil, **Activer la synchro automatique**.
- La synchronisation, **désactivée par défaut**, pousse les modifications locales et peut récupérer automatiquement une version distante si aucune modification locale n'est intervenue. Elle conserve aussi une sauvegarde locale avant toute réception.
- Si deux appareils modifient leurs données indépendamment, **la synchronisation est arrêtée**. Il n'existe pas encore de fusion multiéditeur en temps réel ; pour l'instant, ne modifie pas simultanément les données sur deux appareils.
- L'export/import JSON reste disponible et il faut conserver au moins un export indépendant.

**À ne pas confondre** : la V0.5 bêta inclut le **verrouillage optionnel par passkey vérifiée sur le serveur**, mais pas une authentification passkey autonome remplaçant la clé de récupération, ni une synchronisation multiéditeur avec fusion automatique. Les données **locales** dans IndexedDB restent en clair. L'origine GitHub Pages `leomgl.github.io` est partagée avec d'autres applications du même compte : les chemins ne constituent pas une frontière de sécurité. Ne pas y stocker encore de données très sensibles.

## Face ID / passkeys — bêta V0.5

Dans **Réglages → Face ID / Passkey → Activer**, NEXUS crée une passkey WebAuthn ES256 pour `leomgl.github.io` après confirmation iOS. Le serveur conserve seulement sa clé publique et vérifie chaque déverrouillage avec un défi à usage unique, la signature, le domaine et la présence de la vérification de l'utilisateur. L'appareil peut demander **Face ID ou son code de déverrouillage** selon les réglages iOS. L'interface se verrouille aux prochains lancements.

Un accès de secours demande la clé de récupération du coffre. Le système n'est **pas un chiffrement des données locales**, ni une sécurité contre un navigateur compromis : IndexedDB et la clé de récupération restent accessibles au code de la même origine. Ne pas perdre la clé de récupération.

La création et le déverrouillage en conditions réelles sur iPhone **ne sont pas encore validés**. Consulte [docs/PASSKEYS.md](docs/PASSKEYS.md).

## Architecture

```text
iPhone PWA — GitHub Pages (/nexus-app/)
  ├── app.js : notes, calendrier, budget, projets, capture locale
  ├── cloud.js : chiffrement, coffre, synchronisation opt-in
  ├── push-client.js : permission iOS, préférences, abonnements
  ├── passkey-client.js / lock-boot.js : UI lock WebAuthn optionnel
  ├── sw.js : offline + notificationclick / push
  └── IndexedDB : données personnelles locales

Cloudflare Worker nexus-app-api
  ├── backend/src/index.js : accès au coffre + API authentifiée
  ├── backend/src/push.js : VAPID, Web Push, planification
  ├── backend/src/passkeys.js : vérification WebAuthn côté serveur
  ├── Cron : */5 * * * *
  └── D1 nexus-app-db (juridiction EU)
        ├── tables métier V1 (réservées au futur modèle structuré)
        ├── vaults (snapshots chiffrés) V2
        ├── push_devices / push_jobs V3 (horaires et souscriptions)
        └── passkey_credentials / passkey_challenges V4
```

Les secrets VAPID privés **restent dans Cloudflare**, jamais sur GitHub. La clé publique est exposée dans le Worker pour permettre l'abonnement push. Le Worker a été mis en production directement via l'API Cloudflare ; GitHub Workers Builds n'est pas encore configuré. Les mises à jour du dossier `backend/` ne se déploient donc **pas automatiquement**.

## Installation et mises à jour

1. Ouvrir https://leomgl.github.io/nexus-app/ dans Safari, puis **Partager → Sur l'écran d'accueil → Ajouter**.
2. Ouvrir l'app depuis son icône ; le Service Worker gère la mise en cache des ressources.
3. Lors des mises à jour, **fermer et rouvrir ou actualiser l'application**. Ne pas supprimer l'icône, sous peine de perdre IndexedDB et l'abonnement push.
4. Effectuer une sauvegarde locale JSON avant une désinstallation, restauration ou changement d'appareil.

## Suivi des tests

- ✅ Code GitHub V0.14 bêta, coffre D1 V4 et NEXUS LINK activé pour les propositions Gaming.
- ✅ Tests serveur Cloudflare : création coffre, refus mauvaise clé, conflits, abonnement Web Push, planification et désinscription. Données de test nettoyées.
- ✅ Test cryptographique simulé : chiffrement AES128GCM du push et signature VAPID vérifiés.
- ⏳ À vérifier sur vrai iPhone : permission Web Push, réception push de test et rappel planifié après fermeture de l'app.
- ⏳ À vérifier sur plusieurs appareils : restauration, réception automatique sans conflit, comportements hors ligne.
- ✅ WebAuthn serveur : vérification de signature ES256 et de l'empreinte RP testées en laboratoire.
- ⏳ À tester sur iPhone : inscription et déverrouillage Face ID / passkey.
- ⏳ À construire : authentification passkey indépendante du jeton de récupération, rotation/révocation des clés, moteur de fusion multiappareil, refonte UI.

## Gratuité

Projet conçu pour GitHub Free, Cloudflare Workers Free et D1 Free. Les limites et conditions des offres peuvent évoluer. **Ne jamais activer une offre payante sans accord explicite.**

Documentation : [Notifications iOS](docs/NOTIFICATIONS-IOS.md) · [Synchronisation](docs/SYNCHRONISATION.md) · [Passkeys](docs/PASSKEYS.md) · [Sécurité coffre](docs/COFFRE-CHIFFRE.md) · [Architecture cible](docs/ARCHITECTURE-CIBLE.md).

## Nouveautés V0.6 (10 novembre 2026)

- **Alertes par rendez-vous**, et non plus globales. Dans l'édition d'un événement, cocher autant de délais que nécessaire : 1 jour, 12 h, 4 h, 2 h, 1 h, 45 min, 30 min, 15 min, 5 min ou une durée personnalisée de 1 à 10 080 minutes. Décocher tout coupe les rappels de cet événement.
- **Projets créés depuis n'importe quelle fiche** : note, RDV, tâche, achat ou transaction. Dans « Projet associé », choisir « ＋ Créer un nouveau projet… », entrer son nom et enregistrer l'élément. Le projet et son lien sont alors créés ensemble ; annuler ne crée rien.
- Une note enregistrée peut aussi devenir le point de départ d'un projet grâce à **Transformer en projet**. Son titre pré-remplit celui du projet et la note lui reste associée.
- Une fiche Projet affiche maintenant ses **rendez-vous associés**, avec un raccourci pour en créer un nouveau.

Pour toute modification hors ligne, NEXUS actualise les notifications à son retour en ligne. Le service push reste soumis au déclencheur Cloudflare toutes les cinq minutes ; aucun horaire n'est garanti à la seconde.

## Interface V0.7 — cockpit personnel

NEXUS utilise désormais une navigation principale **à cinq emplacements** sur iPhone **et desktop** :

1. **Accueil** — tableau de bord et capture rapide.
2. **Catégories** — les sept modules : Notes, Agenda, Rappels, Personnes, Projets, Achats, Budget.
3. **Raccourci 1** — projet par défaut, personnalisable.
4. **Raccourci 2** — budget par défaut, personnalisable.
5. **Réglages** — page complète pour la navigation, l’apparence, l’accueil, les notifications, la sécurité et les sauvegardes.

Un module ouvert depuis Catégories propose également **Slot 1** / **Slot 2** pour l'épingler rapidement. Si le module est déjà attribué à l'autre slot, les raccourcis sont échangés ; aucun doublon.

### Accueil

La capture instantanée transforme du texte libre en **note locale**, puis ouvre la fiche et ses suggestions de rendez-vous, tâche, achat, projet ou dépense. Aucun élément lié n'est créé sans validation.

Les widgets historiques de l'accueil (V0.7) étaient :

- Aujourd'hui : RDV du jour, prochain événement, tâches en retard ou prioritaires.
- Projet en focus : projet actif récemment mis à jour, avancement et dépenses associées.
- Budget du mois : dépenses et plafond éventuel.
- Activité récente : éléments récemment créés ou mis à jour.

Depuis **Réglages → Accueil personnalisé**, l'utilisateur peut masquer, réactiver et **réordonner** les widgets. Les sections de capture et le résumé d'accueil restent fixes pour garantir un point d'entrée immédiat.

### Apparence et préférences

- Palette **Sauge** ou **Ardoise**, toutes deux **claires**.
- Densité **Confortable** ou **Compacte**.
- Réinitialisation de l'interface sans toucher aux notes ni aux sauvegardes.

Les préférences sont enregistrées dans le `localStorage` de ce navigateur sous `nexus_interface_v07` : **elles sont propres à cet appareil**, pas synchronisées entre téléphones, ni incluses dans le snapshot de coffre chiffré. Les données métiers restent dans le même IndexedDB `nexus-v0-1`, schéma V0.6 inchangé.

### Non-régression / tests

- ✅ Analyse statique JavaScript : app, cloud, push, passkeys et service worker.
- ✅ Cinq entrées mobiles et desktop dans le document HTML.
- ✅ Parcours logique : Accueil → Catégories → Réglages.
- ✅ Sept modules présents dans la page Catégories.
- ✅ Raccourcis configurables, persistants et sans doublons.
- ✅ Widgets configurables et ordre conservé après lecture des préférences.
- ✅ Accueil rendu sans données et avec données de test (notes, rendez-vous, projet).
- ✅ Cache PWA version `nexus-v0.7.0`.
- ⏳ À confirmer sur iPhone réel : rendu visuel, mise à jour PWA après rechargement, interactions, lisibilité des réglages.

Il n'y a **aucune migration D1 ou Worker** dans V0.7 ; le coffre existant, les notifications, la synchronisation et les passkeys conservent leur backend.

Voir [docs/INTERFACE-V07.md](docs/INTERFACE-V07.md) pour les flux et décisions d'ergonomie.

## Budget V0.8 — quatre espaces complémentaires

Le module Budget présente désormais **Vue d'ensemble / Récurrences / Journal / Statistiques** et un panneau de dépenses rapides. Toutes les données sont locales et liées au même coffre chiffré.

- **Récurrences** : règles mensuelles (jour 1–31), hebdomadaires (jour de la semaine) ou annuelles (jour + mois) pour les revenus et dépenses. Le jour 31 est automatiquement ramené au dernier jour d'un mois plus court. Chaque règle peut être modifiée, mise en pause, supprimée ou limitée par une date de fin. Une occurrence spécifique peut être ignorée pour la période concernée.
- **Journal** : opérations réelles avec recherche par libellé/date/catégorie, filtres type et catégorie, consultation et édition via les formulaires existants. Les opérations générées à partir d'une récurrence ou d'un raccourci conservent un lien vers leur source.
- **Dépenses rapides** : modèles « fixe » (un clic = dépense réelle immédiate datée du jour) ou « variable » (mini-formulaire pour saisir montant et date). Édition/suppression des modèles sans effacer les opérations passées.
- **Statistiques** : évolution recettes/dépenses des six derniers mois, moyenne mensuelle, flux net, répartition par catégorie. Aucune requête externe, aucune connexion bancaire.

### Prévisions vs opérations

Les récurrences ne sont **pas automatiquement inscrites au journal**. Elles apparaissent comme **prévisions** jusqu'à validation. Le bouton « Confirmer » ouvre un formulaire avec montant et date modifiables : seul l'enregistrement explicite crée une opération réelle. Une occurrence confirmée cesse de compter parmi les prévisions, même si la règle est modifiée ultérieurement. Les événements ignorés ne sont pas intégrés au flux prévu. Le « flux net projeté » est basé sur les opérations déjà comptabilisées **plus** les échéances non validées du mois ; ce n'est ni le solde du compte ni un relevé bancaire.

Un paiement entré directement dans le journal sans passer par le bouton « Confirmer » n'est pas automatiquement rapproché de sa récurrence. Utiliser « Ignorer » pour cette occurrence si nécessaire, afin d'éviter de la compter deux fois dans la projection.

### Compatibilité et sauvegarde

Le modèle local ajoute **`recurrences`** et **`quickExpenses`** aux tableaux de données. Les anciennes sauvegardes ne contiennent pas ces clés : elles seront chargées comme tableaux vides. Les exports JSON et snapshots chiffrés incluent les nouveaux tableaux sans migration D1 ni changement du Worker. Les préférences d'interface restent stockées séparément.

**Tests V0.8** : mois de février avec jours 28/29/31, récurrence hebdomadaire, récurrence annuelle, échéance ignorée, échéance confirmée, règles en pause, écriture d'un montant réel ajusté, raccourcis fixes et variables, rendu des quatre vues. À tester sur Safari iPhone avant de considérer la version stable.

Documentation détaillée : [docs/BUDGET-V08.md](docs/BUDGET-V08.md).

## Budget V0.9 — catégories libres, épingles et projection

### Catégories personnalisées

Depuis **Budget → Gérer mes catégories**, tu peux créer, renommer, attribuer une couleur, archiver et réactiver des catégories budgétaires. Les catégories prédéfinies restent présentes par compatibilité, mais sont **éditables**. Les libellés historiques hors liste sont également récupérés.

- **Renommer** une catégorie met à jour ses libellés dans `data.transactions`, `data.recurrences` et `data.quickExpenses` en conservant dates, montants et IDs.
- **Archiver** masque le choix dans les **nouveaux** formulaires, sans retirer la catégorie d'une opération historique en édition. Les transactions et statistiques existantes restent inchangées.
- Les couleurs sont de vraies valeurs hexadécimales validées, appliquées à la ventilation par catégorie. Les statistiques affichent toutes les catégories utilisées et pas seulement les six premières.
- Les doublons de nom sont bloqués (insensibles aux accents et à la casse).
- Les réglages sont stockés dans `data.budgetCategories[]` et suivent donc l'export local ainsi que les sauvegardes chiffrées Cloudflare, sans aucune modification du Worker ni migration D1.

### Raccourcis épinglés

L'étoile sur une dépense rapide la garde en tête de la liste, qu'elle soit à montant fixe ou variable. L'épinglage est sauvegardé localement et dans le coffre, avec le modèle de dépense. L'historique des opérations reste indépendant des changements de raccourci.

### Projections à trois mois

Sur **Budget → Vue d'ensemble**, trois cartes montrent les prochains mois avec leurs flux positifs et négatifs, calculés à partir des récurrences actives restantes et des éventuelles opérations déjà enregistrées. Les mois incomplets ou dépenses imprévues ne sont pas devinés. Les valeurs ne représentent jamais le solde bancaire.

### Tests

Code et scénarios de calcul simulés : création et renommage de catégorie, propagation à une transaction / une récurrence / un raccourci, archivage et maintien de l'historique, conservation de catégorie archivée sur une ancienne opération, rejet des couleurs CSS non valides, gestion des jours de fin de mois, épingles et projections multi-mois.

**Limite :** validation d'interface sur un vrai iPhone et de la synchronisation interappareils encore nécessaires avant une version stable.

## V0.10 — Corbeille, restauration et réinitialisations sécurisées

**Toutes les suppressions des sept modules passent désormais par une corbeille commune**, avec action **Annuler** disponible immédiatement, puis restauration depuis **Réglages → Corbeille universelle**. Cela inclut les notes, rendez-vous, tâches, personnes, projets, achats, opérations financières, règles de récurrence, dépenses rapides, catégories budgétaires et suppression d'un plafond mensuel.

- **La suppression ne rompt plus les relations entre blocs** : si un projet est placé dans la corbeille, les notes ou transactions qui lui sont associées conservent l'ID d'origine. Restaurer le projet rétablit les liens.
- **La corbeille est persistante** : toutes ses entrées sont dans `data.trash[]` et donc incluses dans l'export JSON et dans le snapshot chiffré. Aucun nettoyage automatique.
- **Restauration anti-écrasement** : si un élément actif possède déjà le même ID, NEXUS refuse la restauration, sans modifier les données.
- **Suppression définitive** : disponible par entrée depuis la corbeille avec confirmation. Pour vider toute la corbeille, il faut taper `VIDER`.
- **Catégories Budget** : le bouton « Supprimer » les place dans la corbeille, sans supprimer les opérations historiques. Les catégories prédéfinies sont également récupérables.
- **Réinitialisation par module** : dans Réglages, choisir un seul module à vider et confirmer en tapant son nom en majuscules. Les données sont déplacées sous la forme d'un **groupe restaurable**. Le Budget regroupe ses opérations, plafonds, récurrences, dépenses rapides et catégories personnalisées.
- **Réinitialisation complète** : **non activée**. Une future V1 doit prévoir un flux indépendant de déconnexion coffre, annulation des notifications, retrait des appareils/passkeys et export préalable.

**Précaution synchronisation** : les suppressions et réinitialisations sont des modifications de données pouvant être sauvegardées vers le coffre si la synchronisation automatique est active. La corbeille est elle-même synchronisée par snapshot ; vérifie le bon appareil et exporte un JSON avant un reset important.

**À ne pas confondre** : cette version propose l'annulation d'une **suppression**, pas un historique universel de toutes les modifications et saisies. Elle ne dispose pas encore d'un journal d'audit/versions ni d'une résolution automatique des conflits entre appareils.

### Compatibilité

Le tableau `trash[]` est ajouté au même modèle IndexedDB. Les anciennes sauvegardes qui n'ont pas ce champ se chargent avec une corbeille vide. Le code `recycle.js` est précaché par le Service Worker `nexus-v0.10.0`. Aucun changement Worker/D1/notifications/WebAuthn et aucun service payant.

Voir [docs/CORBEILLE-RESET.md](docs/CORBEILLE-RESET.md).

## V0.11 — Journal Budget : édition express et filtres mémorisés

Le journal Budget propose désormais des **actions directes sur chaque écriture** :

- **Modifier** : mini-formulaire pour changer le titre, le type (recette/dépense), le montant, la date et la catégorie en quelques champs. Tous les liens existants (projet, note, achat, récurrence et raccourci) sont préservés. Le bouton **Fiche complète** ouvre l'éditeur historique.
- **Supprimer** : utilise la corbeille universelle de V0.10. Après confirmation, un bouton « Annuler » restaure immédiatement l'écriture ; elle reste récupérable depuis Réglages → Corbeille.
- **Filtres mémorisés** : type et catégorie sont stockés localement sous `nexus_budget_journal_filters_v010`, survivant aux fermetures et réouvertures. La recherche textuelle, temporaire, n'est **pas** mémorisée pour éviter une vue vide inexplicable lors de la prochaine ouverture.
- **Effacer les filtres** : remet le type et la catégorie à « Tous » et vide la recherche.

Les contrôles de saisie bloquent montant nul, type inattendu, dates calendaires invalides et conversion d'une dépense liée à un achat en recette. Les projets et récurrences sources ne sont pas modifiés.

**Tests exécutés** : rendu des boutons, édition rapide d'une opération, conservation des liens, refus des dates impossibles et montants nuls, stockage et restauration des filtres, leur remise à zéro, délégation de la suppression au système de corbeille, syntaxe JS. Les interactions réelles Safari iPhone restent à valider.

Le stockage financier et les sauvegardes chiffrées sont inchangés. Les seuls nouveaux réglages sont des préférences d'affichage locales ; aucune migration Worker, D1, IndexedDB ou modification du projet RITUEL.

Voir [docs/JOURNAL-V011.md](docs/JOURNAL-V011.md).

## V0.12 — architecture de liaison entre applications (préparation)

NEXUS devient le **centre d'organisation** d'un futur écosystème de PWAs personnelles.
Les apps spécialisées restent autonomes : RITUEL pour les soins et stock, une future application **Gaming** pour la bibliothèque de jeux, le stockage, les passes saisonniers, sorties, événements et achats à prévoir.

Dans **Réglages → Applications & connexions**, un écran de préconfiguration permet de cocher les types de propositions souhaités pour RITUEL et Gaming. Ces cases sont enregistrées localement dans `localStorage` sous `nexus_link_config_draft_v1`.

**Attention : ceci est un prototype de réglages, pas une connexion effective.** Aucun compte n'est lié, aucune permission serveur n'est accordée, aucune synchronisation n'est activée et aucun transfert de données ne se produit. RITUEL et le backend Cloudflare existant n'ont pas été modifiés. Les cases préparatoires ne sont pas des autorisations actives.

Documents à lire avant de déployer la passerelle :
- [docs/APP-LINK-V1.md](docs/APP-LINK-V1.md) — architecture, sécurité, protocole, autorisations, dédoublonnage, étapes de déploiement.
- [docs/GAMING-APP-V1.md](docs/GAMING-APP-V1.md) — spécification de la PWA Gaming indépendante, fiches, stockage PS5/USB/M.2, saisons, DLC, sorties et liaisons NEXUS.
- [schemas/app-link-v1.schema.json](schemas/app-link-v1.schema.json) — enveloppe d'événement chiffré destinée à la passerelle future.

Les apps sont actuellement sur des chemins différents de `leomgl.github.io`, **mais la même origine web**. Cela n'est pas une vraie barrière de sécurité entre les applications dans un navigateur classique. Pour une liaison inter-app authentifiée, utiliser des origines séparées ; préparer une migration avec export/restauration vérifiés avant de changer l'URL d'une PWA déjà installée sur iPhone.

Aucune modification de Worker, de D1 ni de la base locale métier dans cette V0.12.

## V0.13 — jumelage chiffré NEXUS ↔ Gaming (test technique)

**NEXUS → Réglages → Applications & connexions → Configurer Gaming → choisir au moins une autorisation → Jumeler.**

Le code privé s'affiche dans NEXUS ; le saisir dans Gaming → Réglages → NEXUS LINK → Jumeler. Gaming vérifie la liaison auprès du relais, puis peut envoyer un **message de test chiffré**. Dans NEXUS → Applications & connexions → Messages, tu peux le lire et l'accuser réception.

La passerelle `https://nexus-link-api.q9pfwtztsc.workers.dev` utilise son propre Worker, une base D1 EU `nexus-link-db` et le protocole `link-core.js` partagé par NEXUS/Gaming. Les permissions sont figées au moment du jumelage ; pour les changer il faut révoquer le jumelage puis recommencer. Seul NEXUS peut révoquer le serveur via son jeton de lecture.

**Aucune opération réelle n'est transférée en V0.13 :** pas de dépenses, dates d'agenda ou achats importés. Les messages de test ne contiennent aucune donnée personnelle. RITUEL dispose du SDK en attente, non chargé dans la PWA, et doit avoir une origine web distincte avant d'activer sa liaison.

Les connexions NEXUS sont stockées dans `data.linkConnections[]`, incluses dans le coffre chiffré et l'export JSON (en clair sur l'appareil exportateur). Ne jamais envoyer le code de jumelage dans une conversation ou un ticket ; préserver les exports.

Voir [docs/APP-LINK-IMPLEMENTATION.md](docs/APP-LINK-IMPLEMENTATION.md).

## V0.14 — vraie synchronisation Gaming → NEXUS avec validation

**Déjà jumelé ? Aucun changement de code ni de permissions nécessaire.** Ouvre Gaming → Réglages → NEXUS LINK → Synchroniser avec NEXUS → Envoyer maintenant. Dans NEXUS → Réglages → Applications & connexions → Propositions → Recevoir depuis Gaming.

Le relais Cloudflare existant et son protocole de chiffrement AES-GCM sont conservés. L'application Gaming chiffre **sur le téléphone** les données métier autorisées par chaque scope de la connexion ; le serveur ne voit que des jetons de connexion, des hashes de source, les scopes, les révisions et du texte chiffré.

| Permission | Proposition NEXUS |
|---|---|
| `pass_deadline` | Fin de saison → Agenda ; mi-saison, J−14, J−7 futurs → Rappels |
| `pass_paid` | Seulement si pass acheté, montant connu → opération Budget **avec date réelle choisie** |
| `future_spending` | Dépense prévue → achat |
| `dlc_release` | DLC → date Agenda et achat à prévoir |
| `game_release` | Sortie → date Agenda et achat à prévoir |
| `gaming_event` | Événement Gaming → Agenda |
| `installed_summary` | Résumé des nombres de jeux → Notes |

Les scopes du jumelage sont fixes : la modification des droits exige de révoquer puis de refaire le jumelage. **Aucune création, modification ou suppression automatique d'un élément NEXUS.** Chaque proposition reçue doit être examinée et acceptée explicitement. Les nouvelles révisions se rattachent à l'élément précédemment accepté (ID NEXUS stable) et ne produisent pas de doublons. Les éléments supprimés dans NEXUS doivent être restaurés depuis la corbeille avant une mise à jour ultérieure.

Réception sécurisée : jusqu'à 50 messages par lot, sauvegarde IndexedDB/backup du tableau `linkInbox[]`, lecture et comparaison avec la copie persistée, **puis seulement ACK au relais**. Les messages non persistés ne sont pas effacés côté relais. Les propositions demeurent dans la sauvegarde JSON et le coffre NEXUS, ainsi que les associations `originLink`.

La synchronisation est **unidirectionnelle** : Gaming transmet à NEXUS, jamais l'inverse. Pas de synchronisation des mouvements de fichiers PS5, des clés ou des coffres. L'option d'envoi automatique dans Gaming est désactivée par défaut. La réception et la validation dans NEXUS restent manuelles. Si une fiche Gaming est supprimée, aucune fiche NEXUS n'est supprimée en cascade.

Aucune nouvelle base Cloudflare, aucun abonnement ou accès payant. **La validation sur Safari/iOS avec des propositions personnelles reste à faire** ; les tests techniques utilisent des données synthétiques et n'ont pas traité les données du compte de l'utilisateur.

## V0.16 — achats comptabilisés et carnet de contacts enrichi

- **Achats → Acheté** : une dépense du montant renseigné est ajoutée automatiquement au Journal Budget, liée à l'achat, sa note et son projet. Une deuxième écriture portant le même `purchaseId` n'est jamais créée. Le passage à « Acheté » via modification du formulaire suit la même règle. Un prix manquant ou nul bloque le changement jusqu'à saisie d'un montant positif. Pour les achats déjà marqués « Acheté » avant cette mise à jour sans transaction, la régularisation reste manuelle via « Ajouter au budget ».
- **Historique** : une fois la dépense créée, changer la catégorie, le prix ou le statut de l'achat ne modifie ni ne supprime la transaction historique ; le Journal reste le lieu pour corriger l'écriture.
- **Agenda / Rappels** : création d'une nouvelle personne pendant la saisie, enregistrée et liée en une seule validation. Un doublon évident doit être sélectionné dans les contacts existants.
- **Personnes** : nouvelles informations (organisation, adresse, notes), actions `tel:`, `sms:` et `mailto:` pour ouvrir les apps système compatibles. `sms:` ouvre Messages sur iPhone ; le système détermine si iMessage est disponible. Une PWA ne peut pas composer un appel sans intervention/confirmation d'iOS.
- **Import local de fichiers vCard (.vcf)** : aperçu avant confirmation, doublons simples ignorés, taille max. 8 Mo et 5 000 fiches traitées. Aucun transfert du fichier vCard pour l'analyse ; les contacts enregistrés peuvent ensuite faire partie des sauvegardes chiffrées facultatives du coffre. iOS Safari ne donne pas un accès universel au carnet natif via les PWAs : utiliser l'export vCard depuis Contacts.

Même stockage local, mêmes exports JSON/coffre chiffré (champs supplémentaires conservés), aucune migration D1, aucune fonction payante. Faire les essais manuels sur iPhone avant de considérer la version stabilisée.

Voir [docs/CONTACTS-BUDGET-V016.md](docs/CONTACTS-BUDGET-V016.md).

## V0.17 — contacts compacts, recherche A–Z, favoris et photos

Le module **Personnes** adopte une liste qui reste dans la largeur de l'écran : **une colonne sur iPhone**, deux sur grand écran, avec uniquement une photo/initiale et le nom de la personne. Les coordonnées restent dans la fiche au clic. L'ancienne grille dense est remplacée et ne touche pas les autres modules.

En haut du répertoire : recherche directe (nom, téléphone, e-mail, entreprise), filtre **Favoris**, filtre **Catégorie** et tri A–Z / Z–A / Favoris / Ajouts récents. Un index alphabétique latéral permet d'atteindre la première fiche d'une lettre lorsque le tri est alphabétique.

Les fiches enregistrent un favori `favorite`, plusieurs catégories `tags[]`, et une miniature `photo` facultative. Les catégories sont créées en saisissant des libellés séparés par des virgules lors de la modification de la fiche. Les anciennes personnes et leurs liaisons Agenda/Rappels restent inchangées.

L'import vCard récupère les champs `PHOTO` intégrés quand ils existent, les compresse localement en 96×96 px et peut compléter **uniquement les photos manquantes des contacts déjà importés**, après confirmation. On peut aussi choisir manuellement une image depuis sa fiche. L'import ne lit pas directement le carnet système iOS et ne télécharge jamais une URL PHOTO externe. Les miniatures suivent l'export JSON et, si activé, le coffre chiffré NEXUS.

**Tests automatisés en place** (syntaxe JS, parsing vCard et traitements métier). La validation visuelle sur Safari/PWA iPhone et avec un vrai export de photos Contacts reste indispensable.

Détails et tests de réception : [docs/CONTACTS-V017.md](docs/CONTACTS-V017.md).

### Contacts V0.17.2 — réimport complet sécurisé contre les pertes accidentelles

Depuis **Personnes → Gérer le carnet**, le réimport complet conserve les identifiants des contacts reconnus (liens Agenda/Rappels préservés), sauvegarde le contenu JSON avant remplacement et déplace les contacts absents dans la corbeille. Un bouton de vidage complet est aussi disponible via le système de corbeille existant, mais il peut casser les liens après création de nouveaux IDs. Le fichier `.vcf` affiche un compteur de photos intégrées avant confirmation.

**Limite de confidentialité :** stockage local non chiffré par NEXUS et origine GitHub Pages partagée avec les autres PWAs. Le coffre distant chiffre les snapshots, sans garantir une sécurité absolue ni protéger contre du code malveillant exécuté sur l'origine. Voir [docs/CONTACTS-V017.md](docs/CONTACTS-V017.md).
