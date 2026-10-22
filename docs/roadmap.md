# Feuille de route

```mermaid
flowchart LR
    V1[V0.1<br/>Outils GitHub<br/>+ prompt] --> V2[V0.2<br/>Captures de sites<br/>domaines vérifiés]
    V2 --> V3[V0.3<br/>Storyboards<br/>vidéo]
    V3 --> V4[V0.4<br/>Rendu motion design<br/>MP4]
    V4 --> V5[V1.0<br/>Tableau de bord<br/>historique]

    style V1 fill:#ff5a1f,color:#fff
```

## V0.1 : outils GitHub *(en cours)*

- [x] Serveur MCP sur Cloudflare avec OAuth GitHub
- [x] `activite_github`, `details_repo`, `details_commit`
- [x] Prompt `posts_semaine`
- [x] Site vitrine
- [ ] Tests unitaires du filtrage
- [ ] Déploiement public

## V0.2 : captures de sites

- [ ] Vérification de propriété de domaine (DNS TXT ou fichier `.well-known`)
- [ ] `capturer_site` via Cloudflare Browser Rendering
- [ ] Floutage automatique des données sensibles

## V0.3 : storyboards vidéo

- [ ] Outil `creer_storyboard` : scènes, durées, textes, captures
- [ ] Bibliothèque de scènes : terminal, problème/solution, avant/après, architecture, liste

## V0.4 : rendu motion design

- [ ] Scènes en HTML + GSAP
- [ ] Rendu MP4 1080×1350 (format LinkedIn 4:5)
- [ ] Sous-titres incrustés

## V1.0 : tableau de bord

- [ ] Historique des brouillons et des posts publiés
- [ ] Style d'écriture mémorisé par utilisateur
