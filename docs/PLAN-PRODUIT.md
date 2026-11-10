# NEXUS — Plan de produit (version de travail)

## Promesse
NEXUS n'est pas une collection de mini-apps : tout élément peut contenir des informations et être relié aux autres. Capture rapide d'abord, organisation ensuite.

## Modules actifs V0.2
| Objet | Champs de base | Relations |
|---|---|---|
| Note | titre, contenu, date d'édition | projet, RDV, rappels, achats, opérations |
| Événement | titre, date/heure, lieu, détails | personne, note d'origine, projet |
| Rappel | titre, échéance, terminé | personne, note, projet |
| Personne | nom, rôle, téléphone, courriel | événement, rappel |
| Projet | titre, description, statut, échéance, budget prévu | tâches, notes, achats, dépenses |
| Achat | article, prix prévisionnel, priorité, statut, boutique | projet, note, opération liée |
| Opération | recette/dépense, montant en centimes, catégorie, date | projet, achat, note |
| Plafond | mois, limite en centimes | calculs mensuels |

## Workflows à conserver
- **Rendez-vous** : une note mentionne « samedi 14 h médecin » → l'utilisateur confirme la date, personne, lieu → NEXUS crée l'événement avec lien à la note. Les horaires doivent rester vérifiables avant confirmation.
- **Achat** : « acheter un SSD » dans une note → proposition d'achat → ajout à un projet → marque « acheté » → bouton « ajouter au budget » → transaction unique liée à l'achat.
- **Projet** : créer un projet → ajouter notes et tâches → progression calculée sur les tâches terminées, dépenses issues des transactions attachées.
- **Budget** : planifier les achats ne réduit pas le solde. Seules les transactions enregistrées comptent. Le solde du mois désigne recettes moins dépenses, PAS le solde bancaire.

## Backlog / améliorations futures
1. **V0.3** : authentification sans frais, base de données D1, synchronisation multiappareil, prévention des conflits, import V0.1/V0.2, migration sans perte.
2. **V0.4** : vraie notification Web Push iOS pour événements et tâches, rappels récurrents, paramètres de consentement, test sur iPhone verrouillé.
3. **V0.5** : pièces jointes, factures, photos de produits, liens marchand, états de livraison, dépenses récurrentes, plafonds par catégorie.
4. **V0.6** : projets avec jalons, catégories, tableaux, rendez-vous/projets multi-intervenants, filtres et tags transversaux.
5. **V1** : capture rapide enrichie, calendrier amélioré, recherche sémantique facultative si une solution gratuite et privée est viable, partage choisi entre amis.

## Principes immuables
- 0 € de dépenses d'infrastructure ; pas d'abonnement ni coût caché.
- Aucune clé privée ni donnée personnelle dans le dépôt GitHub public.
- Installation PWA iOS hors App Store ; pas de renouvellement de signature.
- Notifications seulement après consentement, et jamais considérées garanties tant que le test réel n'est pas passé.
- Sauvegarde, version de schéma et migrations à chaque évolution.
- Aucun enrichissement « intelligent » ne crée un élément sans validation explicite.
- Une suppression ne doit pas effacer automatiquement les objets associés.
- Données financières et santé : concevoir la sécurité avant synchronisation.
