# Handoff : gestes de texte lus par les scenes

## Fait
- `visuel/gestes.ts` (logique pure, testee) : `choisirApparition(gestes, preferences, defaut)`, `optionAccent`, `rebondAccent`, `miseEnValeur`. Le premier procede autorise par `contexte.gestes` gagne, sinon repli mot par mot (design 8.16). `gestes === null` : defaut du catalogue (comportement d'avant).
- `visuel/texte.ts` : `dessinerApparition` et `finApparition` (mot, frappe, lettres, impact) a signature commune.
- Scenes branchees :
  - `ouverture` : glissade lettre par lettre, sinon frappe, sinon mot par mot. Image zero : si c'est la premiere scene de la pub (`scene.debut <= 0`), cadran et textes sont deja poses a t = 0.
  - `rupture` : frappe, sinon lettres (repli mot par mot si le texte deborde la scene), sinon mot par mot. Le curseur final qui annonce les pixels n'existe qu'avec la frappe.
  - `repetition` : mot d'impact avec decalage chromatique et secousse du cadre seulement si `impact` est choisi, sinon simple changement d'echelle. Accent des lignes selon `accent`.
  - `revelation` : surlignage seulement si choisi (sinon partie accentuee en couleur d'accent) ; soulignement de la signature omis s'il n'est pas choisi.
  - `appel` : mot d'action en lettres, sinon impact, frappe, mot par mot.
  - `boucle`, `chorus`, `resultat` (chute), titres `etape`, `resultat`, `appel` : rebond de l'accent selon `accent`.
- Scenes d'explication : inchangees (elles lisaient deja `script.gestes`, defaut sobre sans gestes).

## Verifier
- Banc : `apps/web/dev/gestes.html` (Vite sur 5195), planche `docs/reviews/gestes.png` (5 scenes x 3 jeux : sobre, nerveux, editorial). PNG posterise (pas de 10) pour rester sous 1 Mo.
- Temps de dessin 1920 x 1080 sur les trois pubs : moyenne 3 a 4 ms, max 28 ms (budget 60 ms).

## Limites
- Image zero traitee pour `ouverture` seulement. L'`ouverture` n'affiche ni logo ni nom (8.9) : le critere « logo lisible » de 8.16 n'y est pas tenu, a trancher cote design.
- `rayons` (halo fixe) et `soulignement` du filet sous accent hors signature ne sont pas branches.
- Les transitions restent geres par la timeline.
