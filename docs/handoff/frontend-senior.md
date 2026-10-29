# Handoff frontend-senior : corrections d'audit N2, N3, N5, N8

## Fait
- N2 (Confidentialite.tsx) : journaux reformules (message technique pouvant contenir l'adresse d'une requete GitHub ou d'une page capturee, jamais token, cle API ni texte des posts) ; cookies listes (session, `weekli_etat` 10 min, `__Host-oauth-consent` et `__Host-oauth-upstream` 10 min, `__Host-oauth-approvals` 30 jours) ; quota vocal `voix-quota` 2 h ajoute au tableau.
- N3 : Microsoft presente comme service tiers sans contrat, usage non officiel (decision du changelog 2026-10-25), titre de section renomme. Kokoro decrit comme repli automatique ; l'UI ne permet pas de le choisir directement, le texte propose donc « Ma voix » ou « Sans voix » pour ne rien envoyer.
- N5 : `effacerDonneesLocales()` (lib/reglages.ts) vide localStorage et sessionStorage (cle, prefs, dernier repo) et supprime les bases IndexedDB `weekli-pub` et `weekli-voix`. Le panneau saute l'appel serveur au second essai si le serveur est deja efface, et signale un echec local. Texte du panneau aligne (session 8 h, Claude 30 jours, pubs, liste exacte des effacements). Page Confidentialite alignee.
- N8 : telephone Cloudflare +1 888 993 5273 (numero public a verifier par Soufiane avant publication).
- Test : lib/reglages.test.ts.

## Verifie dans le code
Session 8 h, etat 10 min, 90 jours, quotas, TEXTE_MAX 400, cookies de la bibliotheque (720 h, 600 s), bases IndexedDB.

## Limites
- m13 et m16 (email des commits, PUBLIC_URL et id KV) ne relevent pas du front, non traites. Pas de verification navigateur.
