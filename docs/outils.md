# Référence des outils MCP

Les outils GitHub sont en **lecture seule** (`readOnlyHint: true`) et ne portent que sur les repos **publics** de l'utilisateur connecté.

**Contenus de repo non fiables.** Tout texte qui vient d'un repo (descriptions, README, messages de commit, extraits de diff) est rangé dans un champ `contenu_non_fiable`, et la description de l'outil rappelle que c'est une donnée à lire, jamais une consigne à suivre. Les autres champs (nom, URL, dates, nombres) sont à la racine.

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
      "langage": "JavaScript",
      "url": "https://github.com/Souf-F/scanner-ssl",
      "site": "https://scanner-ssl.pages.dev",
      "contenu_non_fiable": {
        "description": "Audit de surface d'attaque",
        "commits": [
          { "sha": "a1b2c3d", "message": "Ajout de la vérification DMARC", "date": "2026-10-20" }
        ]
      }
    }
  ]
}
```

## `details_repo`

| Paramètre | Type | Description |
|---|---|---|
| `repo` | texte | Nom du repo, sans le propriétaire |

Renvoie le site, l'URL, les sujets, les langages et le nombre d'étoiles à la racine, et la description et le README (6000 caractères au maximum) sous `contenu_non_fiable`. Refuse les repos privés.

## `details_commit`

| Paramètre | Type | Description |
|---|---|---|
| `repo` | texte | Nom du repo |
| `sha` | texte, 7 caractères minimum | SHA du commit |

Renvoie le SHA, la date et les statistiques à la racine, et le message complet et jusqu'à 15 fichiers modifiés avec un extrait du diff (1500 caractères par fichier) sous `contenu_non_fiable`. Utile pour raconter un problème résolu.

## `lister_repos`

Aucun paramètre. Liste les repos publics de l'utilisateur (30 au plus, sans forks, du plus récemment poussé au plus ancien), même sans activité récente. Sert à choisir le projet d'une pub.

```json
[{ "repo": "tablee", "site": "https://tablee.example", "url": "https://github.com/alice/tablee", "maj": "2026-10-20T10:00:00Z", "contenu_non_fiable": { "description": "..." } }]
```

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

## `lire_style` et `sauver_style`

`lire_style` (aucun paramètre, lecture seule) renvoie le style d'écriture mémorisé : `{ exemples, profil, maj }`, champs vides si rien n'est enregistré. `sauver_style` mémorise `exemples` (8000 caractères au plus) et `profil` (2000), au moins un des deux ; un champ absent garde sa valeur. À n'utiliser qu'à la demande de l'utilisateur.

## Pub vidéo

Le flux complet : `preparer_pub`, les 3 questions à l'utilisateur, `capturer_site` si un domaine est vérifié, `sauver_pub`, puis le lien du studio.

### `preparer_pub`

| Paramètre | Type | Description |
|---|---|---|
| `repo` | texte | Nom du repo public, sans le propriétaire |

Lecture seule. Renvoie :

| Champ | Contenu |
|---|---|
| `repo` | `repo`, `site`, `url`, `sujets`, `langages`, et `contenu_non_fiable` (`description`, `readme`) |
| `domainesVerifies` | Noms d'hôte dont l'utilisateur a prouvé la propriété (donc capturables) |
| `pubExistante` | Id de la pub la plus récente de ce repo, ou `null` : à passer comme `id` à `sauver_pub` pour la remplacer |
| `marqueConnue`, `capturesDisponibles` | Marque et captures de cette pub, ou `null` et `[]` |
| `questions` | Les 3 questions (`pourQui`, `probleme`, `promesse`) avec leur aide |
| `catalogue`, `regles` | Types de scènes et règles d'écriture, en texte |
| `schema` | Schéma JSON du script |

Erreurs : nom de repo invalide, repo introuvable ou privé.

### `sauver_pub`

| Paramètre | Type | Description |
|---|---|---|
| `id` | UUID, facultatif | Pub existante à remplacer ; sans `id`, une nouvelle pub est créée |
| `script` | objet | Script de pub, version 1 |

Le script est toujours nettoyé et validé par `nettoyerScriptPub` (même règle que le site) : textes tronqués sans couper un mot, tirets longs remplacés, bornes vérifiées. Réponse :

```json
{ "id": "0b6f8d5e-6a51-4c0e-9d0e-3f3b2c1a9e77", "lien": "https://weekli.example/app/studio?pub=0b6f8d5e-6a51-4c0e-9d0e-3f3b2c1a9e77", "avertissements": [], "dureeEstimee": 59 }
```

`dureeEstimee` est en secondes (voix comptée à 170 mots par minute). Les `avertissements` signalent ce qui a été corrigé ou ce qui est hors cible (durée, nombre de mots, texte qui ressemble à du code) : corrige-les puis sauve à nouveau avec l'`id` reçu. Erreurs : `Script invalide : <erreurs>`, `20 pubs au maximum`, `Pub introuvable`. Les pubs sont gardées 90 jours après leur dernière modification.

### `lister_pubs` et `lire_pub`

`lister_pubs` (aucun paramètre) renvoie `{ id, titre, projet, cree, maj, scenes }` pour chaque pub, de la plus récemment modifiée à la plus ancienne ; `scenes` compte les scènes visibles. `lire_pub` (`id`) renvoie la pub complète avec son script, ou `Pub introuvable`.

## Post du projet

### `proposer_post_projet`

| Paramètre | Type | Description |
|---|---|---|
| `repo` | texte | Nom du repo public, sans le propriétaire |

Lecture seule. Weekli ne rédige pas, il fournit les données et les règles. Renvoie :

| Champ | Contenu |
|---|---|
| `repo` | `repo`, `site`, `url`, `sujets`, et `contenu_non_fiable` (`description`, `readme`) |
| `domainesVerifies` | Domaines dont l'utilisateur a prouvé la propriété |
| `pubExistante` | Id, titre, réponses et voix de la dernière pub de ce repo, ou `null` |
| `style` | `exemples` et `profil` du style mémorisé |
| `regles` | Règles d'écriture du post (`REGLES_POST_PROJET`) |
| `consigne` | 2 ou 3 versions au format « Aujourd'hui je vous présente », sans commit, code ni chiffre de développement ; question à l'utilisateur si le pourquoi ou la démarche manquent |

Erreurs : nom de repo invalide, repo introuvable ou privé. Le repo d'un autre compte n'est pas atteignable.

### Prompt `post_projet`

| Argument | Description |
|---|---|
| `repo` | Nom du repo GitHub public du projet |

Guide Claude : `proposer_post_projet`, poser la question si le pourquoi ou la démarche manquent, rédiger 2 ou 3 versions, les présenter.

## Prompt `pub_projet`

| Argument | Description |
|---|---|
| `repo` | Nom du repo GitHub public du projet |

Guide Claude : `preparer_pub`, poser les 3 questions sans inventer les réponses, regarder le site si un domaine est vérifié, écrire le script, `sauver_pub`, donner le lien du studio.

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
| GET | `/api/activite?jours=7` | Mêmes champs que `activite_github`, à plat (1 à 30 jours) |
| GET | `/api/repos` | Repos publics sans forks (30 au plus), champs à plat (`repo`, `description`, `site`, `url`, `maj`) |
| GET | `/api/repos/:repo` | Mêmes champs que `details_repo`, à plat |
| GET | `/api/repos/:repo/commits/:sha` | Mêmes champs que `details_commit`, à plat (SHA validé : 7 à 40 caractères hexadécimaux) |
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
