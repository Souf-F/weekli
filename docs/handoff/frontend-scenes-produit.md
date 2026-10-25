# Handoff frontend : scènes produit et action (F7)

## Fichiers (rien de commité)

`apps/web/src/lib/pub/scenes/produit/`
- `index.ts` : `registreProduit(script, { surCoupe? })` renvoie `{ etape, resultat, preuve, appel, fin }` (type `ScenesProduit`). Pas de registre global : à assembler avec celui de F6, par exemple `{ ...registreTension(script), ...registreProduit(script) }`.
- `commun.ts` : grille (`MARGE`, `colonne`), échelles calquées sur la référence, titre en deux temps (`mettreTitre`, `dessinerTitre`), apparition (`entree`), bouton pilule avec flèche dessinée, signalement des textes coupés.
- `logo.ts` : monogramme pixel 9 x 9 (Geist 800 rastérisé, couverture par cellule au seuil 0,42, mémorisé par texte) ou logo importé (`images.get("logo")`).
- `etape.ts`, `resultat.ts`, `preuve.ts`, `appel.ts`, `fin.ts`.

`apps/web/dev/scenes-produit.html`, `.css`, `.ts` : banc (lecture, mesure du dessin à 1920 x 1080, cas limites, envoi des images de la planche à un récepteur local). `docs/reviews/scenes-f7.png` : planche comparative.

Aucune modification de `visuel/`, `cartes/`, du moteur ni des zones F6 et F9. Aucune dépendance.

## Pourquoi une fabrique `registreProduit(script)`

`InstantScene` ne porte que la scène courante. L'en-tête des étapes a besoin des onglets de toutes les étapes visibles et du nom du projet, la fin du logo et du nom. Le registre est donc créé pour un script (fermeture sur des données immuables : les scènes restent pures). Même besoin probable pour la `revelation` de F6 (nom du projet). `surCoupe(idScene, texte)` remonte une fois chaque texte tronqué, pour l'avertissement de l'éditeur (F10).

## Scènes et champs lus

| Scène | Champs | Rendu |
|---|---|---|
| `etape` | `onglet` (de toutes les étapes non masquées), `filigrane`, `titre`, `texte?`, `visuel`, `scene.etape.numero/total`, `projet.nom`, `marque.logo/monogramme`, `captures` | En-tête fixe (logo 32 px, nom 30 px, onglets 22 px alignés à droite, souligné de 4 px qui glisse de l'onglet précédent en 0,4 s). « ÉTAPE 0n / 0N » à 22 px `accentClair`, titre 100 px : si l'accent termine la phrase, il passe sur sa propre ligne (« On comprend / ce qui bloque. »), texte 31 px `encreDouce`, carte F8 dans la zone x 940 à 1800, y 230 à 870 (retard 0,25 s). Filigrane 315 px en contour 2 px `encre` 8 %, répété avec un rond, défilement 40 px/s calé sur le temps global. Poussée lente du contenu (1 vers 1,025) ; l'en-tête ne bouge pas : continuité exacte d'une étape à l'autre. `visuel: liste` vide : en-tête et titre seulement |
| `resultat` | `titre`, `avant`, `tampon`, `apres`, `chute?` | Surtitre « RÉSULTAT », frise de 8 emplacements (3 `avant` avec horloge `alerteClair`, la 4e reçoit le tampon, la 5e devient la carte pleine `accentClair` portant `apres`, puis des « ? »), étiquettes « SEMAINE 01 » et suivantes, ligne de temps à points. Tampon incliné de -8°, écrasement 1,3 vers 1 en 160 ms, secousse de la frise, cercle de focus qui se resserre. Titre une ligne (t 0,34), glissement de 1,45 carte vers la gauche, chute en Slogan |
| `preuve` | `surtitre`, `elements[1..4]`, `cartes[0..3]?` | Fond sombre, surtitre 42 px blanc 80 %, éléments en Grand 110 px blanc, mot par mot toutes les 0,42 s, filet blanc 14 % qui se trace ; cartes `sombreHalo` 55 %, bord blanc 12 %, entrée depuis la droite décalée de 120 ms. Groupe centré verticalement ; sans cartes, les filets prennent toute la largeur |
| `appel` | `question`, `badge?`, `action`, `bouton` | Pile centrée verticalement : question 110 px (accent sur sa ligne), badge pilule blanche ombrée dont le bloc d'accent se remplit de gauche à droite, action 224 px en lettres qui tombent avec particules, bouton pilule `accentClair` 34 px avec flèche qui glisse. Sortie : bulle `sombre` à liserés qui grandit depuis le bouton |
| `fin` | `slogan?`, `bouton?`, `liens[1..2]`, `mentionWeekli?`, `projet.nom`, logo | Rayons, logo 160 px `accentSombre` et nom en Affiche centrés, slogan 60 px, bouton blanc texte `sombre`, liens 30 px blanc 70 % séparés par un point. Tout est posé avant 1,2 s ; les carrés du décor se figent 1,5 s avant la fin, seuls les rayons tournent |

## Mesures (Chrome du panneau intégré, macOS, banc de 36,1 s, 1083 images)

Dessin à 1920 x 1080, GPU synchronisé par `getImageData` après chaque image, seconde passe (transitions comprises) :

| Scène | Images | Moyenne (ms) | p95 (ms) | Max (ms) |
|---|---|---|---|---|
| etape | 540 | 4,9 | 11,2 | 19,2 |
| resultat | 150 | 4,2 | 8,0 | 9,0 |
| preuve | 117 | 4,2 | 5,9 | 12,0 |
| appel | 156 | 3,3 | 8,3 | 10,1 |
| fin | 120 | 3,9 | 4,8 | 6,2 |

Budget de 60 ms tenu avec une large marge. Textes coupés : aucun, y compris sur les cas limites (titre d'étape de 3 lignes, liste de 4 éléments, question de 2 lignes et bouton long, 4 engagements longs). `tsc` (app et banc) et `oxlint` : aucune erreur. `npm test` (apps/web) : 6 fichiers, 75 tests verts. Aucun tiret long ou moyen, aucune séquence d'échappement unicode.

## Planche `docs/reviews/scenes-f7.png`

1120 x 4845, 1,5 Mo. À gauche la référence, à droite le rendu, aux mêmes instants : 22,5 s (étape 1, entrée), 25 s (étape 1), 28 s (étape 2, liste), 31,5 s (étape 3, focus), 35,5 s (étape 4, mobile), 37 s (tampon), 40 s (chute), 44 s et 46 s (preuve), 50 s (badge), 52 s (appel), 52,5 s (bulle), 56 s (fin). Deux dernières rangées : cas limites (étape en liste vide, étape longue, appel long, preuve sans cartes). Les images de la référence sont celles extraites avant la consigne d'économie (pleine définition, supprimées depuis) ; la planche `reference/stepwize-planche.png` (384 px par image) était trop petite pour mesurer les tailles.

## Écarts avec la référence et avec design.md

- Échelles : la référence est plus grande que 8.5. Titre 100 px (76 dans 8.5), question 110 (104), action 224 (160), éléments de preuve 110. À reporter dans `design.md` si validé.
- Geist est plus large que la police de la référence : à taille égale, « dans la plateforme. » passe sur deux lignes (3 lignes au total) là où la référence tient en deux.
- `preuve` : le surtitre est rendu comme l'introduction de la référence (« Déjà utilisé avec », 42 px) et non en Étiquette ; la référence a les deux, le script n'a qu'un champ.
- `resultat` : 8 emplacements dont 3 `avant` (la référence en a 4). Étiquettes « SEMAINE 01 » au lieu de dates inventées ; pas de pastille « Encore » (aucun champ).
- Monogramme de la fin en `accentSombre` (8.11) ; la référence a un logo blanc.
- Bulle de l'appel : finie 0,45 s avant la fin de la scène pour ne pas être floutée par la transition `flou` de la fin.
- La référence pousse tout le cadre à chaque étape (l'en-tête saute à la coupe) ; ici seul le contenu avance, l'en-tête reste fixe.
- Logo d'en-tête 32 px (28 dans 8.11), mesuré sur la référence.
- `logo.ts` rastérise son propre monogramme : à fusionner avec celui de F6 (révélation) pour garantir la même grille.

## Limites

- Testé dans Chrome uniquement. Fausses captures dessinées localement (celle de F8 et un tableau de bord).
- Le banc n'est couvert par aucun tsconfig du dépôt (vérifié par un tsconfig temporaire).

## Lancer

`cd apps/web && npx vite --host 127.0.0.1 --port 5196`, puis `http://127.0.0.1:5196/dev/scenes-produit.html`. « Envoyer les images de la planche » attend un récepteur local de développement (POST d'un PNG par image) à l'adresse saisie.

## Message de commit proposé

```
feat(web): add product and action pub scenes

Step template with a fixed header whose tab underline slides from
the previous step, two-part titles, outlined scrolling watermark and
capture cards; result timeline with stamp and focus ring; proof
stack with side cards; call to action with badge, falling letters
and exit bubble; end card on rays. Sizes follow the reference ad.
Includes a dev bench with draw-time measurement and edge cases.
```
Fichiers : `apps/web/src/lib/pub/scenes/produit/`, `apps/web/dev/scenes-produit.html`, `apps/web/dev/scenes-produit.css`, `apps/web/dev/scenes-produit.ts`, `docs/reviews/scenes-f7.png`, `docs/handoff/frontend-scenes-produit.md`.
