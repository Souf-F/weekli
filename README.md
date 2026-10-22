# Weekli

**Ton code de la semaine, raconté sur LinkedIn.**

Weekli lit ton activité GitHub et en tire tes meilleurs posts LinkedIn, rédigés par Claude. Deux façons de l'utiliser, un seul moteur :

| | Mode 1 : dans Claude | Mode 2 : sur le site |
|---|---|---|
| Où | Dans Claude (web, desktop, mobile) | Sur le site Weekli, dans un tableau de bord |
| Qui rédige | Ton abonnement Claude | L'API Anthropic, avec ta clé |
| Comment | Connecteur MCP | Interface React |
| Clé API | Aucune | La tienne, qui ne quitte jamais ton navigateur |

## Fonctionnalités

| | Dans Claude | Sur le site |
|---|---|---|
| Lire l'activité GitHub de la semaine | ✅ | ✅ |
| Rédiger des posts dans ton style | ✅ | ✅ (en direct) |
| Historique des brouillons (chiffré) | ✅ | ✅ |
| Captures de tes sites, données sensibles floutées | ✅ | ✅ |
| Vidéos en motion design, export MP4 | | ✅ |

> Statut : **bêta**. Voir la [feuille de route](docs/roadmap.md).

## Vue d'ensemble

```mermaid
flowchart LR
    subgraph M1[Mode 1]
        C[Claude] -- MCP --> MCP
    end
    subgraph M2[Mode 2]
        N[Navigateur<br/>React] -- session --> API
        N -- ta clé API --> A[(API Anthropic)]
    end
    subgraph W[Worker Cloudflare]
        MCP[Serveur MCP]
        API[API JSON]
        CORE[[@weekli/core]]
        MCP --> CORE
        API --> CORE
    end
    CORE -- lecture seule --> G[(GitHub)]
```

Le point clé : **le serveur Weekli n'appelle jamais d'IA lui-même**. En mode 1 c'est Claude qui pilote, en mode 2 c'est le navigateur qui appelle Anthropic directement. Le serveur ne fait que lire GitHub.

## Structure du dépôt

```
weekli/
├── apps/
│   ├── server/        Worker Cloudflare : MCP, OAuth, API, hébergement du front
│   ├── web/           Front React : site vitrine et tableau de bord
│   └── video/         Vidéos de projet en motion design 3D (Remotion)
├── packages/
│   └── core/          Moteur partagé : lecture GitHub, filtrage, prompts
├── docs/              Architecture, sécurité, outils, installation
├── .claude/skills/    Skill Claude Code « video-projet »
├── Dockerfile         Image de développement (cibles web et server)
└── docker-compose.yml Environnement local complet
```

Chaque dossier a son propre README.

## Vidéos de projet

Le skill Claude Code [`video-projet`](.claude/skills/video-projet/SKILL.md) produit, pour n'importe quel dépôt, une pub d'une minute ou l'histoire du projet de A à Z (commits, architecture, README), avec voix off, musique générée, décor 3D et transitions en motion design. Détails : [apps/video](apps/video).

## Démarrer

### Avec Docker

```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars   # renseigner les secrets GitHub
docker compose up --build
```

- Front avec rechargement à chaud : http://localhost:5173
- Worker (MCP, API, front compilé) : http://localhost:8788

### Sans Docker

```bash
npm install
cp apps/server/.dev.vars.example apps/server/.dev.vars
npm run build          # compile le front, servi ensuite par le Worker
npm run dev            # lance le Worker (8788) et Vite (5173)
```

Création de l'app OAuth GitHub et déploiement : [docs/installation.md](docs/installation.md).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Worker et front en parallèle |
| `npm run build` | Compile le front dans `apps/web/dist` |
| `npm run typecheck` | Vérifie les types de tous les paquets |
| `npm test` | Tests unitaires (Vitest) |
| `npm run deploy` | Compile puis déploie sur Cloudflare |

## Sécurité

- GitHub en lecture seule (`read:user`), repos publics uniquement.
- Mode 1 : OAuth 2.1 avec PKCE, protection CSRF, token GitHub chiffré dans le token MCP.
- Mode 2 : session chiffrée, cookie `HttpOnly` et `SameSite=Lax`, PKCE vers GitHub, clé API conservée dans le navigateur uniquement.
- Limitation de débit, vérification d'origine, CSP stricte, captures limitées aux domaines vérifiés.
- Garde-fou anti-secrets à chaque commit et en CI, `npm audit` bloquant, Dependabot.
- Aucune publication automatique.

Détails et modèle de menace : [docs/securite.md](docs/securite.md).

## Stack

TypeScript · React 19 et Vite · CSS Modules · Cloudflare Workers, Durable Objects, KV, Browser Run · Agents SDK (`McpAgent`) · Hono · Octokit · SDK Anthropic · WebCodecs (mediabunny) · Vitest · Remotion et Three.js · Docker.

## Licence

MIT
