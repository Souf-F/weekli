# Installation et déploiement

## Prérequis

- Node.js 20 ou plus
- Un compte Cloudflare (offre gratuite suffisante)
- Un compte GitHub

## 1. Créer l'app OAuth GitHub

Sur GitHub : *Settings → Developer settings → OAuth Apps → New OAuth App*.

| Champ | Local | Production |
|---|---|---|
| Homepage URL | `http://localhost:8788` | `https://postforge.<ton-sous-domaine>.workers.dev` |
| Authorization callback URL | `http://localhost:8788/callback` | `https://postforge.<ton-sous-domaine>.workers.dev/callback` |

Crée une app pour le local et une pour la production. Note le Client ID et génère un Client Secret.

## 2. Lancer en local

```bash
npm install
cp .dev.vars.example .dev.vars
```

Remplis `.dev.vars` :

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
COOKIE_ENCRYPTION_KEY=...   # openssl rand -hex 32
```

```bash
npm run dev
```

Le site est sur `http://localhost:8788`, le serveur MCP sur `http://localhost:8788/mcp`.

## 3. Tester avec l'inspecteur MCP

```bash
npx @modelcontextprotocol/inspector@latest
```

Transport *Streamable HTTP*, URL `http://localhost:8788/mcp`, puis *Connect* : le flux OAuth GitHub s'ouvre.

## 4. Déployer

```bash
npx wrangler kv namespace create OAUTH_KV   # copier l'id dans wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
npm run deploy
```

## 5. Ajouter à Claude

*Paramètres → Connecteurs → Ajouter un connecteur personnalisé*, puis l'URL `https://postforge.<ton-sous-domaine>.workers.dev/mcp`.
