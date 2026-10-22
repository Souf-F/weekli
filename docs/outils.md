# Référence des outils MCP

Les outils GitHub sont en **lecture seule** (`readOnlyHint: true`) et ne portent que sur les repos **publics** de l'utilisateur connecté.

## `activite_github`

Liste les commits récents, débarrassés du bruit.

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `jours` | entier, 1 à 30 | 7 | Période analysée |

**Filtrage appliqué** : forks exclus, messages `merge`, `wip`, `typo`, `update readme`, `chore`, `style`, `format`, `lint`, `bump`, `initial commit` retirés, doublons supprimés, 10 repos et 30 commits par repo au maximum, repos les plus actifs en premier.

**Exemple de réponse**
```json
{
  "depuis": "2026-10-15",
  "repos": [
    {
      "repo": "scanner-ssl",
      "description": "Audit de surface d'attaque",
      "langage": "JavaScript",
      "url": "https://github.com/Souf-F/scanner-ssl",
      "site": "https://scanner-ssl.pages.dev",
      "commits": [
        { "sha": "a1b2c3d", "message": "Ajout de la vérification DMARC", "date": "2026-10-20" }
      ]
    }
  ]
}
```

## `details_repo`

| Paramètre | Type | Description |
|---|---|---|
| `repo` | texte | Nom du repo, sans le propriétaire |

Renvoie la description, le site, les sujets, les langages, le nombre d'étoiles et le README (6000 caractères au maximum). Refuse les repos privés.

## `details_commit`

| Paramètre | Type | Description |
|---|---|---|
| `repo` | texte | Nom du repo |
| `sha` | texte, 7 caractères minimum | SHA du commit |

Renvoie le message complet, les statistiques et jusqu'à 15 fichiers modifiés avec un extrait du diff (1500 caractères par fichier). Utile pour raconter un problème résolu.

## `sauver_brouillons`

Enregistre 1 à 5 posts dans l'historique Weekli de l'utilisateur, pour les retrouver sur le site (page Historique).

| Paramètre | Type | Description |
|---|---|---|
| `posts` | tableau de `{ titre, format, source, texte }` | Textes limités (titre 200, texte 6000 caractères), caractères de contrôle retirés |

Seul outil qui écrit : il n'agit que sur l'historique de l'utilisateur connecté, jamais sur GitHub ni LinkedIn.

## `lister_brouillons`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `nonPublies` | booléen | `true` | Seulement les brouillons pas encore publiés |

## `capturer_site`

Capture d'écran d'une page d'un site dont l'utilisateur a **prouvé la propriété** (page Réglages du site).

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `url` | URL https | | Page d'un domaine vérifié, sans identifiants ni port |
| `format` | `bureau` ou `mobile` | `bureau` | 1280 × 800, ou 390 × 844 en densité 2 |

Garanties : domaine vérifié obligatoire, redirection vers un autre domaine refusée (HTTP et JavaScript), emails, IP, tokens et champs de mot de passe floutés avant la capture, 5 captures par minute, aucune image stockée.

## Prompt `posts_semaine`

| Argument | Description |
|---|---|
| `jours` | Période en jours (7 par défaut) |
| `style` | Quelques posts de l'utilisateur, pour imiter son style |

Guide Claude : appeler les outils dans l'ordre, choisir 2 ou 3 sujets, écrire en français, 800 à 1300 caractères, sans inventer de faits.

## API du site (mode 2)

Routes JSON servies par le Worker, toutes protégées par la session (cookie `HttpOnly`). Sans session : `401 {"erreur": "Non connecte"}`.

| Méthode | Route | Réponse |
|---|---|---|
| GET | `/api/moi` | `{ login, nom, avatar }` |
| GET | `/api/activite?jours=7` | Même format que `activite_github` (1 à 30 jours) |
| GET | `/api/repos/:repo` | Même format que `details_repo` |
| GET | `/api/repos/:repo/commits/:sha` | Même format que `details_commit` (SHA validé : 7 à 40 caractères hexadécimaux) |
| GET | `/api/brouillons` | Historique, du plus récent au plus ancien (100 au maximum) |
| POST | `/api/brouillons` | Corps `{ posts: Post[] }` (5 au maximum, 64 Ko) ; renvoie les brouillons créés |
| PATCH | `/api/brouillons/:id` | Corps `{ texte?, publie? }` |
| DELETE | `/api/brouillons/:id` | `204` |
| GET | `/api/domaines` | Domaines vérifiés de l'utilisateur |
| POST | `/api/domaines/preparer` | Corps `{ hote }` ; renvoie l'enregistrement DNS TXT et le fichier à publier, sans rien enregistrer |
| POST | `/api/domaines/verifier` | Corps `{ hote }` ; vérifie la preuve (DNS ou fichier) puis enregistre le domaine |
| DELETE | `/api/domaines/:hote` | `204` |
| POST | `/api/captures` | Corps `{ url, format }` ; renvoie une image JPEG |

Toute requête d'écriture doit porter l'en-tête `Origin` du site. L'historique est chiffré dans KV.

La génération des posts ne passe pas par ces routes : le navigateur appelle directement l'API Anthropic avec la clé de l'utilisateur, en s'appuyant sur `systemeGeneration`, `messageGeneration` et `lirePosts` de `@weekli/core`.
