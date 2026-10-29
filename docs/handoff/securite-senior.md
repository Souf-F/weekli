# Handoff securite-senior : audit final sécurité et RGPD

Date : 2026-10-29. Commit audité : `c09e359` (branche `feat/weekli-v1`, PR #6). Aucun code modifié, rien commité.

## Livré

- Rapport : `docs/reviews/securite-final-2026-10-29.pdf` (14 pages), source `docs/reviews/securite-final-2026-10-29.md`, rendu `docs/reviews/securite-final-2026-10-29.html`.
- Aucun secret réel exposé. `apps/server/.dev.vars` : ni suivi, ni dans l'historique, ni poussé, exclu de Docker ; contenu non lu.

## Verdict : A CORRIGER (0 BLOQUANT, 1 MAJEUR, 11 MINEUR nouveaux)

### MAJEUR

| # | Constat | Agent |
|---|---|---|
| N1 | `packages/core/src/masquage.ts:9` : motif `sk-` avec anticipation, coût quadratique (99 Ko : 8,5 s de CPU mesurés) ; masquage appliqué avant troncature sur des textes non plafonnés (`posts/tuto.ts:140` et `:152`, README sans plafond ; `github.ts:154`, patchs). Tout compte GitHub peut le déclencher via `POST /api/posts/donnees` (tuto) ou `preparer_post`. Correction : motif sans anticipation (chiffre vérifié dans le remplacement), tronquer avant de masquer avec une marge, test de performance | backend-senior |

### MINEUR (détail dans le rapport)

N2 page Confidentialité : journaux (erreurs Octokit complètes, `api.ts:54` et 3 autres), cookies OAuth `__Host-oauth-*` non listés, quota vocal 2 h ; N3 Microsoft présenté comme sous-traitant DPF sans contrat (usage non officiel, avis juriste) ; N4 cache vocal partagé : oracle, réponses du cache hors quota, volume d'écritures KV ; N5 effacement local partiel (IndexedDB studio et voix, dernier repo) et texte de `PanneauDonnees.tsx:58` inexact ; N6 README non masqué dans `detailsRepo`, formats Stripe, Google, npm, GitLab, SendGrid, JWT absents ; N7 sortie de la balise `<donnees_post>` en mode clé (`prompts.ts:130`) ; N8 téléphone de l'hébergeur absent des mentions légales ; N9 `detailsCommit` sans contrôle de visibilité ; N10 pas de `limits.cpu_ms` ; N11 repli SPA en 200 sur `/.env` et autres (aucun contenu sensible).

## Suivi de l'audit initial

- MAJEUR M1 à M6 : tous corrigés. Résidu de M3 : migration par login (`lib/identite.ts`, `dechiffrerAncien`) à retirer avant déploiement (B14).
- MINEUR : 13 corrigés (m1, m2, m4 à m11, m14, m15, m17) ; partiels : m3 (images tierces encore affichables), m12 (branche non protégée, Dependabot alerts et signalement privé désactivés) ; ouverts : m13 (email personnel dans les commits), m16 (`PUBLIC_URL` et id KV avant déploiement).

## Vérifié dynamiquement (serveur local, sans session)

En-têtes front et Worker, CSP, COOP et COEP (`crossOriginIsolated` vrai), 401 sur 14 routes et `/mcp`, CSRF par Origin (403 sans Origin, Origin tierce, `null`, autre hôte), débit auth (429 après 20/min), métadonnées OAuth et MCP (S256 seul), routes OAuth invalides, fichiers exposés, navigateur headless à profil vierge : aucune requête tierce, aucun cookie, stockage vide, console propre. Mode démo absent du build (recompilé avec `VITE_DEMO=1`).

## Non vérifié (et pourquoi)

Tests authentifiés (IDOR à deux comptes, effacement et export réels, N1 dans Workers, quotas vocaux) : consigne sans session. Expiration des tokens de l'app GitHub, offre et quotas Cloudflare, journaux Workers réels, réseau de Browser Run, nmap, sauvegardes : rien n'est déployé ou hors accès.

## Outils

git 2.50.1, gitleaks 8.30.1, trufflehog 3.99.4, semgrep 1.182.0, osv-scanner 2.7.0, npm 11.16.0 (Node 26.3.0), gh 2.98.0, curl, Chrome headless (CDP), vitest (server 236, core 267 verts). Aucun outil manquant.

## Points à remonter à l'orchestrateur

1. N1 à corriger avant livraison (seul MAJEUR) ; N2, N3 et N5 touchent la conformité de l'information, à traiter avant ouverture publique.
2. Avant tout déploiement : B14, m16, réglages GitHub de m12, vérification des quotas KV (N4) et de l'offre Workers (N10).
