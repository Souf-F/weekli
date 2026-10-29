# Handoff frontend : F14, F3, F12, F13

## Livré
- **F14 Post LinkedIn** : `apps/web/src/pages/Studio/PanneauPost.tsx` (sous l'export, dans l'éditeur). Mode clé API : `lib/post-projet.ts` appelle Claude depuis le navigateur avec `donneesPostProjet`, `CONSIGNE_POST_PROJET` et `REGLES_POST_PROJET` (sortie JSON structurée : `questions` ou 2 à 3 `versions`). Si le pourquoi ou la démarche manquent, le panneau affiche les questions, puis relance avec les réponses. Versions éditables, copie en un clic, régénération. Sans clé : explication « propose-moi un post pour mon projet X » et lien vers les réglages. Tirets longs retirés de la sortie. Tests : `lib/post-projet.test.ts`.
- **F3 Style** : `Reglages/PanneauStyle.tsx` (GET, PUT, DELETE `/api/style`, compteurs 8000 et 2000). `lib/style.ts` : migration unique depuis `weekli.prefs.style` (envoyé au serveur seulement si le serveur n'a rien, puis supprimé du navigateur dans tous les cas). `reglages.ts` n'écrit plus le style. Tableau de bord et panneau Post lisent le style du serveur à chaque génération.
- **F12 RGPD** : `Legal/Confidentialite.tsx` réécrite (contact, bases légales, tableaux de conservation et de sous-traitants, Microsoft pour la voix off, transferts hors UE, 90 jours renouvelés, export, effacement). Mentions légales : contact, GPL-3.0 (corrige l'ancien « MIT »), attribution SIWIS (CC BY 4.0), Kokoro Apache-2.0, adresse Cloudflare vérifiée (101 Townsend St, San Francisco, CA 94107). Bouton « Télécharger mes données » dans `PanneauDonnees.tsx` (GET `/api/moi/donnees`, fichier `weekli-donnees.json`).
- **F13** : `Accueil/sections/LecteurPub.tsx` lit `/demo/weekli-pub.mp4` (46 s) avec `weekli-pub.png` en affiche, local, muet par défaut, lecture seulement visible à l'écran, jamais lancée si `prefers-reduced-motion`, boutons « Lire la pub / Mettre en pause » et « Activer le son / Couper le son » (`aria-pressed`). `public/robots.txt` ajouté.
- Correctif : débordement horizontal à 375 px dans Réglages (`Reglages.module.css`). Démo (`lib/demo/installer.ts`) : routes `/api/style` et `/api/moi/donnees` ajoutées.

## Vérifié dans apps/server (affirmations de la page)
Session 8 h chiffrée (AES-256-GCM, `session.ts`), TTL 90 jours renouvelé à chaque écriture (`conservation.ts`), entrées périmées retirées à la lecture, grant MCP 30 jours fixes, DO 24 h, captures non stockées (`capture.ts`), limiteur auth par IP 20 par minute, API par compte, export sans token, effacement en 5 étapes (`donnees.ts`), voix : texte seul (400 caractères max) envoyé à Microsoft, 60 phrases par heure, cache audio KV 90 jours indexé par empreinte, non rattaché au compte.

## Limites et points à trancher
- Le cache audio de la voix et l'IndexedDB du navigateur ne sont pas effacés par « Supprimer mes données » : la page Confidentialité le dit explicitement.
- Le cache audio n'est pas renouvelé à la lecture (90 jours depuis l'écriture).
- `weekli-pub.png` pèse 3,9 Mo (affiche) : à recompresser en WebP pour la performance.
- Pas de sous-titres sur la pub de démonstration.
- Le panneau Post n'est pas encore sur la page du projet hors studio. Génération non testée avec une vraie clé Anthropic (chemin d'erreur testé).
- Base légale, DPF des sociétés et relecture juridique restent à valider par Soufiane (H3).
