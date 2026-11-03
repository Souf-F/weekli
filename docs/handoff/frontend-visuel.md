# Handoff frontend : fondations visuelles de la pub (F5)

## Fichiers (rien de commité)

`apps/web/src/lib/pub/visuel/` (nouveau)
- `courbes.ts` : `borner`, `interpoler`, `avancement(secondes, debut, duree)`, `easeOutExpo`, `easeOutCubic`, `easeInCubic`, `easeInOutCubic`, `lisser`, `rebond`.
- `couleur.ts` : `lireCouleur`, `avecAlpha(couleur, facteur)` (hex ou rgba, garde l'opacité propre de `palette.rayons`), `melanger`.
- `toiles.ts` : toiles de travail réutilisées (`toileDeTravail`) et tuiles de motif peintes une fois (`tuile`). Cache mémoire sans état visible : le contenu est redessiné à chaque usage.
- `motifs.ts` : `dessinerGrain`, `dessinerCarres`, `dessinerRayons`.
- `fonds.ts` : `dessinerFondSombre`, `dessinerFondClair`.
- `typo.ts` : `ECHELLE` (design.md 8.5), `mettreEnPage`, `dessinerBloc`, `appliquerPolice`, `reinitialiserPolice`, `policesRequises`, constantes `CAPITALE`, `JAMBAGE`.
- `cinetique.ts` : mot par mot (avec accent), surlignage, soulignement, frappe, et leurs instants de fin.
- `impact.ts` : `dessinerImpact`, `secousseImpact`.
- `lettres.ts` : `dessinerLettres`, `hauteurRebond`, `finLettres`.
- `index.ts` : exports publics.

`apps/web/src/lib/pub/transitions.ts` : réécrit. `coupe`, `glitch`, `flou`, `pixels` réels ; `TRANSITIONS_PAR_DEFAUT` garde son nom, le moteur les utilise donc sans changement.

`apps/web/dev/visuel.html`, `visuel.css`, `visuel.ts` : planche de démonstration (page séparée de `pub.html`, que F8 modifie en parallèle).

`docs/reviews/visuel-f5.png` : planche validable (1920 x 2700, 1,4 Mo).

**Interface du moteur : inchangée.** Aucune modification de `scene.ts`, `moteur.ts`, `contexte.ts`, `index.ts`. La couleur du fond suivant (transition `pixels`) est lue sur un pixel de la couche `apres` plutôt qu'ajoutée à la signature `Transitionneur`.

## Procédés livrés

| Procédé | Règle appliquée (design.md) | Écart ou ajout |
|---|---|---|
| Fond sombre | `sombre` uni, halo `sombreHalo` centré, rayon 70 % de la largeur, respiration ±4 % sur 6 s (temps global, continue entre scènes), grain 3 % | Ajouts pris sur la référence Stepwize : quadrillage de 48 px à 2,8 % de blanc (`trame: false` pour l'ôter), vignettage noir 42 % aux coins. Option `alerte` (0 à 1) pour le fond rougi de `repetition` |
| Fond clair | `clair` uni, grille de points `encre` 6 %, pas de 32 px | |
| Carrés | 14 à 20, 12 à 56 px, coins 4 px, opacité 4 à 10 %, dérive 8 à 20 px/s, place tirée de la graine de scène | Les carrés sortis d'un bord reviennent par l'autre |
| Grain | Tuile de bruit 256 px fixe (graine constante), 3 % | Figé d'une image à l'autre (pas de scintillement à l'encodage) |
| Rayons | 16 rayons pleins et 16 vides, 6°/s, couleur `rayons`, fondu radial vers les bords | Options `intensite` et `ouverture` (0 à 1) pour les ouvrir à la révélation |
| Mot par mot | Masque par ligne, montée de 0,5 em, opacité 0 vers 1, 260 ms, 70 ms d'écart, easeOutExpo | |
| Accent | Partie accentuée vers `couleurAccent` en 180 ms, échelle 1,06 vers 1 autour de son centre | Déclenché par défaut quand le premier mot accentué a fini d'entrer (`accent: number` pour forcer, `false` pour l'empêcher) |
| Surlignage | Bloc qui balaie en 320 ms, texte recoloré au passage | À dessiner après le texte. Couleurs passées par la scène (`clair` + texte `sombre` sur sombre ; `accentClair` 14 % + texte `accentClair` sur clair) |
| Soulignement | Filet 4 px, 400 ms, sous la dernière ligne (ou sous l'accent, `cible: "accent"`) | |
| Frappe | 40 ms par caractère, curseur carré 0,6 em, clignement 530 ms, saute à la ligne avec le texte | Curseur plein pendant la frappe, clignote avant et après |
| Impact | Échelle 1,25 vers 1 en 160 ms, rouge et cyan ±6 px sur 4 images, secousse ±6 px sur 6 images | Traînée horizontale sur les 2 premières images (vue dans la référence). La secousse est renvoyée par `secousseImpact` : la scène l'applique avec `ctx.translate` avant son fond |
| Lettres | Chute de 80 px, 45 ms d'écart, rebond amorti à 0,5, 6 particules carrées par lettre | Amortissement interprété comme coefficient de restitution de la vitesse (chaque rebond repart à la moitié de la vitesse) |
| `glitch` (0,3 s) | 9 images : 4 de l'ancienne scène glitchée, 2 de bruit, 3 de la nouvelle qui se stabilise ; 6 à 10 tranches ±80 px, RVB ±12 px | Hasard tiré du numéro d'image : reproductible |
| `flou` (0,5 s) | Ancienne : flou 0 à 24 px, échelle 1 à 1,08 ; nouvelle : floue vers nette | Flou calculé au quart de la définition (rendu équivalent, 16 fois moins de pixels). Sans `ctx.filter` : fondu enchaîné avec agrandissement |
| `pixels` (0,6 s) | Carrés de 64 px à la couleur du fond suivant, vague depuis le centre, puis effacement | Filet de 1,5 px sur les carrés et points d'avant-garde (référence). L'effacement part aussi du centre (comme la référence) |

Typographie : échelle et interlignes de 8.5, ambiances `nette` et `editoriale`, retour à la ligne par mesure, **équilibrage des lignes** (plus petite largeur gardant le même nombre de lignes, désactivable par `equilibrer: false`, inactif pour Texte et Carte), espace insécable devant `? ! : ; »`, réduction par pas de 4 % jusqu'à 80 % puis troncature avec points de suspension (`bloc.reduit`, `bloc.coupe` pour l'avertissement de l'éditeur). Les mises en page sont mémorisées (128 entrées) : les polices doivent être chargées avant le premier dessin, ce que le contrat du moteur impose déjà (`chargerPolices(policesRequises(ambiance))`).

## API (extrait)

```ts
dessinerFondSombre(ctx, palette, { secondes, temps, graine, rayons?: { intensite?, ouverture? }, alerte?, carres?, grain?, trame? })
dessinerFondClair(ctx, palette, { secondes, temps, graine, carres? })
const bloc = mettreEnPage(ctx, motsAccent, { niveau: "grand", x, y, largeur, alignement?: "centre", lignesMax?, ambiance? })
dessinerMotParMot(ctx, bloc, instant.secondes, { debut, couleur: p.blanc, couleurAccent: p.alerteSombre })
dessinerSurlignage(ctx, bloc, s, { debut: finMotParMot(bloc, debut) + 0.2, bloc: p.clair, texte: p.sombre })
dessinerSoulignement(ctx, bloc, s, { debut, couleur: p.blanc })
dessinerFrappe(ctx, bloc, s, { debut, couleur: p.encre, couleurAccent: p.accentClair, curseur: p.accentClair })
const d = secousseImpact(s, debut, instant.graine); ctx.translate(d.x, d.y); /* fond puis */ dessinerImpact(ctx, bloc, s, { debut, couleur: p.alerteSombre })
dessinerLettres(ctx, bloc, s, { debut, couleur: p.accentClair, particules: p.accentClair, graine: instant.graine })
```
Toutes les fonctions sont pures du temps : aucun état entre deux images, hasard par `alea(graine)`. Exemples complets dans `apps/web/dev/visuel.ts`.

## Mesures (Chrome du panneau intégré, macOS, onglet masqué)

- Export de la planche : 15 procédés x 3 marques x 2 s = 90 s, 2700 images, MP4 H.264, `ffprobe` : 1920x1080, `nb_frames=2700`, `duration=90.000000`. Rendu total 28,5 s.
- Dessin par image dans l'export (`exporter`) : moyenne 1,5 ms, p95 6,4 ms, max 44,6 ms.
- Dessin par image avec synchronisation forcée (`getImageData` d'un pixel après chaque image, bouton « Mesurer ») : ensemble moyenne 5,4 ms, p95 10,6 ms. Par procédé (moyenne / p95) : fond sombre 3,0 / 5,2 ; fond clair 1,2 / 3,2 ; rayons 6,7 / 9,8 ; mot par mot 5,9 / 9,1 ; surlignage 7,3 / 10,6 ; impact 12,7 / 18,1 ; glitch 5,2 / 14,0 ; flou 5,3 / 10,5 ; pixels 6,0 / 13,8.
- Pics isolés à la première image d'un procédé (impact 966 ms une fois, flou 56 ms, soulignement 83 ms) : rastérisation initiale des glyphes géants et des toiles de travail. Un second passage sur l'impact donne un max de 6,5 ms. Budget de 60 ms tenu en régime établi, avec une large marge ; F6 et F7 empileront plusieurs procédés par scène.
- Couleurs : bleu `#3d4bff`, vert `#0e9f6e`, gris `#6b6f76` (chroma sous 0,03 : l'accent retombe sur `#3d4bff`, comportement voulu de 8.4).
- `tsc` (`tsconfig.app.json` et banc) et `oxlint` : aucune erreur sur les fichiers livrés. Aucun tiret long ni moyen.

## Planche

`docs/reviews/visuel-f5.png` : une rangée par procédé (fond sombre, fond clair, carrés, grain zoomé x4, rayons, mot par mot, accent, surlignage, soulignement, frappe, impact, lettres, glitch, flou, pixels), deux instants par couleur, colonnes bleu, vert, gris. Extraite de l'export avec `ffmpeg select + tile=6x15`, quantifiée en 256 couleurs pour tenir sous 2 Mo. MP4 supprimé.

## Limites et points à trancher

- **Geist 800 absent** : `public/fonts` ne contient que Geist 400, 500 et 600. Les titres demandent 800 ; le navigateur prend 600 (sans graisse synthétique). Le rendu est plus léger que la référence. À ajouter : `geist-sans-latin-800-normal.woff2` (même paquet `@fontsource/geist-sans`, OFL) et sa `@font-face` dans `src/styles/fonts.css` (hors de ma zone). Aucun code à changer ensuite.
- Écarts assumés vis-à-vis de 8.6 (pris sur la référence) : quadrillage fin et vignettage du fond sombre. À reporter dans `design.md` et `changelog.md` si validés (hors de ma zone).
- `pixels` lit un pixel de la couche suivante (`getImageData`, 18 images par transition) : léger coût de synchronisation GPU, inclus dans les mesures.
- Le flou entre un fond clair et un fond sombre passe par un gris boueux à mi-course (fondu enchaîné inhérent) ; il est plus net entre deux fonds de même valeur, comme dans la référence.
- Repli sans `ctx.filter` (Safari) écrit mais non exercé ; Firefox et Safari non testés.
- Les grands titres sont posés en `fillText` à chaque image : à l'échelle 0,5 de l'aperçu, l'approche négative suit le contexte (`letterSpacing`, Chrome et Safari récents ; ignorée ailleurs).
- Pas de tests unitaires : fonctions de dessin canvas, validées par la planche et les mesures.

## Lancer

`cd apps/web && npx vite --host 127.0.0.1 --port 5199`, puis `http://127.0.0.1:5199/dev/visuel.html` : lecture, choix du procédé, « Mesurer le dessin », « Exporter la planche ».

## Message de commit proposé

```
feat(web): add pub visual foundations and real scene transitions

Brand backgrounds (dark with breathing halo, light with dot grid),
drifting squares, frozen grain and rotating rays; measured text
layout with balancing, shrink and ellipsis; kinetic type (word by
word, accent, highlight, underline, typing, impact, falling
letters); glitch, blur and pixel transitions replacing the
placeholder fade. Pure functions of time, no engine API change.
Includes a dev demo board page with draw-time measurement.
```
Fichiers : `apps/web/src/lib/pub/visuel/`, `apps/web/src/lib/pub/transitions.ts`, `apps/web/dev/visuel.html`, `apps/web/dev/visuel.css`, `apps/web/dev/visuel.ts`, `docs/reviews/visuel-f5.png`, `docs/handoff/frontend-visuel.md`.
