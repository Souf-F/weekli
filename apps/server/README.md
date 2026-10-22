# @weekli/server

Worker Cloudflare qui porte tout le back-end de Weekli.

## Ce qu'il sert

| Route | Rôle | Mode |
|---|---|---|
| `/mcp` | Serveur MCP (Streamable HTTP), protégé par OAuth | 1 |
| `/authorize`, `/token`, `/register`, `/callback`, `/.well-known/*` | OAuth 2.1 pour les clients MCP comme Claude | 1 |
| `/auth/login`, `/auth/callback`, `/auth/logout` | Connexion GitHub du site, session par cookie | 2 |
| `/api/moi`, `/api/activite`, `/api/repos/:repo`, `/api/repos/:repo/commits/:sha` | API JSON du tableau de bord | 2 |
| tout le reste | Front React compilé (`../web/dist`), en SPA | 2 |

## Lancer

```bash
cp .dev.vars.example .dev.vars   # GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, COOKIE_ENCRYPTION_KEY
npm run dev                       # http://localhost:8788
```

Le front doit avoir été compilé au moins une fois (`npm run build` à la racine) pour que `/` réponde.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | `wrangler dev` sur le port 8788 |
| `npm run deploy` | Déploie le Worker |
| `npm run typegen` | Régénère les types de `Env` depuis `wrangler.jsonc` |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests du chiffrement et des protections |

## Fichiers

- `wrangler.jsonc` : Durable Object `WeekliMCP`, KV `OAUTH_KV`, limites de débit, `PUBLIC_URL`, assets du front.
- `.dev.vars.example` : modèle des secrets locaux (le vrai `.dev.vars` n'est jamais commité).
- [`src/`](src) : le code, détaillé dans son README.
