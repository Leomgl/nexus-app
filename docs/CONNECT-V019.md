# NEXUS Connect 2.0 · V0.19.1 (11 novembre 2026)

> **État : code intégré dans NEXUS, Gaming et RITUEL sur GitHub ; tests automatiques NEXUS passés. Recette PWA iPhone et disponibilité Cloudflare des apps sources à vérifier séparément.**
> Lire [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) avant un nouveau thread.

## Vision

NEXUS est le centre. Gaming, Rituel et Vestiaire conservent leurs propres bases et interfaces spécialisées. Connect ne remonte vers NEXUS **que les faits autorisés et utiles** : dépenses confirmées, échéances et propositions. Les données ne sont jamais fusionnées en arrière-plan directement entre les bases.

- **NEXUS LINK existant** : messages chiffrés côté client via `link-core.js`, relayés par Cloudflare LINK et des scopes par app.
- **V0.19** : ajout d'un orchestrateur de réception dans NEXUS (`connect-v019.js`) et d'un moteur d'import budgétaire **avec opt-in explicite** et anti-doublons.
- **Pas de nouveaux endpoints**, pas de tables D1, pas de service payant. Aucun changement de protocole chiffré.
- **Vestiaire** : contrat de suggestions contextuelles prévu plus tard (V0.21), pas encore branché en V0.19.

## Ce qui fonctionne en V0.19

### Réception sans devoir fouiller dans les menus

Quand le jumelage existe et que `autoReceive` est activé (par défaut), NEXUS vérifie les nouveaux messages lors de l'ouverture, au retour au premier plan et périodiquement **uniquement lorsque la PWA est ouverte**. Les apps spécialisées doivent aussi avoir transmis les changements ; ce n'est pas du Web Push en arrière-plan. Le bouton **Réglages → Connect 2.0 → Recevoir** force une vérification.

- Un message chiffré valide est conservé dans `data.linkInbox`, avec `sourceKey`, `revision`, statut `pending` / `accepted` / `rejected`.
- Le relais est acquitté seulement lorsque le stockage local de l'inbox a pu être vérifié.
- La réception en arrière-plan d'une session **ne remplace pas** le texte en cours de saisie dans une zone active.
- Les nouveaux éléments non financiers (rappels, propositions d'événements, notes) restent **à examiner**.

### Pass payé Gaming → Budget NEXUS

1. Dans **NEXUS → Réglages → Applications & connexions → Gaming**, autoriser `pass_paid` et jumeler Gaming (si la permission existe déjà, ne pas révoquer sans raison).
2. Dans **Gaming → Modifier un pass**, cocher « J’ai acheté le pass », saisir le **prix réellement payé** et la **date réelle d'achat** dans le nouveau champ `paidDate` (distinct de la fin de saison).
3. Dans Gaming → NEXUS LINK, **Envoyer maintenant**, ou activer l'envoi automatique (qui fonctionne quand Gaming est ouverte).
4. Dans **NEXUS → Réglages → NEXUS Connect 2.0**, activer **Pass Gaming payé → Budget**. Par défaut ce droit est **désactivé**.
5. NEXUS reçoit un `gaming.proposal.v1` avec scope `pass_paid`, cible `transactions`, `sourceId` stable terminé en `:paid`, `priceCents > 0`, `currency: "EUR"`, `isPaid: true`, `paymentDate` une date réelle valide.
6. L'inscription crée une transaction `type: "expense"` en **centimes entiers**, avec date réelle, catégorie `Loisirs`, `originApp: "gaming"`, `originSourceId` et `originLink`. Le journal et les graphiques NEXUS s'actualisent car ils lisent `data.transactions`.

Si le pass est **suivi sans achat**, ou si le prix / la date réelle manque, aucune dépense n'est créée automatiquement. La proposition reste à examiner manuellement, avec saisie de date corrigée. **La date de fin de saison ne sera jamais utilisée comme date d'achat.**

### Produit acheté RITUEL → Budget

1. Consentement `product_paid` depuis NEXUS, jumelage RITUEL, puis achat explicitement inscrit dans RITUEL (`state.purchaseLog`, prix positif et date confirmée).
2. Envoyer depuis RITUEL, ou utiliser son envoi automatique lorsque l'app est ouverte.
3. Dans NEXUS → Connect 2.0, autoriser **Produit Rituel payé → Budget** (désactivé par défaut).
4. Inscription de la transaction au Journal (catégorie `Shopping`), date et montant réels, provenance `rituel`.

Un stock faible, une baisse de niveau, un réassort estimé, ou une routine **n'est pas** un paiement. Ces éléments restent des propositions d'achat ou de rappel, jamais une transaction réelle automatique.

### Révisions, anti-doublons, restauration

- Message unique d'une app : identifiant stable `(originApp, originSourceId)` pour les dépenses, en plus du tuple du relais `(pairId, sourceKey, revision)`.
- Un nouvel envoi de la **même** dépense déjà acceptée réutilise son identifiant transaction au lieu d'en créer un deuxième, y compris après nouveau jumelage s'il existe une trace de provenance dans le Journal ou dans l'inbox historique acceptée.
- Une **révision** d'un achat déjà accepté passe en `pending` avec son `targetId` : elle **n'est pas** appliquée automatiquement. Ouvrir la proposition et confirmer la mise à jour manuellement.
- Une suppression ou annulation côté Gaming/RITUEL ne supprime **jamais** automatiquement une dépense historique déjà enregistrée. Les annulations et corrections feront l'objet d'un contrat spécifique.
- Les écritures sont enregistrées puis **relues depuis IndexedDB** (`verifyLinkedBudgetRecord`) avant acceptation définitive. En cas d'échec, le nouvel objet et la transition d'inbox sont annulés dans la mémoire et la proposition reste en attente.
- Une écriture créée manuellement hors NEXUS LINK, sans provenance, **ne peut pas être dédupliquée de manière certaine** automatiquement ; vérifier le Journal lors des premiers essais.

## Fichiers concernés

| Dépôt | Fichier | Rôle |
|---|---|---|
| NEXUS | `connect-v019.js` | Orchestrateur de réception, consentements, import financier validé, anti-doublons |
| NEXUS | `app.js` | Écran de réglages, attachement module, vérification IndexedDB, routage des actions |
| NEXUS | `link-import.js` | Gaming, date réelle pour examen manuel, provenance et réception sans interruption de saisie |
| NEXUS | `rituel-import.js` | RITUEL, provenance et réception sans interruption de saisie |
| NEXUS | `index.html`, `sw.js` | Assets `?v=0190`, cache `nexus-v0.19.0` et version visible |
| Gaming | `app.js` | Champ de date d'achat d'un pass |
| Gaming | `nexus-sync.js` | Données d'achat explicite, prix/date/devise et stable source ID |
| RITUEL | `rituel-nexus.js` | Métadonnées `paymentDate`, `isPaid`, `currency` |
| Apps sources | `index.html` et `sw.js` | Actualisation du cache PWA pour les nouveaux modules LINK |

## Préférences et confidentialité

`localStorage['nexus_connect_v019_preferences']` :
- `autoReceive` : `true` initialement, réception uniquement quand l'app est ouverte. Peut être désactivé.
- `autoGaming` : `false` initialement, enregistrement budget après activation explicite et scope `pass_paid`.
- `autoRituel` : `false` initialement, idem pour `product_paid`.

Ces préférences sont **locales à l'appareil**, non synchronisées dans le coffre chiffré. Pour un autre appareil, choisir les réglages indépendamment. L'utilisateur peut révoquer les permissions et le jumelage depuis NEXUS.

**Limite sécurité importante :** le code de NEXUS tourne encore sur l'origine `leomgl.github.io` partagée avec d'autres PWAs ; les données IndexedDB locales ne sont pas chiffrées. Le transport NEXUS LINK est chiffré mais cela ne garantit pas l'isolation face à du JavaScript malveillant sur la même origine. La migration prudente vers une origine dédiée reste un chantier prioritaire, avec export/restauration et tests Web Push.

## Recette manuelle à effectuer sur iPhone

1. Vérifier **NEXUS V0.19.0**, naviguer vers Réglages → Connect 2.0, puis examiner les trois options.
2. Avant activation des imports financiers, faire une **sauvegarde JSON** (fichier non chiffré, à protéger).
3. Dans Gaming : suivre un pass **sans achat** → aucune dépense NEXUS.
4. Cocher « Pass acheté », saisir prix et date d'achat réels → publier depuis Gaming.
5. Dans NEXUS, autoriser l'import automatique, recevoir les messages ; vérifier **une seule dépense**, le bon mois et le prix correct.
6. Recevoir une nouvelle fois → **aucun doublon**.
7. Modifier ensuite montant/date dans Gaming → réexpédier ; vérifier que la révision reste **en attente**, puis corriger manuellement.
8. Tester un pass sans date d'achat → pas d'auto-import ; validation manuelle possible.
9. Dans RITUEL, acheter explicitement un produit, envoyer, vérifier l'inscription unique et la bonne catégorie.
10. Désactiver une permission côté NEXUS → aucune nouvelle écriture automatique.
11. Ouvrir une note non enregistrée, laisser l'app recevoir un message → la saisie ne doit pas disparaître.
12. Mode avion : pas de faux succès. Ouvrir les apps après retour en ligne.
13. Restaurer une sauvegarde et vérifier que les identifiants source subsistent.

**À valider séparément :** statut réel des déploiements Cloudflare Gaming/RITUEL. Le push GitHub ne prouve pas que les Workers de diffusion servent immédiatement la dernière version.

## Étapes suivantes (hors V0.19)

- Signal d'annulation de paiement et gestion de révision plus guidée, audit des permissions.
- V0.20 : Budget avancé (Quotidien, Engagements, Objectifs).
- V0.21 : Vestiaire suggestions contextuelles de tenues pour RDV + météo, avec consentement.
- V0.22 : Command Center (recherche universelle et capture intelligente).

### Correctif V0.19.1

Le rollback après refus de la vérification IndexedDB restaure aussi l'état persisté et supprime les métadonnées transitoires de la proposition. Le service worker NEXUS et les paramètres de cache des scripts `app.js` / `connect-v019.js` ont été incrémentés pour ne pas servir une version précédente dans la PWA iPhone.
