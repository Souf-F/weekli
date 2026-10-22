# Feuille de route

```mermaid
flowchart LR
    V1[V0.1<br/>Outils GitHub<br/>+ prompt] --> V15[V0.2<br/>Site outil<br/>clé API]
    V15 --> V2[V0.3<br/>Captures de sites<br/>domaines vérifiés]
    V2 --> V3[V0.4<br/>Storyboards<br/>vidéo]
    V3 --> V4[V0.5<br/>Rendu motion design<br/>MP4]
    V4 --> V5[V1.0<br/>Tableau de bord<br/>historique]

    style V15 fill:#6f4e37,color:#e5e4e2
```

## V0.1 : outils GitHub

- [x] Serveur MCP sur Cloudflare avec OAuth GitHub
- [x] `activite_github`, `details_repo`, `details_commit`
- [x] Prompt `posts_semaine`
- [x] Site vitrine
- [x] Tests unitaires du filtrage

## V0.2 : le site devient un outil *(en cours)*

- [x] Monorepo `core` / `server` / `web`
- [x] Front React : accueil et tableau de bord
- [x] Connexion GitHub du site, API JSON
- [x] Génération en streaming avec la clé API de l'utilisateur
- [x] Docker Compose, CI, CSP
- [ ] Test du flux OAuth réel et déploiement public

## V0.3 : captures de sites

- [ ] Vérification de propriété de domaine (DNS TXT ou fichier `.well-known`)
- [ ] `capturer_site` via Cloudflare Browser Rendering
- [ ] Floutage automatique des données sensibles

## V0.4 : storyboards vidéo

- [ ] Outil `creer_storyboard` : scènes, durées, textes, captures
- [ ] Bibliothèque de scènes : terminal, problème/solution, avant/après, architecture, liste

## V0.5 : rendu motion design

- [ ] Scènes en HTML + GSAP
- [ ] Rendu MP4 1080×1350 (format LinkedIn 4:5)
- [ ] Sous-titres incrustés

## V1.0 : tableau de bord

- [x] Historique des brouillons et des posts publiés
- [ ] Style d'écriture mémorisé par utilisateur
