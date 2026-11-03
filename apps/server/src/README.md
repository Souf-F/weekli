# apps/server/src

```
src/
├── index.ts               Point d'entrée : protections globales, puis OAuthProvider qui aiguille /mcp et le reste
├── types.ts               Props (MCP), Session (site), AppEnv (Hono)
├── mcp/
│   ├── agent.ts           WeekliMCP : identité relue à chaque appel, alarme d'inactivité de 24 h
│   ├── contexte.ts        Contexte partagé par les fichiers d'outils
│   ├── outils-github.ts   activite_github, details_repo, details_commit, lister_repos
│   ├── outils-brouillons.ts  sauver_brouillons, lister_brouillons, prompt posts_semaine
│   ├── outils-style.ts    lire_style, sauver_style
│   ├── outils-captures.ts capturer_site
│   └── outils-pub.ts      preparer_pub, sauver_pub, lister_pubs, lire_pub, preparer_post, prompts pub_projet, preparer_post, post_projet
├── routes/
│   ├── app.ts             Assemble les routes Hono ci-dessous
│   ├── oauth-mcp.ts       OAuth des clients MCP : consentement puis GitHub
│   ├── auth.ts            Connexion GitHub du site
│   └── api.ts             API JSON du site, protégée par session
└── lib/
    ├── session.ts         Sessions chiffrées dans KV, index des sessions, cookie HttpOnly
    ├── chiffrement.ts     AES-256-GCM avec clé dérivée par HKDF
    ├── props.ts           Token GitHub chiffré dans les props MCP
    ├── github-oauth.ts    Autorisation, échange de code, révocation du token et de l'autorisation GitHub
    ├── pages.ts           Pages HTML du Worker (consentement, erreurs), tout échappé
    ├── securite.ts        En-têtes, vérification d'origine, limitation de débit
    ├── validation.ts      Formats autorisés pour les noms de repo et les SHA
    ├── conservation.ts    Durées : 90 jours pour les données, 30 jours pour une autorisation MCP
    ├── brouillons.ts, pubs.ts, style.ts, domaines.ts   Données de l'utilisateur, chiffrées dans KV
    ├── donnees.ts         Effacement complet du compte
    ├── mcp-index.ts       Index des Durable Objects MCP d'un compte, pour les détruire à l'effacement
    ├── acces-mcp.ts       Refuse l'accès à la session MCP d'un autre compte
    ├── voix.ts, voix-gec.ts  Voix Vivienne : WebSocket sortant vers le service de lecture d'Edge, cache partagé, quota
    ├── url-capture.ts, capture.ts, flou.ts   Captures via Browser Run, floutage, contrôle des redirections
    ├── posts.ts           Données préparées d'un post par type, partagées par la route et l'outil MCP
    ├── listes.ts          Petits index chiffrés dans KV (sessions, Durable Objects d'un compte)
    └── __tests__/         Tests Vitest
```

## Deux OAuth, deux usages

- **`oauth-mcp.ts`** : Weekli est _serveur_ OAuth pour Claude. Le consentement et le lien avec le navigateur passent par les helpers de `@cloudflare/workers-oauth-provider`. Claude reçoit un token Weekli, le token GitHub reste chiffré dedans.
- **`auth.ts`** : connexion classique du site. Le token GitHub est stocké chiffré dans KV, le navigateur ne reçoit qu'un identifiant de session aléatoire.

La logique métier (appels GitHub, filtrage, types de post, script de pub) n'est pas ici : elle vient de [`@weekli/core`](../../../packages/core).
