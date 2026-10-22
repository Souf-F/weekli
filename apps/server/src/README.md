# apps/server/src

```
src/
├── index.ts               Point d'entrée : OAuthProvider qui aiguille /mcp et le reste
├── types.ts               Props (MCP), Session (site), AppEnv (Hono)
├── mcp/
│   └── agent.ts           WeekliMCP : outils et prompt exposés à Claude
├── routes/
│   ├── app.ts             Assemble les routes Hono ci-dessous
│   ├── oauth-mcp.ts       OAuth des clients MCP : consentement puis GitHub
│   ├── auth.ts            Connexion GitHub du site (mode 2)
│   └── api.ts             API JSON du tableau de bord, protégée par session
└── lib/
    ├── session.ts         Sessions KV et cookie HttpOnly
    ├── github-oauth.ts    URL d'autorisation et échange de code GitHub
    └── workers-oauth-utils.ts  CSRF, état OAuth, écran de consentement
```

## Deux OAuth, deux usages

- **`oauth-mcp.ts`** : Weekli est *serveur* OAuth pour Claude. Claude reçoit un token Weekli, le token GitHub reste chiffré dedans.
- **`auth.ts`** : connexion classique du site. Le token GitHub est stocké dans KV, le navigateur ne reçoit qu'un identifiant de session aléatoire.

La logique métier (appels GitHub, filtrage) n'est pas ici : elle vient de [`@weekli/core`](../../../packages/core).
