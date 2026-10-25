# Handoff architecte : trames narratives de la pub

Date : 2026-10-25. Rien commité.

## Fait
- 3 trames (`probleme-qui-revient`, `demonstration-directe`, `vision-manifeste`) : ordre, durées et usage dans `design.md` 8.13, accroches multiples pour `ouverture` (le repère de temps devient une option).
- `packages/core/src/pub` : type `Trame` et `TRAMES` (types.ts), `trame?` dans schema.ts, `nettoyerTrame` (nettoyer.ts, valeur inconnue ignorée avec avertissement), `choisirTrame` et trois assemblages dans modele.ts, `TRAMES_PUB` et section TRAMES NARRATIVES dans guide.ts, règle « Varier, ne jamais copier une référence » dans `REGLES_PUB`, exports dans index.ts.
- `timeline.ts` : la voix décalée de `DECALAGE_VOIX` (0,15 s, limites.ts) finit avant le chevauchement suivant, la scène est allongée sinon. Deux tests existants ajustés (45 s au lieu de 43 s, 6,15 s au lieu de 5,85 s).
- Docs : design.md (intro, 8.1, 8.9, 8.13, 8.16, 9.3), api-contract.md 2.1, changelog.md.

## Heuristique (design.md 8.13)
Conviction dans problème ou promesse : manifeste. Sinon mot de répétition ou moins de 4 captures : problème qui revient. Sinon : démonstration. Trame forcée respectée sauf démonstration sans capture.

## Tests
`npx tsc --noEmit` et `npx vitest run` dans packages/core : verts (210 tests).

## Pour le front
`trame` est indicatif : le moteur n'en dépend pas. Le studio peut l'afficher dans l'éditeur. Les scripts de démonstration et de manifeste n'ont pas de scène `repetition` ni `boucle` : l'éditeur ne doit pas les supposer présentes.

## Limites
Démonstration et manifeste sous 4 captures donnent 43 à 49 s (avertissement de durée). `specs.md`, `architecture.md`, `brief.md` mentionnent encore Stepwize (hors zone).
