# NEXUS V0.21.8 — réception du catalogue complet VESTIAIRE
12 novembre 2026 · Suite de FORGE #11.

## Modifications
- Réception de `vestiaire.catalog.page.v2` en plusieurs événements chiffrés sans élargir les permissions NEXUS LINK existantes.
- Chaque page contient un résumé de 0 à 24 looks, à une révision, un index et un batchId communs.
- NEXUS vérifie forme, unicité, nombre, index, limite de pages (200), contenu autorisé et cohérence des versions.
- Les pages validées sont conservées dans `data.vestiaireTransfers[]`, **nouvelle collection additive** dans le snapshot local IndexedDB et les exports de Nexus. Aucun changement de base / d'identifiant / de modèle de calendrier.
- Vérification de l'écriture IndexedDB avant acquittement du message. Si le navigateur est fermé, les lots validés survivent et le transfert reprend.
- NEXUS ne remplace `vestiaireCatalogs[]` qu'après réception complète et suppression des doublons, puis supprime le brouillon. Le précédent catalogue (24 tenues) continue à servir les suggestions pendant le chargement.
- Les anciens messages V1 continuent d'être acceptés ; si une nouvelle version est en cours, un ancien lot ne peut pas écraser la génération récente.
- Les mêmes ID et choix d'agenda `vestiaireSelections[]` sont conservés. Aucune photo, liste détaillée de vêtements ou événement Nexus n'est échangé.
- Envoi/validation sont lancés par les deux PWA ouvertes, aucune synchronisation dans le fond, aucun nouveau Worker Cloudflare ou secret.
- Le bouton Recevoir traite au maximum 50 messages par appel (limite du relais), à répéter si un catalogue exceptionnellement grand est encore en cours.

## Déploiement et iPhone
Livrer **NEXUS avant Vestiaire V0.7.1** ; l'ancien Nexus refusait le format page V2 et ne l'acquittait pas. Les messages chiffrés restant en attente peuvent être reçus après mise à jour. Conserver les sauvegardes privées NEXUS et Vestiaire. Vérifier le nombre de tenues, la progression des lots, un look au-delà du 24e, une sélection d'agenda existante et la réception après coupure.

## Tests
V1 valid, v2 pages validation, mode incomplet préservant les 24 anciennes tenues, réception hors ordre de 61 tenues, vérification avant ACK. CI et Safari réels doivent être distingués.
