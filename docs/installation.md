# Installation et déploiement

## Prérequis

- Node.js 20 ou plus
- Un compte Cloudflare (offre gratuite suffisante)
- Un compte GitHub

## 1. Créer l'app OAuth GitHub

Sur GitHub : *Settings → Developer settings → OAuth Apps → New OAuth App*. L'app doit porter **2 URI de redirection** (ajoute la seconde avec « Add callback URL » si le formulaire n'en propose qu'une).

| Champ | Local | Production |
|---|---|---|
| Homepage URL | `http://localhost:8788` | `https://weekli.<ton-sous-domaine>.workers.dev` |
| Redirect URI 1 | `http://localhost:8788/auth/callback` | `https://weekli.<ton-sous-domaine>.workers.dev/auth/callback` |
| Redirect URI 2 | `http://localhost:8788/callback` | `https://weekli.<ton-sous-domaine>.workers.dev/callback` |

Déclare ces **deux URI de redirection exactes** (sans joker) : `/auth/callback` pour la connexion du site, `/callback` pour le connecteur MCP. Laisse « Expire user access tokens » coché : les sessions durent 8 heures, comme les tokens.

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

Le site est sur `http://localhost:5173` (ou `http://localhost:8788` pour la version compilée), le serveur MCP sur `http://localhost:8788/mcp`. `npm run build` prépare aussi le modèle vocal Kokoro (téléchargement d'environ 94 Mo la première fois, vérifié par SHA-256).

### Avec Docker

```bash
docker compose up --build
```

Mêmes ports. Les secrets sont lus depuis `apps/server/.dev.vars` au démarrage et ne sont jamais copiés dans l'image.

## 3. Tester avec l'inspecteur MCP (facultatif)

```bash
npx @modelcontextprotocol/inspector@latest
```

Transport *Streamable HTTP*, URL `http://localhost:8788/mcp`, puis *Connect* : le flux OAuth GitHub s'ouvre.

## 4. Tester le connecteur dans Claude en local

Claude ne peut pas joindre `localhost` : il faut une adresse publique temporaire. Avec Cloudflare Tunnel :

```bash
cloudflared tunnel --url http://localhost:8788
```

La commande affiche une adresse `https://<mot>-<mot>.trycloudflare.com`. Ensuite :

1. Dans `apps/server/.dev.vars`, ajoute `PUBLIC_URL=https://<ton-tunnel>.trycloudflare.com` (cette valeur remplace celle de `wrangler.jsonc`), puis relance `npm run dev`. `PUBLIC_URL` doit pointer sur l'adresse du tunnel : c'est l'identifiant de ressource OAuth du connecteur et la base des liens du studio.
2. Dans l'app OAuth GitHub, **ajoute les 2 URI du tunnel** : `https://<ton-tunnel>.trycloudflare.com/auth/callback` et `https://<ton-tunnel>.trycloudflare.com/callback`.
3. Dans Claude : *Paramètres → Connecteurs → Ajouter un connecteur personnalisé*, URL `https://<ton-tunnel>.trycloudflare.com/mcp`.

L'adresse change à chaque lancement du tunnel : refais les étapes 1 et 2, puis retire le tunnel et la ligne `PUBLIC_URL` du `.dev.vars` quand tu as fini.

## 5. Déployer

```bash
cd apps/server
npx wrangler kv namespace create OAUTH_KV   # copier l'id dans wrangler.jsonc
# dans wrangler.jsonc, remplace PUBLIC_URL par l'URL https du Worker
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
cd ../.. && npm run deploy
```

## 6. Ajouter à Claude

*Paramètres → Connecteurs → Ajouter un connecteur personnalisé*, puis l'URL `https://weekli.<ton-sous-domaine>.workers.dev/mcp`.
