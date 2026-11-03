# Handoff backend-senior : corrections de l'audit securite final

Tests : packages/core 279 verts, apps/server 238 verts, `tsc --noEmit` vert dans les deux. `wrangler deploy --dry-run` valide. Rien n'est commite.

- N1 : `masquage.ts` sans anticipation (chiffre de `sk-` verifie dans la fonction de remplacement), `masquerEtTronquer(texte, plafond)` tronque avant de masquer (marge de 256) dans tuto (fichiers, README), github (patchs, README). Tests : 200 Ko hostiles en moins de 50 ms, tuto hostile borne.
- N6 : README masque dans `detailsRepo`. Ajout de sk_live_, rk_live_, AIza, npm_, glpat-, SG. Les JWT ne sont pas ajoutes (motif non borne, risque quadratique).
- N7 : `<` echappe en notation JSON dans `messagePost`.
- N9 : `detailsCommit` refuse un repo prive.
- N4 : le quota vocal compte aussi les reponses du cache (avant la lecture du cache) ; TTL du cache ramene a 30 jours. Les ecritures KV par appel augmentent d'un compteur : surveiller les quotas KV avant deploiement.
- N10 : `limits.cpu_ms` a 5000 dans wrangler.jsonc.
- N11 : `"/.*"` dans `run_worker_first` (remplace `/.well-known/*`, redondant) : le Worker repond 404 aux chemins en point.
- m3 (images et fonds CSS externes lors des captures, `Fetch.enable`) : non traite, necessite des evenements CDP non testables ici. m12 : hors code.

Dependances ajoutees : aucune. Code mort supprime : ancienne troncature apres masquage.
