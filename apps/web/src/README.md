# apps/web/src

```
src/
├── main.tsx               Montage React
├── App.tsx                Routes, chargement différé de l'app
├── styles/
│   ├── tokens.css         Palette, échelle typographique, espacements, mouvement : seule source de valeurs
│   ├── fonts.css          Polices hébergées localement (aucune requête tierce)
│   └── global.css         Base et animation d'apparition (.revele)
├── lib/                   Logique sans interface
│   ├── api.ts             Client de l'API Weekli
│   ├── generation.ts      Appel streaming à l'API Anthropic depuis le navigateur
│   ├── generation-type.ts Génération d'un post selon son type
│   ├── post-projet.ts     Post du projet : versions proposées depuis la pub
│   ├── parcours.ts        Parcours du tableau en 4 étapes (lien profond repo et type)
│   ├── reglages.ts        Clé API et préférences dans le stockage du navigateur, effacement local
│   ├── style.ts           Style d'écriture lu et écrit via l'API
│   ├── mesh.ts            Rendu WebGL du dégradé de fond
│   ├── pub/               Moteur de pub : scènes, visuel, cartes de captures, audio, export (1920 × 1080)
│   ├── studio/            Édition du script, script de départ, miniature, contrôles d'export
│   ├── voix/              Voix Kokoro dans le navigateur : Worker, phonèmes (espeak-ng), cache IndexedDB
│   └── demo/              Données de démonstration (?demo, développement uniquement)
├── hooks/
│   ├── useMoi.ts          Session GitHub de l'utilisateur
│   ├── useMoteurPub.ts, useVoixPub.ts, useImagesPub.ts   Moteur, voix et images du studio
│   ├── useSauvegarde.ts   Sauvegarde différée du script
│   └── useReveal.ts       Apparitions au scroll
├── components/            Briques réutilisables (Bouton, Logo, MeshBackground)
├── layouts/
│   └── AppLayout.tsx      Barre de l'app et garde de connexion
└── pages/
    ├── Accueil/           Page d'accueil, une section par fichier dans sections/
    ├── Tableau/           Tableau de bord : fil d'étapes, repo, type, réglages du type, rédaction
    ├── Historique/        Brouillons enregistrés, filtres et actions
    ├── Studio/            Mes pubs, assistant, éditeur, aperçu, export, post du projet
    ├── Captures/          Captures des sites vérifiés
    ├── Reglages/          Clé API, modèle, style, domaines, export et effacement des données
    └── Legal/             Confidentialité et mentions légales
```

Convention : chaque composant vit dans son dossier ou à côté de son `.module.css` du même nom.
