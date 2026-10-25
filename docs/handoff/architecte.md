# Handoff architecte : captures rares, scènes d'explication, anti-répétition, variété

Date : 2026-10-25. Branche `feat/weekli-v1`, rien de commité.

## Fait

- **Anti-répétition** : `packages/core/src/pub/repetition.ts` (idées connues : 2 scènes ou plus ; mots significatifs : 3 scènes ou plus ; tension exclue ; reprises du slogan par la fin ignorées), branché dans `nettoyerScriptPub` ; règle dans `REGLES_PUB` ; détail `design.md` 8.18.
- **Captures** : 2 scènes-capture au plus, but `montrer`, 2,5 s au plus (`bornesScene` et `estCapture` dans `timeline.ts`), voix de 5 mots, `LIMITES_PUB.capturesScene`. Troisième capture : liste vide et avertissement.
- **Trois scènes d'explication** : `transformation`, `flux`, `avantapres` (types, `ICONES` à 28 identifiants, schéma, nettoyage, `DUREES_SCENE`, transitions par défaut, `BUT_DEFAUT`, catalogue en 14 rubriques, trames). Spécification de dessin en `design.md` 8.17.
- **Variété** : `graineDepuisRepo(repo)` et `entree.graine` dans `scriptPubDepuisReponses` (jeu de gestes, accroche, ordre des explications, icônes). Script de départ réécrit : 3 explications, une capture brève au plus, sans chorus, `resultat` sans la promesse.
- **Pub de Weekli** (`apps/web/dev/pub-weekli.json`) : 11 scènes, 51 s, aucun avertissement, une capture, trois explications, gratuité dite une fois. Test `pub-weekli.test.ts`.
- Docs : `design.md` (8.9, 8.10, 8.13, 8.15, 8.16, 8.17, 8.18), `api-contract.md` 2.1, `changelog.md` (2026-10-25).

## Vérifications

- `npx tsc --noEmit` et `npx vitest run` dans `packages/core` : verts (243 tests).
- `apps/web` et `apps/server` : `tsc --noEmit` sans erreur (le registre de scènes ne force pas encore les nouveaux types).

## Pour l'agent frontend (opus)

1. Dessiner `transformation`, `flux`, `avantapres` dans `apps/web/src/lib/pub/scenes/` selon `design.md` 8.17 (composition 1920 x 1080, chronologies, icônes). Les inscrire dans `registreScenes`.
2. Dessiner les 28 icônes (`ICONES`) en `Path2D`.
3. Étape-capture brève : chronologie de 2,5 s (8.10), pas de vignette secondaire. Une étape seule affiche « ÉTAPE 01 / 01 » : à masquer ou à assumer.
4. Resynthétiser les voix MP3 de la pub de Weekli : scènes `transformation`, `flux`, `avantapres`, `etape-controle` nouvelles ; `rupture`, `revelation`, `preuve`, `resultat`, `appel`, `fin` modifiées. Les anciens MP3 `etape-ajouter`, `etape-raconter` ne servent plus.
5. Le script de départ du studio écrit maintenant `gestes` (jeu sobre, nerveux ou éditorial selon le repo).

## À trancher par Soufiane

- Capture de 2,5 s = 5 mots de voix : acceptable, ou voix qui déborde sur la scène suivante ?
- Seuils de répétition (argument dans 2 scènes, mot dans 3 scènes) : trop stricts ou bons ?
- Le script de départ sans capture passe en trame `probleme-qui-revient` : voulu ?
