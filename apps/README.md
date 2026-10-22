# apps

Les applications déployables de Weekli. Chacune a son `package.json` et s'appuie sur le moteur partagé [`@weekli/core`](../packages/core).

| Dossier | Rôle | Techno |
|---|---|---|
| [`server/`](server) | Worker Cloudflare : serveur MCP (mode 1), connexion GitHub et API du site (mode 2), hébergement du front compilé | TypeScript, Hono, Agents SDK |
| [`web/`](web) | Site vitrine et tableau de bord | React, Vite, CSS Modules |
| [`video/`](video) | Vidéos de projet : pub d'une minute ou histoire de A à Z, rendues en local | Remotion, Three.js |

En production, un **seul Worker** sert tout : le front compilé (`web/dist`) est déclaré comme assets statiques dans `server/wrangler.jsonc`.
