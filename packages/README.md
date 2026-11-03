# packages

Code partagé entre les applications, sans dépendance à un environnement d'exécution précis.

| Paquet | Rôle | Utilisé par |
|---|---|---|
| [`core/`](core) | Lecture GitHub, filtrage, 5 types de post, script de pub (validation, timeline, palette, guide), style, masquage des jetons, prompts | `server` (MCP et API), `web` (types, validation, prompts) |
