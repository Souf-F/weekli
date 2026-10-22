# apps/server/src

```
src/
├── index.ts               Point d'entrée : protections globales, puis OAuthProvider qui aiguille /mcp et le reste
├── types.ts               Props (MCP), Session (site), AppEnv (Hono)
├── mcp/
│   └── agent.ts           WeekliMCP : outils et prompt exposés à Claude
├── routes/
│   ├── app.ts             Assemble les routes Hono ci-dessous
│   ├── oauth-mcp.ts       OAuth des clients MCP : consentement puis GitHub
│   ├── auth.ts            Connexion GitHub du site (mode 2)
│   └── api.ts             API JSON du tableau de bord, protégée par session
└── lib/
    ├── session.ts         Sessions chiffrées dans KV, cookie HttpOnly
    ├── chiffrement.ts     AES-256-GCM avec clé dérivée par HKDF
    ├── github-oauth.ts    Autorisation et échange de code GitHub, avec PKCE
    ├── pages.ts           Pages HTML du Worker (consentement, erreurs), tout échappé
    ├── securite.ts        En-têtes, vérification d'origine, limitation de débit
    ├── validation.ts      Formats autorisés pour les noms de repo et les SHA
    ├── brouillons.ts      Historique chiffré des brouillons
    ├── domaines.ts        Preuve de propriété des domaines (DNS, fichier)
    ├── url-capture.ts     Validation des adresses à capturer
    ├── capture.ts         Capture via Browser Run en CDP, floutage, contrôle des redirections
    └── __tests__/         Tests Vitest du chiffrement et des protections
```

## Deux OAuth, deux usages

- **`oauth-mcp.ts`** : Weekli est _serveur_ OAuth pour Claude. Le consentement et le lien avec le navigateur passent par les helpers maintenus de `@cloudflare/workers-oauth-provider`. Claude reçoit un token Weekli, le token GitHub reste chiffré dedans.
- **`auth.ts`** : connexion classique du site. Le token GitHub est stocké dans KV, le navigateur ne reçoit qu'un identifiant de session aléatoire.

La logique métier (appels GitHub, filtrage) n'est pas ici : elle vient de [`@weekli/core`](../../../packages/core).
