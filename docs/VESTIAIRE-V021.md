# NEXUS V0.21.0 — Vestiaire contextuel · 11 novembre 2026

> **Statut : code sur GitHub et Workers Cloudflare mis à jour ; tests automatisés réussis. Recette réelle sur les deux PWA iPhone à valider.**
> Relire [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) pour reprendre dans un autre thread.

## Vision et limites

NEXUS reste la **source de vérité du calendrier, de la météo et des choix pour un événement**. VESTIAIRE reste la **source de vérité des vêtements, photos, disponibilité et looks**. Il n'existe **aucune lecture inter-origine d'IndexedDB**.

- Le partage des tenues est **opt-in** : jumelage chiffré via NEXUS LINK, code privé à copier manuellement, scope unique `outfit_catalog`.
- VESTIAIRE → NEXUS seulement : **ID, nom, occasion, style, disponibilité, indice de chaleur** (0–3) et date de dernière modification. **Aucune photo, mannequin, liste de vêtements, contact, adresse, note détaillée ou calendrier** n'est transmis.
- Les messages sont chiffrés côté navigateur AES-GCM par `NexusLinkCore`. L'API Cloudflare sert de relais aveugle : elle ne connaît pas les noms des tenues. Seuls les détenteurs des secrets de jumelage peuvent lire/écrire.
- Aucun transfert automatique au premier lancement. Après jumelage, depuis **VESTIAIRE → Réglages**, cliquer **Envoyer mes tenues**, ou cocher explicitement **Envoi automatique lorsque Vestiaire est ouverte**. Les changements ne partent pas lorsque la PWA est fermée.
- La réception côté NEXUS se fait lorsqu'il est ouvert ou de retour au premier plan, avec un bouton **Recevoir** pour forcer la vérification. Aucun Web Push créé.
- Le catalogue envoyé contient au maximum **24 looks récents**, avec contrôle des 5 500 octets JSON avant chiffrement ; si davantage de looks existent, l'interface Vestiaire affiche combien sont hors lot. Pas de réplication de dressing complet.

## Comportement dans Pulse

Nouveau widget `outfit` **Tenue du jour** (activable/désactivable et déplaçable via Réglages). Migration non destructive de `UI.widgets` vers `pulseVersion:21` ; anciens widgets et leurs masquages sont préservés.

L'algorithme local de `vestiaire-v021.js` :
1. Cherche le prochain événement **dans les 72 heures** avec une occasion reconnue depuis le titre ou les détails. Exemples : restaurant, dîner, soirée, réunion client, sport, voyage, balade.
2. Récupère les résumés chiffrés déjà reçus depuis VESTIAIRE et écarte les tenues dont une pièce est indisponible.
3. Classe les tenues par **occasion + style + température ressentie + risque de pluie**. Si la météo n'est pas en cache, seules occasion et style comptent. La météo Pulse peut correspondre à une autre ville que le restaurant : **ne jamais prétendre connaître la météo exacte du lieu**.
4. Affiche les **3 meilleures suggestions** (noms seulement, pas de photos). Les résultats sont des heuristiques explicables, pas une IA générative.
5. **Choisir** une tenue associe localement `eventId ↔ lookId` dans `data.vestiaireSelections[]`, visible dans la fiche Agenda, avec retrait possible. **Aucune modification du planning ni des looks VESTIAIRE**, aucun achat, dépense ou push.
6. **Ouvrir dans Vestiaire** utilise une URL de deep link avec l'ID opaque du look (`?look=ID`) ; l'app VESTIAIRE retrouve et ouvre le Studio si le look existe sur cet appareil. Sur iPhone, le navigateur peut ouvrir l'URL plutôt que la PWA installée.

Sans connexion, Pulse propose de connecter Vestiaire. Sans look reçu, il invite à envoyer un catalogue depuis Vestiaire. Sans événement reconnu, il affiche un message neutre. Pas de résultat inventé.

## Couche LINK et stockage

**Côté NEXUS :**
- `app.js` ajoute deux collections optionnelles `vestiaireCatalogs[]` et `vestiaireSelections[]`, sauvegardées dans le même snapshot local et le coffre chiffré si activé. `assignData()` complète les anciennes sauvegardes par des tableaux vides, sans modifier les autres modules.
- `vestiaire-v021.js` crée, reçoit et révoque la liaison ; validation stricte du format `vestiaire.catalog.v1` ; rejet des catalogues invalides et révisions obsolètes ; stockage vérifié dans IndexedDB **avant** acquittement du message chiffré, afin d'éviter de perdre les propositions.
- Les sélections ne sont enregistrées que sur clic utilisateur. Une révocation retire le catalogue et les sélections du snapshot courant NEXUS, mais **ne supprime pas les anciens exports JSON/coffres déjà archivés**.
- `link-core.js` ajoute `vestiaire` aux apps de jumelage autorisées sans changer la cryptographie ni les scopes de Gaming et Rituel.
- `pulse-v018.js` expose un slot de widget `outfit`. CSS isolé dans `vestiaire-v021.css`.
- `index.html`, `sw.js` : version V0.21.0, assets `?v=0210`, cache offline actualisé.

**Côté VESTIAIRE :**
- `nexus-link-core.js` : client de chiffrement NEXUS LINK identique à la base NEXUS, chargé uniquement par la PWA Vestiaire ;
- `vestiaire-nexus-v06.js/css` : import du code, consentement, catalogue résumé local, publication chiffrée, envoi facultatif pendant l'ouverture, révocation ;
- `app.js` expose un adaptateur limité au module et sait ouvrir un look précis depuis `?look=...`.
- Jumelage et autorisation sont conservés localement dans les préférences Vestiaire, **inclus dans les exports .vestiaire non chiffrés**. Ne pas partager une sauvegarde .vestiaire (elle peut contenir le secret LINK).
- `edge-web/worker.js` autorise les nouvelles ressources JS/CSS et l'API LINK dans la CSP, sans stockage serveur des photos.

**Cloudflare :**
- `backend/src/index.js` : autorisation CORS de l'origine Vestiaire **uniquement sur /api/v1/link/**, pas sur le coffre, les passkeys ou les notifications.
- `bridge/worker.js` : scope `vestiaire.outfit_catalog` et autorisation d'origine Vestiaire. Toujours D1 existant, pas de nouvelle table.
- Déploiement des 3 Workers fait via API Cloudflare le 11/11/2026 avec `bindings_inherit=strict`. Secret LINK_PEPPER, DB, LINK_RELAY et VAPID hérités et vérifiés après mise à jour ; **aucun secret publié dans GitHub**.

## Parcours de recette iPhone (obligatoire)

1. **Sauvegarder NEXUS et VESTIAIRE** au préalable (exports privés), ne désinstaller aucune PWA.
2. Ouvrir NEXUS V0.21.0 → Réglages → **Vestiaire · Tenues contextuelles** → **Créer la connexion Vestiaire**, copier le code privé.
3. Ouvrir VESTIAIRE V0.6 → Réglages → **NEXUS · Suggestions de tenues** → coller le code puis connecter.
4. Avec au moins 3 looks locaux, envoyer le catalogue manuellement ; vérifier qu'aucune photo n'est transférée. Tester le compteur si plus de 24 tenues.
5. NEXUS → Réglages → Vestiaire → **Recevoir** : vérifier le nombre de looks.
6. Ajouter un RDV « Restaurant ce soir » dans l'Agenda, vérifier la carte Pulse, l'ordre des suggestions et l'exclusion d'une veste au pressing.
7. Choisir une tenue ; ouvrir sa fiche Agenda, vérifier la liaison. Changer de tenue / annuler sans modifier le dressing.
8. Vérifier le bouton « Ouvrir dans Vestiaire », et le comportement sur iPhone quand la PWA est installée.
9. Dans Vestiaire, changer la disponibilité d'une pièce, envoyer de nouveau ; NEXUS doit actualiser les suggestions sans doublons.
10. Tester hors ligne (catalogue déjà reçu utilisable, bouton Recevoir montre une erreur ou état réseau), puis révocation et disparition des suggestions. Vérifier que Gaming/Rituel et le budget n'ont pas changé.

## À faire plus tard

- V0.22 Command Center, recherche globale, parsing contextuel gratuit.
- Synchronisation optionnelle du **choix de tenue vers le planning local Vestiaire** dans un scope séparé, seulement après accord : pas inclus en V0.21.
- Améliorer la granularité météo : localisation du rendez-vous ou prévisions au moment réel de l'événement, uniquement avec consentement.
- Gestion des catalogues au-delà des 24 looks via pages chiffrées ou index incrémental ; pas de partage massif automatique.
- Test réel multi-apps + contrôle de confidentialité d'une sauvegarde .vestiaire contenant la clé LINK.
