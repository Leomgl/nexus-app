# NEXUS — Architecture cible (proposition V0.2)

## Vision produit
Une source d'information unique, avec des **objets reliés** plutôt que des modules isolés.

Objets principaux : Note, Événement, Tâche, Personne, Projet, Achat et Opération budgétaire. Chacun peut être relié aux autres, et chaque relation est navigable dans les deux sens.

Exemple :

- `Note: "Rendez-vous garage"` → relation `a-produit` → `Événement: "RDV garage"`
- `Note: "Rendez-vous garage"` → relation `a-produit` → `Tâche: "Apporter le devis"`
- `Événement` → relation `avec` → `Personne: "Alex"`

La même mécanique pourra accueillir plus tard des documents, lieux, habitudes et autres objets sans tout refaire.

## Workflow de développement (repris du guide RITUEL)
1. Prototype / validation UX en local (ce dossier).
2. Nouveau dépôt GitHub public **sans données privées** ; GitHub Pages HTTPS pour la PWA, manifeste et service worker.
3. Backend Cloudflare Workers avec API et **authentification obligatoire** avant l'accès à des données stockées dans D1.
4. Base D1 pour synchronisation entre appareils ; mécanisme de migration et export de données.
5. Web Push via Worker + Cron (après permission iPhone), tests sur vrai iPhone.
6. Rester sur les offres Free ; ne jamais activer la facturation sans consentement explicite.

## Source de vérité
- V0.1/V0.2 : IndexedDB local, aucune synchronisation. Export/import JSON.
- V0.3+ : D1 **après authentification** = source de vérité à synchroniser ; cache IndexedDB local pour le mode avion. Prévoir `revision`, `updated_at` et `deleted_at` pour conflits et suppressions.
- Une note ne crée rien toute seule : détection locale + proposition + confirmation explicite de l'utilisateur.

## Données et relations
- `items`: registre des identifiants, type, propriétaire, version, dates et état supprimé.
- `note_contents`, `event_details`, `task_details`, `person_details`, `project_details`, `purchase_details`, `transaction_details` : tables typées.
- `links`: relations plusieurs-à-plusieurs ; les deux extrémités doivent appartenir au même propriétaire.
- Extension plus tard : `tags`, `files`, `locations`, `reminder_rules`, `push_subscriptions`. Les plafonds budgétaires sont dans `budget_limits`.

Voir `schema-d1-projet.sql` pour le schéma V1, désormais **déployé sur D1 sans données privées**. L'API de synchronisation reste désactivée en attendant l'authentification.

## Sécurité et limites
- **Public** : tout code GitHub Pages ; les jetons, clés privées et données privées ne doivent jamais apparaître dans le dépôt ni côté client.
- Worker : vérifier l'identité utilisateur sur **chaque** requête ; les paramètres `owner_id` côté client ne sont jamais fiables. Limiter les actions et contrôler l'accès aux relations.
- À définir avant d'activer la synchronisation D1 : authentification (par exemple Cloudflare Access ou solution équivalente), session, stratégie de sauvegarde, suppression, chiffrement de données sensibles, verrouillage éventuel sur l'appareil.
- Notes médicales : ne pas publier ni entrer de véritables informations de santé dans cette version de démonstration. Ne pas promettre de chiffrement de bout en bout tant qu'il n'est pas mis en place.
- Contacts : NEXUS dispose d'un carnet interne et de liens `tel:` / `mailto:`. Une PWA iOS n'a pas le même accès direct au carnet iPhone qu'une app native.
- Calendrier Apple : export `.ics` ponctuel ; ce n'est **pas** une synchronisation bidirectionnelle, et un nouvel import peut créer des doublons.
- Push iPhone : Web Push depuis la PWA installée sur l'écran d'accueil (iOS 16.4+), permission après clic, envoi serveur avec des délais possibles ; pas encore mis en place ici.

## Itérations proposées
- V0.1 — interface + données locales + recherche + liens + suggestions simples + calendrier.
- V0.2 — projets, achats, budget, liens, recherche transversale, UX mobile (prototype présent).
- V0.3 — Worker + authentification + D1 + synchronisation.
- V0.4 — vraies notifications push, rappels récurrents, notifications contextuelles.
- V1 — relations plus riches, documents, capture intelligente, moteur de recherche global amélioré.


## Règles des nouveaux modules V0.2

- Montants stockés en **centimes entiers**, pour éviter les erreurs de flottants.
- Une liste d'achats représente des **intentions**, sans incidence sur le budget tant qu'une transaction n'a pas été enregistrée.
- Passer un achat à « acheté » n'enregistre **pas automatiquement** une dépense.
- L'enregistrement d'une dépense liée à un achat refuse les doublons.
- Les dépenses affectées à un projet constituent son coût réel ; le budget prévu reste distinct.
- L'état d'un projet et sa progression sont différents : la progression est calculée à partir des tâches directement liées.
- Supprimer un objet rompt les liens, mais **ne supprime pas** les objets associés.
- Une restauration JSON V0.1 doit initialiser les nouvelles collections vides, sans effacer les anciennes.
