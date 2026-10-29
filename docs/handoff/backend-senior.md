# Handoff backend, B17 : `preparer_post`

## Livré
- `GET /api/repos/:repo/commits?jours=` (1 à 90, 30 par défaut), `GET /api/repos/:repo/fichiers-tuto`, `POST /api/posts/donnees` dans `apps/server/src/routes/api.ts`.
- Outil MCP `preparer_post` et prompt `preparer_post` dans `apps/server/src/mcp/outils-pub.ts` (cas `coulisses` sans commits : `commitsDisponibles`). `proposer_post_projet` conservé.
- `apps/server/src/lib/posts.ts` : `preparerPost` (route et outil partagent le même code, donc le même `DonneesPost`), `commitsDisponibles`, `ou` et `IntrouvablePost` (404 Octokit ou repo privé mappé en `Repo introuvable ou prive : ...`, géré par `api.onError`).
- Tout passe par `@weekli/core`. Session, Origin (global dans `index.ts`) et débit : comme les routes existantes. Repo lu sous le login de la session.

## Tests
`npx tsc --noEmit` : OK. `npx vitest run` dans apps/server : 18 fichiers, 236 tests verts. Nouveaux : `routes/__tests__/posts.test.ts` (plafonds du tuto, `.env` jamais lu, 400 par message, 404 repo/commit, 401, 429, types sans commits) et bloc `preparer_post` dans `mcp/__tests__/outils.test.ts`.

## Env, dépendances, code mort
Aucune variable ni dépendance ajoutée. Aucun code supprimé.

## Limites
- `GET /commits` ne refuse pas un repo privé du compte (`commitsRepo` de core ne vérifie pas la visibilité) : à corriger dans core si voulu.
- Pas de test 403 sur Origin pour ces routes (garde globale testée ailleurs). Rien de commité.
