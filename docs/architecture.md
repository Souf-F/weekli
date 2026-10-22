# Architecture

## Vue d'ensemble

Le dépôt est un **monorepo npm** en trois paquets :

| Paquet | Rôle |
|---|---|
| `packages/core` | Moteur partagé : lecture GitHub, filtrage, prompts, types |
| `apps/server` | Worker Cloudflare, déployé seul |
| `apps/web` | Front React, compilé puis servi par le Worker |

En production, Weekli est un seul **Cloudflare Worker** qui joue quatre rôles :

1. **Serveur d'autorisation OAuth** pour les clients MCP (Claude), via `@cloudflare/workers-oauth-provider`.
2. **Serveur MCP** sur `/mcp`, une instance de `WeekliMCP` (un Durable Object par session).
3. **API du site** sur `/api/*`, avec sa propre connexion GitHub sur `/auth/*`.
4. **Hébergement du front** React compilé, en application monopage.

```mermaid
flowchart TB
    R[Requête entrante] --> A{Route}
    A -- fichier du front --> S[Front React compilé]
    A -- /auth/* /api/* --> W[Session et API du site]
    A -- /mcp --> T{Token MCP valide ?}
    T -- non --> E[401 + métadonnées OAuth]
    T -- oui --> D[Durable Object WeekliMCP<br/>this.props = login + token GitHub]
    A -- /authorize /callback --> H[GitHubHandler<br/>Hono]
    A -- /token /register --> P[OAuthProvider]
```

## Le double OAuth

Weekli est à la fois **serveur** OAuth (face à Claude) et **client** OAuth (face à GitHub). Claude ne voit jamais le token GitHub : il reçoit un token Weekli, qui contient le token GitHub chiffré dans ses `props`.

```mermaid
sequenceDiagram
    participant C as Claude
    participant P as Weekli
    participant U as Navigateur
    participant G as GitHub

    C->>P: POST /register (enregistrement dynamique)
    C->>U: ouvre /authorize?client_id&code_challenge (PKCE)
    U->>P: GET /authorize
    P-->>U: écran de consentement + cookie CSRF
    U->>P: POST /authorize (approuvé)
    P-->>U: redirection vers GitHub (state lié au navigateur)
    U->>G: connexion, scope read:user
    G-->>U: redirection /callback?code&state
    U->>P: GET /callback
    P->>P: vérifie state (KV + cookie)
    P->>G: échange code contre access token
    P->>P: completeAuthorization(props chiffrées)
    P-->>U: redirection vers Claude avec code Weekli
    C->>P: POST /token (code + code_verifier)
    P-->>C: token d'accès MCP
```

## Cycle d'un appel d'outil

```mermaid
flowchart LR
    C[Claude] -->|tools/call activite_github| M[WeekliMCP]
    M -->|Octokit| L[repos publics]
    L --> F[filtre.ts<br/>bruit, doublons, plafonds]
    F -->|JSON| C
```

Le filtrage limite la réponse à **10 repos et 30 commits par repo**, pour garder le contexte de Claude lisible et éviter les réponses énormes.

## Pourquoi ces choix

| Choix | Raison |
|---|---|
| Connecteur MCP plutôt qu'app avec clé API | L'utilisateur utilise son abonnement Claude de façon officielle, aucun coût d'IA pour le serveur |
| Cloudflare Workers | Gratuit à petite échelle, déployé partout, OAuth et Durable Objects intégrés |
| Durable Object par session | État isolé par utilisateur, prêt pour les fonctionnalités à venir (brouillons, historique) |
| Pas d'appel LLM côté serveur | Surface d'attaque et coûts réduits, l'IA reste chez l'utilisateur |
| Monorepo avec `@weekli/core` | Une seule implémentation de la lecture GitHub et des prompts pour les deux modes |
| Génération dans le navigateur (mode 2) | La clé API ne touche jamais le serveur, aucun coût d'IA côté Weekli |
| React + CSS Modules | Composants isolés, styles sans collision, chargement différé de l'app |
