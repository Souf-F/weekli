# @weekli/web

Front React de Weekli : la page d'accueil et l'application (tableau de bord, réglages).

## Lancer

```bash
npm run dev     # http://localhost:5173
```

Vite relaie `/api`, `/auth`, `/mcp` et les routes OAuth vers le Worker (`http://localhost:8788` par défaut, ou `API_URL`). Le Worker doit donc tourner à côté.

## Pages

| Route | Page | Chargement |
|---|---|---|
| `/` | Accueil : présentation, deux modes, installation du connecteur | Immédiat |
| `/app` | Tableau de bord : commits, options, génération et édition des posts | À la demande |
| `/app/historique` | Brouillons enregistrés : édition, copie, publié ou non, suppression | À la demande |
| `/app/studio` | Studio vidéo : storyboard, aperçu animé, export MP4 | À la demande |
| `/app/captures` | Captures des sites vérifiés | À la demande |
| `/app/reglages` | Clé API, modèle, style, domaines vérifiés | À la demande |

L'app est chargée à part (`React.lazy`) pour que l'accueil reste léger : le SDK Anthropic n'est téléchargé qu'en ouvrant `/app`.

## Génération (mode 2)

Le navigateur appelle **directement** l'API Anthropic avec la clé de l'utilisateur, en streaming. La clé est rangée en `sessionStorage` (ou `localStorage` si l'utilisateur coche « se souvenir ») et ne passe jamais par le serveur Weekli.

## Vidéos

Le studio transforme un brouillon en vidéo verticale 1080 × 1350. Le storyboard (automatique ou rédigé par Claude) est dessiné sur un canvas par `lib/video/scenes.ts`, puis enregistré en temps réel par `MediaRecorder` dans `lib/video/moteur.ts` : MP4 quand le navigateur sait l'encoder, WebM sinon. Aucun serveur vidéo.

## Choix techniques

- **CSS Modules** : un fichier `.module.css` par composant, classes isolées. Les couleurs viennent de `src/styles/tokens.css`.
- **Alias `@/`** vers `src/`.
- **Fond WebGL** partagé par toutes les pages, avec repli CSS sans WebGL.
- Respect de `prefers-reduced-motion` partout.

Arborescence détaillée : [`src/README.md`](src/README.md).
