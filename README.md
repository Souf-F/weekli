# Weekli

**Ton code, raconté sur LinkedIn.**

Weekli lit tes repos GitHub publics et t'aide à en faire des posts LinkedIn et la pub vidéo de ton projet. Il ne rédige rien lui-même : il prépare les données et les règles, puis c'est Claude qui écrit.

## Ce que fait Weekli

Le point d'entrée principal est le **connecteur Claude** : tu ajoutes Weekli comme connecteur MCP dans Claude (web, desktop ou mobile) et tu demandes un post ou une pub en une phrase. Ton abonnement Claude rédige, aucune clé API n'est nécessaire. Le site reste là pour le tableau de bord, le studio de pub et les réglages.

| | Dans Claude (connecteur MCP) | Sur le site |
|---|---|---|
| Qui rédige | Ton abonnement Claude | L'API Anthropic, avec ta clé (elle ne quitte jamais ton navigateur) |
| 5 types de post | Oui, outil `preparer_post` | Oui, tableau de bord en 4 étapes |
| Pub vidéo du projet | Claude écrit le script (`preparer_pub`, `sauver_pub`) | Studio : assistant, éditeur, aperçu, export MP4 |
| Post du projet | Oui, `preparer_post` (type `presentation`) | Panneau « Post LinkedIn » du studio |
| Style d'écriture mémorisé | Oui | Oui (Réglages) |
| Captures de sites vérifiés, données sensibles floutées | Oui | Oui |
| Historique des brouillons | Oui | Oui |

### Les 5 types de post

| Type | Pour quoi | Ce que Weekli lit |
|---|---|---|
| `presentation` | Présenter le projet (« Aujourd'hui je vous présente ») | Description et README du repo, domaines vérifiés, script de la dernière pub |
| `tuto` | Apprendre à faire une chose précise avec le projet | Arborescence, README, une douzaine de fichiers clés (modifiables) |
| `coulisses` | Raconter une décision ou un chantier | Les commits choisis, avec leur message et un extrait du diff |
| `lecon` | Un problème rencontré puis résolu | Les commits qui le racontent (facultatif) |
| `semaine` | Résumer l'activité récente | Les commits des derniers jours sur tous les repos publics |

### La pub vidéo du projet

Une pub de marque de 50 à 65 secondes en 16:9 (1920 × 1080), sans commits, code ni chiffres de développement. Claude écrit le script à partir de 3 questions (pour qui, quel problème, quelle promesse), en suivant l'une des **3 trames** : `probleme-qui-revient`, `demonstration-directe` ou `vision-manifeste`. Le script est un assemblage de **scènes** (14 types : ouverture, répétition, boucle, chorus, rupture, révélation, étape, transformation, flux, avant et après, résultat, preuve, appel, fin) sur lesquelles tu choisis les gestes de motion design.

Le studio (`/app/studio`) rend la pub dans ton navigateur : aperçu synchronisé sur le son, musique générée par le code, export MP4 (WebCodecs), miniature PNG, sous-titres SRT et rapport de contrôles. Aucun serveur vidéo.

**La voix off** se choisit dans le studio :

- **Vivienne** (voix française de Microsoft, la même qu'`edge-tts`), obtenue par le Worker. Seul le texte de la phrase est transmis. Usage non officiel du service : en cas d'échec, le studio bascule sur Kokoro.
- **Kokoro** (`ff_siwis`), exécutée dans ton navigateur : rien n'est envoyé.
- **Ma voix** (un fichier audio par scène) ou **Sans voix**.

> Statut : V1 prête pour la recette. Reste le déploiement public. Voir la [feuille de route](docs/roadmap.md).

## Vue d'ensemble

```mermaid
flowchart LR
    subgraph M1[Dans Claude]
        C[Claude] -- MCP --> MCP
    end
    subgraph M2[Sur le site]
        N[Navigateur<br/>React, studio] -- session --> API
        N -- ta clé API --> A[(API Anthropic)]
    end
    subgraph W[Worker Cloudflare]
        MCP[Serveur MCP<br/>14 outils]
        API[API JSON]
        CORE[[@weekli/core]]
        MCP --> CORE
        API --> CORE
    end
    CORE -- lecture seule --> G[(GitHub)]
    API -- texte d'une phrase --> V[(Voix Vivienne)]
```

Le point clé : **le serveur Weekli n'appelle jamais d'IA**. Dans Claude, c'est ton abonnement qui rédige. Sur le site, le navigateur appelle Anthropic directement avec ta clé. Le serveur lit GitHub, garde tes brouillons, tes pubs et ton style (chiffrés), capture tes sites vérifiés et relaie le texte des phrases vers la voix Vivienne.

## Structure du dépôt

```
weekli/
├── apps/
│   ├── server/        Worker Cloudflare : MCP, OAuth, API, voix, hébergement du front
│   ├── web/           Front React : accueil, tableau de bord, studio de pub, réglages
│   └── video/         Outil interne : la pub de lancement de Weekli (Remotion)
├── packages/
│   └── core/          Moteur partagé : lecture GitHub, types de post, script de pub, prompts
├── docs/              Architecture, sécurité, outils, installation, feuille de route
├── scripts/           Modèle vocal au build, garde-fou anti-secrets, hooks Git
├── .claude/skills/    Skill Claude Code « video-projet »
├── Dockerfile         Image de développement (cibles web et server)
└── docker-compose.yml Environnement local complet
```

Chaque dossier a son propre README.

## Démarrer

Prérequis : Node.js 20 ou plus. Il faut d'abord créer l'app OAuth GitHub (deux URI de redirection) : voir [docs/installation.md](docs/installation.md).

### Sans Docker

```bash
npm install
cp apps/server/.dev.vars.example apps/server/.dev.vars   # renseigner les secrets GitHub
npm run build          # compile le front et prépare le modèle vocal de secours
npm run dev            # Worker sur 8788 et Vite sur 5173
```

### Avec Docker

```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars
docker compose up --build
```

- Front avec rechargement à chaud : http://localhost:5173
- Worker (MCP sur `/mcp`, API, front compilé) : http://localhost:8788

Pour tester le connecteur dans Claude depuis ta machine, il faut un tunnel : voir [docs/installation.md](docs/installation.md).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Worker (8788) et front Vite (5173) en parallèle |
| `npm run build` | Prépare le modèle vocal de secours, puis compile le front dans `apps/web/dist` |
| `npm run typecheck` | Vérifie les types de tous les paquets |
| `npm test` | Tests unitaires (Vitest) |
| `npm run deploy` | Compile puis déploie sur Cloudflare |

## Sécurité

- GitHub en lecture seule (`read:user`), repos publics uniquement.
- Connecteur : OAuth 2.1 avec PKCE, consentement avant GitHub, protection CSRF, token GitHub chiffré dans le token MCP.
- Site : session chiffrée, cookie `HttpOnly` et `SameSite=Lax`, clé API conservée dans le navigateur uniquement.
- Données chiffrées en AES-256-GCM, gardées 90 jours après la dernière modification ; export et effacement complet depuis les Réglages.
- Jetons connus masqués dans les contenus de repo envoyés à Claude, contenus de repo marqués `contenu_non_fiable`.
- Limitation de débit, vérification d'origine, CSP stricte, isolation cross-origin (COOP et COEP), captures limitées aux domaines vérifiés.
- Garde-fou anti-secrets à chaque commit et en CI, `npm audit` bloquant, Dependabot.
- Aucune publication automatique : tu copies et publies toi-même.

Détails et modèle de menace : [docs/securite.md](docs/securite.md).

## Stack

TypeScript · React 19 et Vite · CSS Modules · Cloudflare Workers, Durable Objects, KV, Browser Run · Agents SDK (`McpAgent`) · Hono · Octokit · SDK Anthropic · WebCodecs (mediabunny) · onnxruntime-web (voix Kokoro) · Vitest · Remotion et Three.js (outil interne) · Docker.

## Licence

**GPL-3.0-only** (voir [LICENSE](LICENSE)). Le site embarque le phonémiseur espeak-ng, distribué sous GPL-3.0, pour la voix Kokoro générée dans le navigateur. Le modèle Kokoro est sous Apache-2.0 et la voix `ff_siwis` est entraînée sur le corpus SIWIS (CC-BY 4.0).
