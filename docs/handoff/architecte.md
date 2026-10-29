# Handoff architecte : refonte du tableau par type de post

Date : 2026-10-29. Branche `feat/weekli-v1`, rien de commité.

## Fait

- **Core** (`packages/core/src/posts/`, nouveau) : `types.ts` (`TypePost`, `CATALOGUE_POSTS`, `LectureTuto`, `DemandePost`), `demande.ts` (`validerDemandePost`), `tuto.ts` (`lireRepoPourTuto`, `proposerFichiersTuto`, `LIMITES_TUTO`, `scoreFichierTuto`), `regles.ts` (`REGLES_POST`, `CONSIGNES_POST`), `donnees.ts` (`donneesPost`), `index.ts`. Exportés par `@weekli/core`.
- **Ajouts ciblés** : `github.ts` (`commitsRepo`), `prompts.ts` (`promptPreparerPost`, `systemePost`, `messagePost`), `index.ts`.
- **Tests** : `posts/tuto.test.ts`, `demande.test.ts`, `donnees.test.ts` et un cas dans `github.test.ts` (Octokit simulé).
- **Docs** : `specs.md` 4.6, `api-contract.md` 3.2, 3.8 et 4.2 (`preparer_post`), `design.md` 10, `tasks.md` (B17, F16), `changelog.md`.

## Vérifications

`npx tsc --noEmit` et `npx vitest run` dans `packages/core` : verts, 267 tests. Aucun tiret long, aucune séquence d'échappement unicode dans le code ajouté.

## Pour le backend (B17)

Voir `tasks.md` B17. Points d'attention : `lireRepoPourTuto(octokit, login, repo, fichiers?)` lève `Ce repo est prive...` pour un repo privé ; c'est `validerDemandePost` qui borne les entrées, ne pas réécrire ces règles. La réponse n'est pas mise en cache.

## Pour le frontend (F16)

Voir `design.md` 10. `apps/web` n'a pas été touché (un agent y travaille). `Ton` et `systemeGeneration` restent utilisés par l'ancien flux « Ma semaine ».

## Limites connues

- L'heuristique de choix des fichiers est volontairement simple (extensions, profondeur, noms usuels) : un monorepo peut proposer des fichiers peu parlants, d'où la liste modifiable.
- Un secret dans un format inconnu n'est pas masqué dans les fichiers lus (comme pour les diffs, 4.1) ; les fichiers de secrets usuels sont écartés par nom.
- La détection d'un fichier binaire déguisé repose sur la présence d'un octet nul.
- `coulisses` côté MCP sans commits renvoie une liste à choisir ; côté site, la liste vient de la route `commits`.

## À trancher par Soufiane

- « Ma semaine » : lien à l'étape 1 plus carte à l'étape 2, ou une seule entrée ?
- `proposer_post_projet` : le garder à côté de `preparer_post`, ou le retirer après la recette ?
- Plafond de lecture du tuto (12 fichiers, 24 000 caractères) : suffisant ou à élargir ?
