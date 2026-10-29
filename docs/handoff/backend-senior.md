# Handoff backend : B16 (post du projet)

Date : 2026-10-29. Rien n'est commité par cette session.

## Livraison

- Outil MCP `proposer_post_projet` et prompt `post_projet` (`apps/server/src/mcp/outils-pub.ts`), même principe que `preparer_pub`.
- `donneesPostProjet`, `CONSIGNE_POST_PROJET` et `EntreePostProjet` dans `packages/core/src/pub/post-projet.ts` (fonction pure, exportée par `@weekli/core`, utilisable par F14 en mode clé API). Elle prend `{ infos, domaines, pub, style }`.
- Docs : `docs/outils.md` et `docs/api-contract.md` section 4.2.

## Tests

- `packages/core` : tsc OK, 245 tests verts.
- `apps/server` : tsc OK, 212 verts, 1 rouge déjà présent avant ce travail (vérifié par stash) : `contenu_non_fiable sur les outils GitHub > activite_github...` (`activite_github` ne renvoie plus `repos[0]`, probablement lié à la date fixe 2026-10-20 du jeu de test).
- Tests ajoutés : entrée invalide et repo d'un autre compte (`bob/tablee`, sans appel GitHub), contenu non fiable, présence des règles et de la consigne, pub existante et style, repo absent ou privé, prompt.

## Choix et limites

- Aucune dépendance ajoutée. Langages et étoiles volontairement non renvoyés (valeur technique).
- Le README n'est pas tronqué par cet outil (même comportement que `preparer_pub`).
