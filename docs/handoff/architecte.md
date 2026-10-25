# Handoff architecte : alignement des docs sur B11, F1 et l'effacement

Date : 2026-10-25. Docs seulement, aucun code touché, rien commité. Le code commité fait foi.

## docs/api-contract.md

- **1.2** : règle `contenu_non_fiable` détaillée (texte libre du repo dans un objet, champs sûrs à la racine, API du site à plat).
- **2** : `PubResume.scenes` = scènes visibles ; types définis dans `@weekli/core`.
- **3.1** : étape 5 non tentée après un échec KV, sessions et cookie gardés, `500` pour relancer.
- **4.1** : formes réelles de `activite_github`, `details_repo`, `details_commit` ; paragraphe sur le masquage des secrets (formats connus, sans motif générique, marqueur `[secret masque]`).
- **4.2** : `lister_repos` (description sous `contenu_non_fiable`, exemple), `preparer_pub` (`pubExistante`, `marqueConnue`, `capturesDisponibles`, questions accentuées, revérification des domaines, message de repo introuvable), `sauver_pub` (message de la limite de 20 renvoyant vers le site, validation avant limite, forme du `lien`), `lister_pubs`.

## docs/architecture.md

- Arborescence : `lib/pub/audio/voix/` remplace `voix.ts` et `voix.worker.ts`.
- Section 9 : CSP `'wasm-unsafe-eval'` et `worker-src 'self'` en place, nouvelle ligne isolation cross-origin (COOP et COEP), ligne masquage des secrets.
- ADR-07 : licence GPL-3.0-only actée (H2 résolue), mise en œuvre retenue, mesures de F1 (106 s sur 1 fil, 40 à 61 s sur 4 fils), isolation nécessaire, navigateurs non mesurés.
- ADR-08 : révision et fichiers épinglés, cache IndexedDB (pas Cache Storage), tailles réelles, effet sur la CSP.

## docs/specs.md

- US-P1 : 8 à 14 scènes ; nouveau critère : le studio demande au moins une capture avant le script de départ.

## docs/changelog.md

Entrée du 2026-10-25.

## Points à signaler

1. `frontend-voix.md` affirme que COEP n'est pas dans `_headers`, mais le fichier commité contient `Cross-Origin-Embedder-Policy: require-corp`. Docs alignées sur le fichier. Les avatars GitHub doivent donc être chargés avec `crossorigin="anonymous"` : à vérifier dans les pages qui les affichent.
2. Le masquage des secrets (`packages/core/src/masquage.ts`, `github.ts`) apparaissait encore comme modifié, non commité, dans le dépôt au moment de la rédaction ; la doc le décrit comme en place.
3. `docs/tasks.md` n'est pas dans ma zone : les lignes « Points remontés » traitées ici (effacement, `PubResume`, « 6 outils » à passer à 13, H1/H2, B11) sont à cocher par l'orchestrateur. H2 est tranchée (GPL-3.0-only).
4. Reste à décider par Soufiane : `GPL-3.0-only` ou `or-later`, écoute finale de la voix (H1), mesures Edge, Firefox et Safari.
