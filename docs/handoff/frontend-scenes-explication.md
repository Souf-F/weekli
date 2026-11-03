# Handoff frontend : scènes d'explication (F15)

## Fichiers (rien de commité)

- `apps/web/src/lib/pub/visuel/icones.ts` : les 28 icônes de `ICONES`, tracées au chemin sur grille 24 (polylignes aplaties une fois, `Path2D` mis en cache pour l'image complète), `dessinerIcone(ctx, nom, cx, cy, taille, { trace, couleur, accent, epaisseur?, alpha? })`. `trace` de 0 à 1 : le stylo avance à vitesse constante, puis l'élément d'accent apparaît (pop depuis son centre, ou tracé pour `coche`, `bouclier`, `nuage`). Icône inconnue : `etoile`.
- `apps/web/src/lib/pub/scenes/explication/` : `commun.ts` (en-tête, titre, tuile et ombre, ressort amorti, libellés ajustés), `transformation.ts`, `flux.ts`, `avantapres.ts`, `index.ts` (`registreExplication(script, { surCoupe? })`), `icones.test.ts`.
- `scenes/index.ts` : le registre global assemble tension, produit et explication. `scenes/test.ts` : les 3 types ajoutés.
- Banc `apps/web/dev/scenes-explication.html`, `.css`, `.ts` (palette café de Weekli, scènes de `pub-weekli.json`, cas limites aux longueurs maximales). Planche `docs/reviews/scenes-f15.png` (1920 x 1350, 294 Ko) : 4 instants par scène, cas limites en image fixe, planche des 28 icônes.

## Résultats

- `npm run typecheck`, `npm run build` : verts. `npx vitest run` (apps/web) : 7 fichiers, 76 tests verts.
- Dessin à 1920 x 1080 (Chrome du panneau intégré) : max 7,7 ms, moyenne 2,7 ms sur 534 images. Budget 60 ms tenu.
- Textes coupés à 80 % : aucun, y compris avec tous les champs à leur longueur maximale.

## Choix sur les ambiguïtés de 8.17

- Trait des icônes : 5 px (règle commune), pas 8 px (grille 2 x 4) : plus fin et cohérent avec l'anneau de 4 px.
- En-tête : identique aux étapes (logo 32 px, centre y 92) pour la continuité avec les scènes voisines.
- Sans geste `accent` : l'accent du titre est déjà en `accentClair`, sans rebond. Le gonflement de 3 % de `flux` est toujours joué.
- `transformation` : l'icône d'entrée s'efface de 1,55 à 1,70 s, juste avant l'éclatement (la tuile n'existe plus après 1,7 s) ; celle de sortie se trace de 2,45 à 2,70 s. Les carrés passent du blanc à l'accent en vol, puis reviennent au blanc en formant la tuile. Une comète d'accent fait un tour d'anneau pendant la transformation. Décalage chromatique du geste `impact` en `alerteClair` et `accentClair` (palette seulement).
- `avantapres` : les lignes sont centrées verticalement sous le bandeau (pas de 120 px) au lieu de partir de y 540, pour équilibrer 2 et 3 paires. Deux repères d'état à droite du bandeau. Le trait qui barre recule à mesure que les lettres se retournent.
- `musique` : les deux têtes de note sont remplies ; `lien` : le maillon de droite est un anneau plein.

## Limites

- La planche ne montre que la palette café (consigne d'économie de l'orchestrateur), pas le bleu ni le vert.
- Ombre des tuiles : l'étalement négatif n'existe pas en canvas, il est simulé par une forme rétrécie de 28 px dessinée hors champ.
