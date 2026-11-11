# NEXUS 0.19+ → RITUEL 1.8 — liaison voyages

Date : 2026-11-11. Handoff inter-apps.

## Implémenté
- Un événement agenda peut être marqué explicitement `tripType:'travel'`, avec `returnDate` obligatoire, intervalle valide de 0 à 45 nuits.
- Le module `nexus-travel.js` ajoute dans les Réglages « Voyages → Trousse RITUEL » : jumelage indépendant, code NXL1, événements marqués, envoi volontaire, révocation ciblée.
- Un nouveau scope `trip_context` est autorisé sur la liaison RITUEL dans `bridge/worker.js`. Il utilise une **deuxième connexion** plutôt que de changer le scope de l'import RITUEL existant. Aucun changement de schéma D1.
- `connections.js` et `rituel-import.js` excluent la connexion retour du calcul des connexions de réception RITUEL, pour ne pas perturber le flux historique RITUEL → NEXUS.
- `data.travelOutbox` suit l'empreinte et la révision de chaque événement envoyé. Pas d'envoi automatique. Payload chiffré minimal `{type:'nexus.travel.v1', destination:'rituel', eventId,title,startDate,endDate,nights}`.
- Dans RITUEL, `rituel-travel.js` déchiffre, contrôle le scope et les dates, puis permet d'accepter / ignorer une proposition. La trousse est créée **après accord explicite**.
- Gaming reste autonome et inchangée.

## Utilisation
1. NEXUS → Réglages → Voyages vers RITUEL → Créer le jumelage → Copier.
2. RITUEL → Trousse → Mes trousses → Mes voyages → Coller → Jumeler.
3. NEXUS → Agenda → événement → cocher Voyage / week-end, saisir retour.
4. NEXUS → Réglages → Voyages vers RITUEL → Proposer ce séjour.
5. RITUEL → Mes voyages → Recevoir → choisir modèle → Préparer cette trousse.

## Garanties & limites
- Pas de détection heuristique d'un simple RDV et pas d'accès direct au calendrier iOS.
- Aucun lieu, invité, contact ou détail n'est transmis ; le titre est compris dans le message chiffré uniquement si l'utilisateur choisit de l'envoyer.
- Création d'une copie de trousse modèle ; la révision d'un séjour ne réinitialise pas les cases cochées.
- Les traitements hors-ligne restent locaux ; l'envoi/réception demande Internet.
- Les deux côtés détiennent le secret NXL1 correspondant à la deuxième connexion : préserver ce code et ne jamais le publier.
- La livraison technique n'est pas un test physique iPhone. Validation de bout en bout à effectuer avant clôture du ticket #3.
- Le visuel Rituals est une URL officielle dérivée du SKU ; un nouveau conditionnement ou retrait de la photo peut provoquer un repli visuel.

## Points de contrôle
- Tests Node dans `tests/travel-link.test.cjs` : validation des plages de dates et séparation des scopes.
- `nexus-link-api` possède encore les bindings `DB`, `LINK_PEPPER`.
- `rituel-web` possède encore `NEXUS_API`, `RITUEL_PUSH`.
- Les scripts sont cachés par leurs Service Workers respectifs avec changement de version.
