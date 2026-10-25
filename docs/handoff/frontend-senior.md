# Handoff frontend-senior : F2, passe de cohérence du site

Date : 2026-10-24. Rien n'est commité.

## Vérifié, non refait

- Polices : 8 `woff2` locaux dans `apps/web/public/fonts/`, `styles/fonts.css`, `font-display: swap`, préchargement des deux polices principales dans `index.html`. Aucun lien Google dans `index.html`.
- CSP de `public/_headers` : `style-src 'self'; font-src 'self'`, aucune mention de Google. Le fichier n'a pas été touché.

## Fichiers modifiés (tous sous `apps/web/src`)

- `styles/tokens.css` : échelle typographique (`--t-*` et `--lh-*`, valeurs de design.md section 3), `--mesure` 68ch, `--espace-1` à `--espace-9`, `--focus`, rayons, durées (`--duree-rapide`, `--duree-ui`, `--duree-section`), `--ease` et `--ease-out`, `--surface` pleine pour le marketing, voiles et ombres nommés. Les tokens existants (`--verre*`, `--bord-verre`, `--ombre`, `--filet`) sont conservés, rien n'est renommé (le Studio en dépend).
- `styles/global.css` : titres sur l'échelle, `:focus-visible` global (anneau `--focus`, contour transparent pour le mode contraste forcé), apparitions en `--duree-section`, `scroll-behavior` coupé avec `prefers-reduced-motion`.
- Tous les `.module.css` de `components/` (Bouton, Logo, MeshBackground), `layouts/AppLayout`, `pages/Accueil/sections` (Section, Hero, Bandeau, Chiffres, DeuxModes, Etapes, Fonctionnalites, Installer, Navigation, Pied), `pages/Tableau` (Panneau, Tableau, CartePost, PanneauActivite), `pages/Historique` (2), `pages/Captures`, `pages/Reglages` (3), `pages/Legal` : tailles, interlignes, espacements, rayons, durées, couleurs en dur remplacés par les tokens. Restent en dur seulement des dimensions de mise en page (largeurs max, hauteurs de scroll, tailles de puces).
- Verre : conservé uniquement sur la barre, la carte de connexion et les panneaux de l'app (`AppLayout`, `Panneau`, filtres de l'Historique), et sur la maquette du hero avec ses trois étiquettes flottantes. Retiré partout ailleurs : `Section.panneau` (Deux modes, Étapes, Installer), cartes de Fonctionnalités, Bandeau, pastille du hero, barre de navigation au scroll, bouton `contour`, pages légales. Ces éléments passent sur `--surface` plein.
- Focus : les `outline: none` locaux (CartePost, CarteBrouillon, confirmation de suppression) et les contours ad hoc ont été retirés au profit du `--focus` global. Marge interne ajoutée aux zones à défilement (liste des dépôts, navigation mobile) pour que l'anneau ne soit pas rogné.
- Mono : `JetBrains Mono` réservé aux noms d'outils et au code (design.md section 3). Surtitres, badges, notes et compteurs passent en Geist 500, capitales, `--suivi-etiquette`.
- Textes : `Bandeau.tsx` (« Motion design » devient « Pub vidéo »), `Fonctionnalites.tsx` (carte « Lecture des diffs » sans « histoire », carte « Captures et pub vidéo »).
- `Chiffres.tsx` : voir ci-dessous. `README.md` de `src` : ligne `tokens.css` mise à jour.

## Section Chiffres (design.md section 2, point 8)

| Chiffre | Source dans le dépôt |
|---|---|
| 6 outils MCP | six `registerTool` dans `apps/server/src/mcp/agent.ts` (activite_github, details_repo, details_commit, sauver_brouillons, lister_brouillons, capturer_site) |
| 0 € à payer | `docs/brief.md` (budget 0 €, aucun service payant), `LICENSE` MIT |
| 0 clé API stockée | aucun appel Anthropic dans `apps/server`; la clé reste dans le navigateur (`lib/reglages.ts`), CSP `connect-src` vers `api.anthropic.com` |
| 90 jours | `apps/server/src/lib/conservation.ts`, test `donnees.test.ts` (7 776 000 s) |

Anciens chiffres retirés : « 2 modes » et « 0 publication sans toi » (vrais mais sans intérêt de preuve), « 100 % lecture seule » (imprécis : Weekli écrit des brouillons, c'est GitHub qui est en lecture seule, scope `read:user`).
La note sous les chiffres est corrigée : « ta clé API ne quitte jamais ton navigateur » était inexact (elle part vers Anthropic), elle dit maintenant « directement vers Anthropic, jamais vers nos serveurs ». PKCE, cookie HttpOnly et durée de 8 h vérifiés dans `routes/auth.ts` et `lib/session.ts`.

## Mesures

- Navigateur (Vite sur 127.0.0.1:5173, volet navigateur) : `performance.getEntriesByType("resource")` sur l'accueil, 52 ressources, 0 hors origine. Polices chargées : Instrument Serif, Geist 400/500/600, JetBrains Mono. Lighthouse confirme : seules les requêtes vers `127.0.0.1` et des `data:`.
- Lighthouse 12 (Chrome headless), accueil : **accessibilité 100** (serveur de dev et build de production), bonnes pratiques 100, SEO 91 (seul point : `robots.txt` invalide, fichier absent de `public/`, hors zone), performance 70 sur le build de production (FCP/LCP 0,77, TBT 0,28 ; le fond WebGL pèse sur le TBT). Non optimisé ici.
- 375 px : pas de défilement horizontal sur l'accueil (scrollWidth 375). Pages de l'app non vues dans le navigateur (connexion GitHub impossible sans le Worker) : vérifiées par le typecheck, la compilation CSS et la relecture.
- `npm run typecheck` vert, `npm run build` vert, `npm test` vert (core 137 tests, serveur 84 tests). Un échec transitoire de parsing de `packages/core/src/pub/nettoyer.ts` a été vu pendant le travail (fichier en cours d'écriture par un autre agent), disparu ensuite.

## Limites et points à trancher

- `apps/web/README.md` (hors zone) dit encore « vidéo verticale 1080 × 1350 » et « aperçu animé » : à aligner sur la pub 16:9 avec la tâche vidéo.
- « Prêt en deux minutes » (Installer) vient de la user story US-M1, non mesuré. Design.md prévoit un chiffre « 2 minutes » en dernière position : je ne l'ai pas mis dans Chiffres tant qu'il n'est pas chronométré.
- Le « 6 » est écrit en dur : si un outil MCP est ajouté ou retiré (le fichier `agent.ts` est en cours de modification par d'autres tâches), mettre à jour `Chiffres.tsx`.
- Section « La pub de ton projet » (V1, design.md section 5) non créée : hors F2.
- Les titres globaux `h1` (`--t-titre`) et `h2` (`--t-sous-titre`) s'appliquent aussi au Studio, qui n'a pas été retouché : à vérifier à sa refonte.
- Le hero garde ses étiquettes flottantes en verre (considérées comme faisant partie de la maquette).
- Fiabilité : le fond du bouton `contour` est désormais plein (`--surface`), son aspect change légèrement dans l'app.

## Commits proposés

1. `style(web): add type scale, spacing, focus and motion tokens` (`styles/tokens.css`, `styles/global.css`)
2. `refactor(web): apply design tokens to components and app pages` (CSS de `components/`, `layouts/`, `pages/Tableau`, `Historique`, `Captures`, `Reglages`, `Legal`)
3. `refactor(home): apply design tokens and plain surfaces to marketing sections` (CSS de `pages/Accueil/sections`)
4. `fix(home): rewrite numbers section with figures sourced in the repo` (`Chiffres.tsx`)
5. `docs(web): align copy with the project ad brief` (`Bandeau.tsx`, `Fonctionnalites.tsx`, `src/README.md`)
