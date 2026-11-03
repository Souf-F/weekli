# apps

Les applications de Weekli. Chacune a son `package.json` et s'appuie sur le moteur partagé [`@weekli/core`](../packages/core).

| Dossier | Rôle | Techno |
|---|---|---|
| [`server/`](server) | Worker Cloudflare : connecteur MCP (14 outils), connexion GitHub et API du site, voix Vivienne, hébergement du front compilé | TypeScript, Hono, Agents SDK |
| [`web/`](web) | Accueil, tableau de bord (5 types de post), studio de pub vidéo, réglages | React, Vite, CSS Modules |
| [`video/`](video) | Outil interne : la pub de lancement de Weekli lui-même, rendue en local (non déployé) | Remotion, Three.js |

En production, un **seul Worker** sert tout : le front compilé (`web/dist`) est déclaré comme assets statiques dans `server/wrangler.jsonc`. Le rendu des pubs des utilisateurs se fait dans leur navigateur, pas dans `video/`.
