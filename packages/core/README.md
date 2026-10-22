# @weekli/core

Le moteur de Weekli, partagé par le serveur et le front.

## Contenu

| Fichier | Rôle |
|---|---|
| `src/types.ts` | Types métier : activité, commits, options, posts |
| `src/github.ts` | `activiteGithub`, `detailsRepo`, `detailsCommit` (reçoivent un client Octokit) |
| `src/filtre.ts` | Retire le bruit des commits, plafonne à 10 repos et 30 commits par repo |
| `src/prompts.ts` | Prompt MCP `posts_semaine`, prompts de génération du site, lecture de la réponse |
| `src/index.ts` | Point d'entrée unique |

`github.ts` n'importe Octokit qu'en type : le front peut importer le paquet sans embarquer Octokit.

## Tests

```bash
npm test
```

Vitest couvre le filtrage (bruit, doublons, tri, plafonds) et la lecture des posts, y compris une réponse partielle pendant le streaming.
