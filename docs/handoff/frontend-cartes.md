# Handoff frontend : captures en cartes animées (F8)

## Fichiers (rien de commité)

`apps/web/src/lib/pub/cartes/`
- `cadrage.ts` : logique pure. `rectDuCadrage` (haut 0 à 55 %, milieu 25 à 80 %, bas 45 à 100 %, complet, rectangle libre borné), `recadrer(image, cadrage, limites, focus?)`, `focusDansRegion`, `RATIO_BUREAU` (4:3 à 16:10), `RATIO_MOBILE` (9:19,5 à 3:4).
- `disposition.ts` : logique pure. `disposerCarte` (dimensions de carte, écran, région source, focus dans l'écran), `formatDe`, `domaineDe`, `choisirVignette`.
- `mouvement.ts` : logique pure. `mouvementCarte(t, secondes, retard, avecFocus)` (entrée 500 ms `easeOutExpo`, Ken Burns 1 vers 1,05, focus à t 0,45 avec zoom 1,05 vers 1,12), `easeOutExpo`.
- `dessin.ts` : dessin Canvas 2D. `dessinerVisuel`, `dessinerCarteBureau`, `dessinerCarteMobile`, `dessinerCarteListe`.
- `couleurs.ts` : `extraireCouleurs(pixelsRGBA, nombre)` et `proposerMarque(couleurs)`. `echantillon.ts` : `echantillonner(bitmap)` (réduit à 64 px et lit les pixels).
- `stockage.ts` : IndexedDB (`ouvrirStockage`, `cleMedia`). `chargement.ts` : décodage, import, `chargerImagesScript`. `type-image.ts` : type réel par octets.
- `index.ts` : exports publics. Tests : `cadrage.test.ts`, `couleurs.test.ts`, `disposition.test.ts` (disposition, mouvement, type d'image).
- `banc/` : `banc-cartes.ts`, `banc-cartes.css`, `capture-test.ts` (fausse capture dessinée en local).

Hors `cartes/` (ajout ciblé) : `apps/web/dev/pub.html`, section `#cartes` (29 lignes, une feuille de style et un script en plus). Rien d'autre touché (ni `visuel/`, ni `transitions.ts`, ni `voix/`). Aucune dépendance.

## API

```ts
import { dessinerVisuel, chargerImagesScript, ouvrirStockage, importerImage, extraireCouleurs, proposerMarque, echantillonner } from "./cartes";

// Dans une scène (F7), repère logique 1920 x 1080 :
dessinerVisuel(ctx, instant, visuel /* Visuel du script */, zone /* {x,y,largeur,hauteur} */, {
  captures: script.captures, // formats et domaines (barre du navigateur) ; sans, le format se déduit de l'image
  vignette: undefined,       // undefined : seconde capture automatique ; null : aucune ; ou un id
  fond: "clair",             // "sombre" : cadre de focus en accentSombre
  retard: 0,                 // secondes avant l'entrée
});
```
- Lit `instant.contexte.images` (id de capture, `ImageBitmap`) et `instant.contexte.palette`, `instant.t` et `instant.secondes`. Pur : aucun état, aucun `Math.random`.
- `visuel.type === "liste"` : carte à cases (titre, 2 à 4 lignes, cases cochées une à une à partir de t 0,2, barre de progression).
- Image absente (chargement échoué) : la carte s'affiche avec un écran squelette, sans planter.
- `zone` : la colonne droite de l'étape (colonnes 7 à 12). La carte garde une marge de 1,12 pour le zoom maximal et ne sort pas de la zone (le glissement vers le focus est borné).
- Chargement : `chargerImagesScript({ captures, marque }, { idPub, stockage, capturer?, signal? })` renvoie `{ images: Map<id, ImageBitmap>, manquantes: [{id, raison}] }`, à passer à `creerContexte(script, { images })`. Les captures `site` passent par `api.capturer` (`/api/captures`), une par une (limite serveur 5 par minute). Les captures `importee` et le logo (`id` `"logo"` si `marque.logo === "image"`) viennent d'IndexedDB sans aucune requête. Un échec n'arrête pas le chargement (liste `manquantes`).
- Import : `importerImage(stockage, idPub, id, fichier)` valide (taille : 8 Mo image, 512 Ko logo ; type par les octets : PNG, JPEG, WebP, plus SVG pour le logo), décode (réduit à 2560 px), stocke et renvoie l'`ImageBitmap`. Clé IndexedDB `<idPub>/<id>`. Un SVG est rastérisé via `<img>` (aucun script exécuté) à 512 px.
- Couleurs : `proposerMarque(extraireCouleurs(echantillonner(bitmap)))` renvoie `{ accent: Hex | null, candidats }`. `null` pour une image neutre : le gris par défaut du moteur s'applique.
- Le logo échantillonné en 24 x 24 pour les particules (8.11) n'est pas dans ce lot : il relève de F6 (`revelation`).

## Décisions et écarts

- Cadrage (design.md 8.10) : « le rapport du cadre est respecté, la carte s'adapte entre 4:3 et 16:10 » est ambigu pour `haut` (1280 x 440, rapport 2,9). Choix : le cadre est rogné en largeur, centré, jusqu'à 16:10 (jamais étiré, jamais élargi au-delà du cadre demandé). Si un `focus` est donné, le cadre rogné glisse du minimum pour le garder visible. Pour le mobile, l'écran est borné entre 9:19,5 et 3:4 (le design ne le précise pas).
- `focus` et `cadrage` libres sont des fractions de l'image entière (comme le contrat), pas du cadre.
- Ken Burns « glissement vers le centre du focus (ou du cadre) » : avec focus, la carte se décale jusqu'à 25 % de la distance focus vers centre ; sans focus, pas de glissement (le centre du cadre est déjà celui de la carte).
- Vignette : la seconde capture est choisie automatiquement (la suivante du script, déjà chargée) ; le design ne dit pas laquelle. Largeur 360 px (bureau) ou 170 px (mobile, choix à valider).
- Les messages d'erreur d'import sont en français et destinés à l'éditeur (F10).

## Mesures (Chrome du panneau intégré, macOS)

- Dessin d'une carte bureau avec focus et vignette, canvas 1920 x 1080, 120 images, GPU synchronisé par `getImageData` : p95 3,9 ms ; première image 343 ms (initialisation du canvas, hors régime). Soit bien sous le budget de 60 ms par image (ADR-06) pour ce visuel seul.
- Extraction de couleurs : échantillonnage 0,3 ms, extraction 0,6 ms (image 64 px).
- Réseau (onglet Réseau du panneau) : après capture simulée, import de PNG, import de logo SVG, rechargement de la page avec restauration depuis IndexedDB : aucune requête `/api/` ni POST. Le banc affiche aussi un compteur de requêtes `/api` via `PerformanceObserver` (0).
- IndexedDB : import, restauration après rechargement, suppression vérifiés ; base de test supprimée.
- `npm run typecheck` : vert. `npm test` (apps/web) : 4 fichiers, 51 tests verts (41 pour F8). `oxlint src/lib/pub/cartes` : aucune alerte.

## Limites connues

- La vraie route `/api/captures` n'a pas été appelée (secrets OAuth absents) : la capture est simulée par une image dessinée localement qui emprunte le même chemin (`chargerImagesScript` avec `capturer` injecté). Le floutage serveur n'est pas vu ici.
- Les cartes ne chargent pas de police : les scènes doivent charger Geist 500 et 600 (`chargerPolices`) avant le premier dessin. Sans elle, repli sur `system-ui`.
- Testé dans Chrome uniquement. Le dessin n'utilise ni `ctx.filter` ni l'API non standard. `roundRect` demande Safari 16 ou plus.
- Rendu visuel vérifié par captures du panneau (bureau, mobile, vignette, focus, liste, entrée, fin) ; pas de comparaison à une maquette Figma.
- Les ombres du canvas ignorent la transformation : `dessin.ts` les met à l'échelle de la matrice courante (aperçu 960 x 540 et export 1920 x 1080 donnent le même rendu).
- Un logo SVG sans `width`/`height` est rastérisé à 512 px sur son grand côté.
- Les données de test du banc (`banc/` dans IndexedDB, base `weekli-pub`) se vident par le bouton « Vider IndexedDB ».

## Lancer

`cd apps/web && npx vite --host 127.0.0.1 --port 5199`, puis `http://127.0.0.1:5199/dev/pub.html` (section « Cartes de capture »). Premier chargement lent possible (optimisation Vite des dépendances).

## Message de commit proposé

```
feat(web): add capture cards, local image storage and brand colors

Pure drawing of desktop and mobile capture cards driven by the pub
scene interface: crop to the 4:3 to 16:10 range, Ken Burns, focus
frame, thumbnail card and checklist card. Imported images and the logo
live in IndexedDB and never leave the browser; only site captures use
/api/captures. Dominant colors of an image or logo propose the brand.
```
Fichiers : `apps/web/src/lib/pub/cartes/`, `apps/web/dev/pub.html`, `docs/handoff/frontend-cartes.md`.
