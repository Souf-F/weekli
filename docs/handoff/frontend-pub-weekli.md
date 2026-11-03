# Handoff frontend : pub de Weekli

Date : 2026-10-25. Premier rendu de bout en bout (script, voix, moteur, audio, export).

## Livrables
- `apps/web/public/demo/weekli-pub.mp4` : 1920x1080, 30 i/s, H.264 + AAC, 45,4 s, 9,1 Mo (ré-encodé x264 crf 24, piste AAC copiée telle quelle ; l'export WebCodecs brut faisait 41 Mo).
- `apps/web/public/demo/weekli-pub.png` : miniature, image zéro du film.
- `docs/reviews/pub-weekli.png` : planche, une image toutes les 2 s.
- `apps/web/dev/pub-weekli.json` : script (trame vision-manifeste, gestes accent, soulignement, flou, 10 scènes, 143 mots, tutoiement). `nettoyerScriptPub` : 0 erreur, 0 avertissement.
- `apps/web/src/lib/pub/scenes/index.ts` : `registreScenes(script, options)` = tension + produit (le monogramme vient du script, une seule source).
- `apps/web/dev/pub-weekli.{html,css,ts}` : page de rendu (moteur, registre, composerAudio, exporter). Elle lit voix et captures sur un récepteur local (port 5195) et lui renvoie MP4 et PNG.

## Mesures
- ffprobe : 1920x1080, 30/1 i/s, h264 + aac, durée 45,44 s.
- ebur128 (fichier final) : -16,0 LUFS intégré, LRA 1,8 LU, crête -1,9 dBFS (crête vraie sous -1,5 dBTP). Limiteur de lib/pub/audio inchangé.
- blackdetect (0,1 s) : aucune image noire. Planche relue : aucun texte coupé.
- Voix : Vivienne (Microsoft) via voix-gec.ts et le protocole de voix.ts, sans secours Kokoro.

## Captures (réelles, aucune fausse donnée)
Accueil, section "Comment ça marche" de l'accueil, écran de connexion GitHub en lecture seule (l'app sans session n'affiche que lui). Marquées "importee" dans le script (le site n'est pas déployé).

## Limites connues
- La durée réelle (45 s) est sous la fenêtre de 50 s du guide : la voix Vivienne est plus rapide que l'estimation (52 s). Le script passe la validation sans avertissement.
- `Weekli` est lu tel quel par Vivienne (la prononciation du script ne s'applique qu'à Kokoro).
- Le lien final est le dépôt GitHub (pas de domaine de production connu).
- Les cartes de la scène résultat et les captures de l'accueil montrent un exemple illustratif (scanner-ssl) tiré du site.
