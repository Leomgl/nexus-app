# NEXUS — Vérification V0.2

## Vérifié dans le navigateur de test
- [x] Chargement des écrans Accueil, Plus, Projets, Achats, Budget et Notes sans erreur JavaScript.
- [x] Création d'un projet avec budget prévisionnel.
- [x] Création d'une tâche depuis ce projet, lien projet conservé.
- [x] Création d'un achat depuis ce projet, lien projet conservé.
- [x] Marquer l'achat comme effectué sans créer de transaction.
- [x] Créer manuellement une transaction depuis l'achat et retrouver le lien projet / achat.
- [x] Total des dépenses calculé en centimes.
- [x] Définir un plafond mensuel.
- [x] Créer un achat depuis une suggestion de note, lien note conservé.
- [x] Recherche globale de la note et de l'achat associé.
- [x] Restaurer un export JSON V0.1 avec nouveaux modules vides.
- [x] Export JSON V0.2 contenant les huit collections.

## À valider après publication HTTPS
- [ ] Persistance réelle IndexedDB après fermeture/réouverture sur iPhone.
- [ ] Installation depuis Safari → écran d'accueil iOS.
- [ ] Cache et mode hors ligne après premier lancement.
- [ ] Restauration/import par l'utilisateur sur iOS.
- [ ] Affichage mobile sur différents modèles.
- [ ] Vérification des liens et appels téléphoniques / e-mails.
- [ ] Web Push (non développé en V0.2).

Le banc de test navigateur actuel ne permettait pas l'accès complet à IndexedDB avec son origine éphémère : l'interface et les flux métiers ont été testés en mémoire. La persistance est une étape distincte non annoncée comme validée.
