# Installation et déploiement

## Prérequis

- Node.js 20 ou plus
- Un compte Cloudflare (offre gratuite suffisante)
- Un compte GitHub

## 1. Créer l'app OAuth GitHub

Sur GitHub : *Settings → Developer settings → OAuth Apps → New OAuth App*.

| Champ | Local | Production |
|---|---|---|
| Homepage URL | `http://localhost:8788` | `https://weekli.<ton-sous-domaine>.workers.dev` |
| Authorization callback URL | `http://localhost:8788` | `https://weekli.<ton-sous-domaine>.workers.dev` |

L'URL de callback est la **racine** du site : GitHub accepte alors les deux chemins utilisés par Weekli, `/callback` (connecteur MCP) et `/auth/callback` (site).

Crée une app pour le local et une pour la production. Note le Client ID et génère un Client Secret.

## 2. Lancer en local

```bash
npm install
cp apps/server/.dev.vars.example apps/server/.dev.vars
```

Remplis `apps/server/.dev.vars` :

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
COOKIE_ENCRYPTION_KEY=...   # openssl rand -hex 32
```

```bash
npm run build   # compile le front
npm run dev     # Worker sur 8788, Vite sur 5173
```

Le site est sur `http://localhost:5173` (ou `8788` pour la version compilée), le serveur MCP sur `http://localhost:8788/mcp`.

### Avec Docker

```bash
docker compose up --build
```

Mêmes ports. Les secrets sont lus depuis `apps/server/.dev.vars` au démarrage et ne sont jamais copiés dans l'image.

## 3. Tester avec l'inspecteur MCP

```bash
npx @modelcontextprotocol/inspector@latest
```

Transport *Streamable HTTP*, URL `http://localhost:8788/mcp`, puis *Connect* : le flux OAuth GitHub s'ouvre.

## 4. Déployer

```bash
cd apps/server
npx wrangler kv namespace create OAUTH_KV   # copier l'id dans wrangler.jsonc
# dans wrangler.jsonc, remplace PUBLIC_URL par l'URL https du Worker
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
cd ../.. && npm run deploy
```

## 5. Ajouter à Claude

*Paramètres → Connecteurs → Ajouter un connecteur personnalisé*, puis l'URL `https://weekli.<ton-sous-domaine>.workers.dev/mcp`.
