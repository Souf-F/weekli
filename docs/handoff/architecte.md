# Handoff architecte : discipline de production de la pub (gestes, but, honnêteté)

Date : 2026-10-25. Rien commité. Source : skill de motion design externe, lu comme matériau, aucun nom propre repris.

## Fait
- docs/design.md : nouvelle section 8.16 (identité et mouvement tirés du projet, gestes, but, image zéro et miniature, honnêteté, contrôles finaux). Elle prime sur 8.7 et 8.8 en cas de contradiction.
- docs/api-contract.md 2.1 : types `Geste` et `But`, champs `gestes?` (script) et `but?` (scène), 5 lignes de validation.
- packages/core/src/pub : `types.ts` (GESTES, GESTES_PUB, BUTS, BUT_DEFAUT, champs), `schema.ts`, `nettoyer.ts` (nettoyerGestes, filtre du but, avertissement de transition hors gestes), `guide.ts` (section GESTES ET BUT dans CATALOGUE_PUB, règles gestes et honnêteté dans REGLES_PUB, nouvelle constante REGLES_POST_PROJET), `index.ts` (export de REGLES_POST_PROJET, hors liste de zone mais nécessaire).
- Tests : 5 cas dans nettoyer.test.ts, 2 dans guide.test.ts. `npx vitest run` dans packages/core : 200 verts, tsc propre.
- docs/changelog.md (entrée 2026-10-25) et docs/tasks.md (impacts F10, B9/B11, B16).

## Règles de validation (avertissement, jamais rejet)
- gestes : inconnus ou doublons retirés ; plus de 3 : 3 premiers gardés ; moins de 2 ou non liste : champ ignoré ; transition glitch, flou ou pixels hors gestes : avertissement.
- but hors lire, comprendre, montrer : ignoré. But par défaut par type dans `BUT_DEFAUT`.

## Pour le moteur (F10)
- Appliquer seulement les gestes choisis, repli neutre sinon (table dans design.md 8.16). Sans `gestes`, comportement actuel.
- Pause de lecture 1,2 / 0,8 / 0,5 s : `timeline.ts` n'a pas été modifié, `calculerTimeline` ignore encore `but`.
- Image zéro complète, miniature PNG, contrôles finaux, mention « Illustration » dans la planche.

## À trancher
- Seuils de la pause (1,2 / 0,8 / 0,5 s) et liste fermée de dix gestes : choix de l'architecte, à confirmer.
- Seuil de noir involontaire (luminance moyenne sous 2 % sur plus de 0,2 s) : à calibrer sur un vrai export.
