# Handoff securite-senior : audit initial sécurité et RGPD

Date : 2026-10-24. Commit audité : `d40f24a` (branche `docs/brief-v1`, livraisons RGPD backend et frontend incluses).

**Aucun secret réel trouvé** : code, historique Git complet (gitleaks, trufflehog, recherche de motifs) et dépôt GitHub `Souf-F/weekli` (secret scanning : 0 alerte) sont propres.

## Livré

- Rapport : `docs/reviews/securite-2026-10-24.pdf` (14 pages), source `docs/reviews/securite-2026-10-24.md`, rendu `docs/reviews/securite-2026-10-24.html`.
- Aucun fichier de code modifié, rien commité.

## Verdict : A CORRIGER (0 BLOQUANT, 6 MAJEUR, 17 MINEUR)

### MAJEUR

| # | Constat | Agent |
|---|---|---|
| M1 | `DELETE /api/moi/donnees` n'efface ni les grants MCP (token GitHub, nom, email, refresh 30 jours), ni les Durable Objects, ni les autres sessions, et ne révoque pas le token GitHub ; la page Confidentialité affirme le contraire | backend-senior, frontend-senior (texte) |
| M2 | Props MCP (dont token GitHub et email) stockées en clair et sans durée dans le stockage Durable Object par `agents` (`McpAgent.updateProps`) | backend-senior |
| M3 | Brouillons, domaines vérifiés, jeton HMAC et limitation de débit indexés par le login GitHub (renommable, réattribuable) au lieu de l'id numérique | backend-senior |
| M4 | Google Fonts chargées sans consentement (IP transmise à Google) : héberger les polices | frontend-senior |
| M5 | Page Confidentialité incomplète : bases légales, sous-traitants (GitHub, Anthropic, Browser Run, journaux), transferts hors UE, email non listé, export absent ; deux inexactitudes (style dit chiffré dans KV, TTL dit renouvelé à chaque utilisation) | architecte, frontend-senior, backend-senior (export) |
| M6 | zod 4.5.4 (GHSA-mrhx-c7xc-m3w5, haute) dans le runtime du Worker ; `npm audit` : 13 vulnérabilités, la CI échouera | backend-senior |

### MINEUR (détail dans le rapport)

m1 email inutile dans les props, m2 token GitHub non révoqué à la déconnexion (et expiration réelle à vérifier), m3 captures : iframes tierces et navigation tardive non contrôlées, m4 floutage partiel, m5 domaines jamais revérifiés, m6 `login` figé à l'init du Durable Object, m7 injection de prompt (contenus de repo bruts, skill vidéo), m8 arguments du pipeline vidéo non validés, m9 `String.fromCharCode(...)` plante au-delà d'environ 125 Ko (historique de brouillons bloqué), m10 clé API lisible en JS (accepté), m11 HSTS et COOP absents du front, m12 dépôt GitHub (branche non protégée, Dependabot alerts et signalement privé désactivés, hook anti-secrets non installé, `.dockerignore` sans `.env*`), m13 email personnel dans les commits publics, m14 gestion de la clé racine, m15 mineurs, m16 `PUBLIC_URL` et id KV à finaliser avant déploiement, m17 dépendances de dev vulnérables.

## Non vérifié (et pourquoi)

- Tous les tests dynamiques (IDOR avec un second compte, CSRF forgé, débit, en-têtes réels, inspection navigateur, fichiers exposés) : aucun serveur lancé, secrets OAuth absents.
- nmap : aucun hôte déployé.
- Accès réseau interne du navigateur Browser Run : infrastructure Cloudflare.
- Expiration réelle des tokens de l'app OAuth GitHub : réglage sur le compte du propriétaire.
- Exploitabilité de la faille zod dans Workers : test de charge non autorisé.

## Outils

git 2.50.1, gitleaks 8.30.1, trufflehog 3.99.4, semgrep 1.182.0, osv-scanner 2.7.0, npm 11.16.0 (Node 26.3.0), gh 2.98.0, Chrome headless. Aucun outil manquant.

## Points à remonter à l'orchestrateur

1. `docs/api-contract.md` n'existe pas (attendu par les règles de l'équipe).
2. La branche a bougé pendant l'audit (4 commits backend et frontend) : le rapport porte sur `d40f24a`.
3. Le skill `.claude/skills/video-projet` annonce encore le format « histoire », retiré par le brief.
