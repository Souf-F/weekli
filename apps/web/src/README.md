# apps/web/src

```
src/
├── main.tsx               Montage React
├── App.tsx                Routes, chargement différé de l'app
├── styles/
│   ├── tokens.css         Palette, échelle typographique, espacements, mouvement : seule source de valeurs
│   └── global.css         Base et animation d'apparition (.revele)
├── lib/                   Logique sans interface
│   ├── api.ts             Client de l'API Weekli
│   ├── generation.ts      Appel streaming à l'API Anthropic depuis le navigateur
│   ├── reglages.ts        Clé API et préférences dans le stockage du navigateur
│   ├── mesh.ts            Rendu WebGL du dégradé de fond
│   ├── pub/               Moteur de pub, scènes, audio, export (1920 × 1080)
│   ├── studio/            Edition du script, brouillon d'assistant, contrôles d'export
│   └── voix/              Synthèse vocale dans le navigateur
├── hooks/
│   ├── useMoi.ts          Session GitHub de l'utilisateur
│   └── useReveal.ts       Apparitions au scroll
├── components/            Briques réutilisables (Bouton, Logo, MeshBackground)
├── layouts/
│   └── AppLayout.tsx      Barre de l'app et garde de connexion
└── pages/
    ├── Accueil/           Page d'accueil, une section par fichier dans sections/
    ├── Tableau/           Tableau de bord : activité, options, cartes de posts
    ├── Historique/        Brouillons enregistrés, filtres et actions
    ├── Studio/            Mes pubs, assistant, éditeur, aperçu et export
    ├── Captures/          Captures des sites vérifiés
    └── Reglages/          Clé API, modèle, style
```

Convention : chaque composant vit dans son dossier ou à côté de son `.module.css` du même nom.
