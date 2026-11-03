# @weekli/core

Le moteur de Weekli, partagé par le serveur et le front. Aucune IA ici : le paquet prépare les données, les règles et les prompts, et valide ce que Claude renvoie.

## Contenu

| Fichier | Rôle |
|---|---|
| `src/types.ts` | Types métier : activité, commits, options, posts |
| `src/github.ts` | `activiteGithub`, `detailsRepo`, `detailsCommit`, `listerRepos`, `commitsRepo` (reçoivent un client Octokit) |
| `src/filtre.ts` | Retire le bruit des commits, plafonne à 10 repos et 30 commits par repo |
| `src/masquage.ts` | Masque les jetons de formats connus (`[secret masque]`) dans les contenus de repo, après avoir tronqué |
| `src/prompts.ts` | Prompts `posts_semaine` et `preparer_post`, prompts de génération du site, lecture de la réponse |
| `src/brouillons.ts` | Nettoyage des posts reçus, création et plafond de l'historique |
| `src/style.ts` | Style d'écriture mémorisé : `exemples` et `profil`, nettoyage |
| `src/posts/` | Les 5 types de post : catalogue, validation de la demande, règles et consignes par type, données préparées, lecture du repo pour le tuto |
| `src/pub/` | Pub vidéo : types du script, nettoyage et avertissements, 3 trames, script de départ, timeline, palette, anti-répétition, guide et schéma pour Claude, règles du post du projet |
| `src/index.ts` | Point d'entrée unique |

`github.ts` n'importe Octokit qu'en type : le front peut importer le paquet sans embarquer Octokit.

## Tests

```bash
npm test
```

Vitest couvre le filtrage, le masquage, la lecture des posts (y compris une réponse partielle pendant le streaming), la validation des demandes par type, la lecture du repo pour le tuto, le nettoyage des scripts de pub, la timeline et la palette.
