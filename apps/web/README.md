# @weekli/web

Front React de Weekli : la page d'accueil, le tableau de bord, le studio de pub vidéo et les réglages.

## Lancer

```bash
npm run dev     # http://localhost:5173
```

Vite relaie `/api`, `/auth`, `/mcp` et les routes OAuth vers le Worker (`http://localhost:8788` par défaut, ou `API_URL`). Le Worker doit donc tourner à côté (`npm run dev` à la racine lance les deux).

## Pages

| Route | Page | Chargement |
|---|---|---|
| `/` | Accueil : connecteur Claude, pub du projet, post du projet, installation | Immédiat |
| `/app` | Tableau de bord : repo, type de post, réglages du type, rédaction des posts | À la demande |
| `/app/historique` | Brouillons enregistrés : édition, copie, publié ou non, suppression | À la demande |
| `/app/studio` | Studio de pub : Mes pubs, assistant, éditeur, aperçu, export MP4, post du projet | À la demande |
| `/app/captures` | Captures des sites vérifiés | À la demande |
| `/app/reglages` | Clé API, modèle, style d'écriture, domaines vérifiés, export et effacement des données | À la demande |
| `/confidentialite`, `/mentions-legales` | Pages légales | Immédiat |

L'app est chargée à part (`React.lazy`) pour que l'accueil reste léger : le SDK Anthropic n'est téléchargé qu'en ouvrant `/app`.

## Tableau de bord : 5 types de post

Parcours en 4 étapes : repo, type (`presentation`, `tuto`, `coulisses`, `lecon`, `semaine`), réglages du type, posts. La liste des commits n'apparaît que pour les types qui en ont besoin. Lien direct possible avec `?repo=&type=`. Le navigateur appelle **directement** l'API Anthropic avec la clé de l'utilisateur, en streaming. La clé est rangée en `sessionStorage` (ou `localStorage` si l'utilisateur coche « se souvenir ») et ne passe jamais par le serveur Weekli. Sans clé, le tableau propose la demande à copier dans Claude.

## Pub vidéo

Le studio (`/app/studio`) ouvre trois écrans : la liste « Mes pubs », l'assistant (`?nouveau` : projet, 3 questions, captures, script de départ) et l'éditeur (`?pub=<id>`, lien donné par Claude). L'éditeur règle les scènes, les gestes, la marque (couleurs, logo), la voix et l'export, et propose le panneau « Post LinkedIn » du projet. Le script de pub (`ScriptPub`) est enregistré par `/api/pubs` (sauvegarde différée de 2 s).

Le moteur (`lib/pub/`) dessine chaque image 1920 × 1080 sur un canvas, comme fonction pure du temps. L'export (`lib/pub/export.ts`) monte le MP4 image par image avec WebCodecs, avec la musique générée et la voix, et produit la miniature PNG, les sous-titres SRT et un rapport de contrôles. Aucun serveur vidéo.

## Voix off

Au choix dans le studio : **Vivienne** (via `POST /api/voix`, le Worker relaie le texte de la phrase), **Kokoro** (`ff_siwis`, dans un Web Worker avec onnxruntime-web, rien n'est envoyé), **Ma voix** (audio importé) ou **Sans voix**. Si Vivienne échoue, le studio bascule sur Kokoro. Le modèle Kokoro est préparé au build par `scripts/modeles-voix.mjs` dans `public/modeles/kokoro/` (non versionné) et servi par le Worker.

## Choix techniques

- **CSS Modules** : un fichier `.module.css` par composant, classes isolées. Les couleurs viennent de `src/styles/tokens.css`.
- **Alias `@/`** vers `src/`.
- **Fond WebGL** partagé par toutes les pages, avec repli CSS sans WebGL.
- **Page isolée** (`COOP` et `COEP` dans `public/_headers`) : toute ressource tierce doit être chargée avec `crossorigin="anonymous"` (avatars GitHub).
- Respect de `prefers-reduced-motion` partout.
- Pages de travail `dev/` (bancs d'essai des scènes, de l'audio et de la pub de Weekli), hors production.

Arborescence détaillée : [`src/README.md`](src/README.md).
