# Handoff frontend F16 : tableau par type de post

Date : 2026-10-29. Zone : `apps/web/src/pages/Tableau`, `apps/web/src/lib`.

## Livré
- Parcours en 4 étapes (repo, type, réglages, posts) : `Tableau.tsx` (état, URL `?repo=&type=`, dernier repo en localStorage), `FilEtapes`, `EtapeRepo`, `EtapeType` (cartes issues de `CATALOGUE_POSTS`), `ReglagesType` + `reglages/` (Presentation, Tuto, Commits pour coulisses et leçon, Semaine), `Redaction`.
- Les commits ne sont montés (donc chargés) que si `CATALOGUE_POSTS[type].commits !== "non"` : jamais d'appel pour présentation et tuto. La leçon charge la liste seulement à l'ouverture du bloc replié.
- Tuto : fichiers proposés cochables, ajout depuis l'arborescence (recherche, clavier), max 12, compteur, fichiers écartés (sans nom).
- « Ma semaine » : une seule carte à l'étape 2 ; l'étape 1 passe en cases à cocher (aucun repo coché = tous). Ancien flux conservé (`PanneauActivite`, `PanneauOptions` sans leur bouton ni leur numéro d'étape, `useSemaine`).
- Mode clé API : `lib/generation-type.ts` `genererPostParType` (POST /api/posts/donnees puis Claude dans le navigateur, question de Claude gérée avec champ de réponse). Sans clé : demande à copier (« Prépare un post de type X sur mon repo Y avec Weekli ») et lien vers Réglages.
- `lib/api.ts` : `commitsRepo`, `fichiersTuto`, `donneesPost`. `lib/parcours.ts` : logique pure testée (`parcours.test.ts`).
- Démo (`?demo`, dev seulement) : routes simulées pour repos, commits, fichiers-tuto, posts/donnees, et rédaction des 5 types (question de Claude si aucune note).

## Lancer
`VITE_DEMO=1 npx vite` dans `apps/web`, ouvrir `/app?demo` (VITE_DEMO sert `/api/moi` avant le chargement de la page).

## Tests
typecheck, build et `npm test` : voir rapport. Capture : `docs/reviews/tableau-types.png` (1440, 1024, 390 ; aucun défilement horizontal mesuré).

## Limites
- Non testé contre les vraies routes B17 (code d'après le contrat). Pas de Lighthouse mesuré.
- Le lien « résumé de toute ma semaine » du design 10.3 est retiré (décision : une seule entrée, la carte).
- Correspondance pub vidéo et repo approximative (nom du projet normalisé).
