# Handoff frontend : finitions voix, miniature, sous-titres

## Voix Kokoro au choix
- Studio, onglet Voix : quatre choix, « Vivienne (Microsoft, en ligne) », « Kokoro (dans ton navigateur, rien n'est envoyé) », « Ma voix (importée) », « Sans voix ».
- Le schéma de core garde trois modes. Vivienne et Kokoro sont donc le même mode `synthese` ; le moteur est un état de l'éditeur (`MoteurVoix`, par défaut Vivienne, non enregistré avec la pub). Il est passé à `useVoixPub(script, sansServeur)` puis à `synthetiserVoix({ sansServeur })`. L'export suit le même choix.
- Avec Kokoro, aucun appel à `/api/voix`. Test : `lib/pub/audio/voix.test.ts` (« avec Kokoro choisi, aucune requete vers /api/voix », fetch espionné). Changer de moteur rend la voix générée périmée (signature).
- Fichiers touchés hors zone prévue : `hooks/useVoixPub.ts` (paramètre `sansServeur`).
- Confidentialité : le passage « Microsoft et la voix off » cite Kokoro parmi les choix qui n'envoient rien.

## Miniature
- WebP impossible (ffmpeg sans libwebp, pas de cwebp) : `public/demo/weekli-pub.jpg`, JPEG qualité ffmpeg 3 (équivalent q82 environ), 74 Ko, 1920x1080. PNG supprimé, référence du lecteur mise à jour.

## Sous-titres
- `public/demo/weekli-pub.vtt` (16 cues) ajouté au lecteur : `<track kind="captions" srcLang="fr" default>`.
- Généré avec `genererSrt` (même découpage et même décalage de voix que l'export) sur la timeline de `calculerTimeline`. Les MP3 de rendu n'existent plus : les durées de voix ont été recalées pour retrouver les débuts de scène visibles dans le MP4 (2,6 ; 5,8 ; 12,4 ; 30,2 ; 35,4 s). Écart possible de 0,2 s sur certaines phrases.
- Vérifié dans le navigateur (Vite 5196, arrêté) : piste `captions` fr, 16 cues, bon texte actif à 1, 4, 8, 26, 31 et 36 s.

## Contrôles
typecheck, build et `npm test` : voir le rapport de session.
