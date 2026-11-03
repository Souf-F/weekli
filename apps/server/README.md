# @weekli/server

Worker Cloudflare qui porte tout le back-end de Weekli.

## Ce qu'il sert

| Route | Rôle |
|---|---|
| `/mcp` | Serveur MCP (Streamable HTTP, 14 outils), protégé par OAuth |
| `/authorize`, `/token`, `/register`, `/callback`, `/.well-known/*` | OAuth 2.1 pour les clients MCP comme Claude |
| `/auth/login`, `/auth/callback`, `/auth/logout` | Connexion GitHub du site, session par cookie |
| `/api/moi`, `/api/activite`, `/api/repos*` | GitHub : profil, activité, repos, commits, lecture d'un repo pour le tuto |
| `/api/posts/donnees` | Données préparées pour un des 5 types de post |
| `/api/brouillons*`, `/api/pubs*`, `/api/style` | Historique, pubs vidéo et style d'écriture, chiffrés dans KV |
| `/api/voix` | Voix off Vivienne (service de lecture d'Edge), 200 phrases par jour et par compte |
| `/api/domaines*`, `/api/captures` | Domaines vérifiés et captures de sites |
| `/api/moi/donnees` | Export (GET) et effacement complet (DELETE) |
| tout le reste | Front React compilé (`../web/dist`), en application monopage |

Détail des outils et des routes : [docs/outils.md](../../docs/outils.md).

## Lancer

```bash
cp .dev.vars.example .dev.vars   # GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, COOKIE_ENCRYPTION_KEY
npm run dev                       # http://localhost:8788
```

Le front doit avoir été compilé au moins une fois (`npm run build` à la racine) pour que `/` réponde. Pour utiliser le connecteur depuis Claude, il faut un tunnel : voir [docs/installation.md](../../docs/installation.md).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | `wrangler dev` sur le port 8788 |
| `npm run deploy` | Déploie le Worker |
| `npm run typegen` | Régénère les types de `Env` depuis `wrangler.jsonc` |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests du chiffrement, des protections, des routes et des outils MCP |

## Fichiers

- `wrangler.jsonc` : Durable Object `WeekliMCP`, KV `OAUTH_KV`, limites de débit, Browser Run, `PUBLIC_URL`, assets du front.
- `.dev.vars.example` : modèle des secrets locaux (le vrai `.dev.vars` n'est jamais commité).
- [`src/`](src) : le code, détaillé dans son README.
