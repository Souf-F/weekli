# Handoff backend : B12 (modele vocal), masquage des secrets, protobufjs

Date : 2026-10-25. Rien n'est commite.

## Livraison

1. **B12** : `scripts/modeles-voix.mjs`. Verifie d'abord le dossier `apps/web/public/modeles/kokoro/` : revision du manifeste, empreintes epinglees du modele et de la voix, taille de chaque morceau et SHA-256 recalcule de chaque fichier recolle (0,2 s). Si tout est valide : message et sortie. Sinon : telechargement des deux fichiers de `onnx-community/Kokoro-82M-v1.0-ONNX` a la revision epinglee de F1 (importee de `preparer-modeles.mjs`, pas dupliquee) dans un dossier temporaire du systeme, verification SHA-256 en flux, appel du script de F1 (morceaux de 20 Mio, espeak-ng, manifeste), suppression du dossier temporaire (aussi en cas d'echec). Fichier rejete si l'empreinte differe. `npm run build` racine devient `node scripts/modeles-voix.mjs && npm run build --workspace @weekli/web` (le script build de `apps/web/package.json` n'a pas ete touche : `deploy` passe par le build racine). Dossier toujours hors Git (`.git/info/exclude`).
2. **Masquage des secrets** (contrat 4.1) : `packages/core/src/masquage.ts` (`masquerSecrets`), appele dans `detailsCommit` (`packages/core/src/github.ts`) sur chaque extrait **avant** la troncature a 1500 caracteres (sinon un jeton coupe echapperait au motif). Comme la logique vit dans core, l'outil MCP `details_commit` et la route `GET /api/repos/:repo/commits/:sha` en beneficient. Formats : `ghp_ gho_ ghu_ ghs_ ghr_` (36+), `github_pat_`, `sk-ant-`, `sk-` (32+ caracteres dont au moins un chiffre, pour eviter les noms en kebab-case), `AKIA` + 16, `xox[baprs]-`, cles privees PEM (jusqu'au END, ou jusqu'a la fin si le bloc est tronque). Aucun motif generique. Remplace par `[secret masque]`. Le message du commit n'est pas masque (le contrat ne parle que des extraits).
3. **protobufjs** : `"protobufjs": false` ajoute a `allowScripts` du `package.json` racine.

## Resultats reels

- Chemin « deja la » : `node scripts/modeles-voix.mjs` : « deja present et valide », 0,24 s, aucun acces reseau.
- Telechargement complet : dossier existant deplace dans le scratchpad, `TMPDIR` pointe vers le scratchpad, 28,7 s, SHA-256 des deux fichiers verifies, dossier produit **identique octet pour octet** (`diff -r`) a l'original, dossier temporaire vide ensuite, sauvegardes supprimees. Second lancement : 0,24 s sans telechargement.
- Corruption : un octet modifie dans `ff_siwis.bin.000` est detecte, le script retelecharge et repare (`diff -r` identique a la copie saine).
- `npm run build` complet : vert (22 s, modele deja valide, `dist/modeles/kokoro/` copie).
- `npm ci` dans une copie du depot (scratchpad, supprimee) : le postinstall de protobufjs ne s'execute plus et l'avertissement `allow-scripts` a disparu. Reste un avertissement deja present, hors perimetre : `esbuild@0.28.1 (postinstall)` non couvert (la liste ne contient que `esbuild@0.28.2`), version tiree par une autre dependance.
- `packages/core` : `npx tsc --noEmit` vert, `npx vitest run` 193/193 (12 fichiers, dont 19 nouveaux tests : 8 positifs, 1 multi-jetons/PEM tronque, 9 negatifs, 1 test d'integration `detailsCommit` avec jeton a cheval sur la troncature).
- `apps/server` : `npx tsc --noEmit` vert, `npx vitest run` 200/200 (15 fichiers).
- Aucun tiret long ou moyen dans les fichiers crees.

## Limites connues

- Le script de F1 ecrit toujours dans `apps/web/public/modeles/kokoro/` (chemin fixe) : pas de dossier de sortie parametrable sans toucher a `apps/web/src`, hors zone.
- Le build exige le reseau au premier passage (Hugging Face) ; en CI, mettre le dossier en cache. En cas de modification de `@echogarden/espeak-ng-emscripten`, le dossier reste « valide » (l'empreinte d'espeak n'est comparee qu'a elle-meme) : supprimer le dossier pour forcer la regeneration.
- Le masquage ne couvre que les formats listes (decision de l'orchestrateur) : un secret sans format connu passe.
- Les tests fabriquent les faux jetons a l'execution pour ne rien laisser en clair dans le depot.

## Messages de commit proposes

```
feat(core): mask known token formats in commit diff excerpts
```
Fichiers : `packages/core/src/masquage.ts`, `packages/core/src/masquage.test.ts`, `packages/core/src/github.ts`.

```
build(web): fetch and verify the pinned voice model during build
```
Fichiers : `scripts/modeles-voix.mjs`, `package.json` (ligne build).

```
build: skip protobufjs postinstall
```
Fichier : `package.json` (ligne allowScripts). Les deux derniers commits touchent le meme fichier : `git add -p` ou un seul commit `build(web): ...` si plus simple.
