# Politique de sécurité

## Signaler une faille

Merci de **ne pas ouvrir d'issue publique**. Utilise l'onglet *Security* du dépôt, bouton *Report a vulnerability* (signalement privé GitHub). Réponse sous 72 heures.

## Ce que fait Weekli pour te protéger

- Accès GitHub en lecture seule (`read:user`), repos publics uniquement.
- OAuth 2.1 avec PKCE, côté Claude comme côté GitHub ; consentement par client, lié au navigateur.
- Tokens GitHub chiffrés (AES-256-GCM) dans le stockage du serveur, jamais exposés au navigateur ni à Claude.
- Clé API Anthropic gardée dans ton navigateur, jamais envoyée au serveur Weekli.
- CSP stricte, en-têtes de sécurité, limitation de débit, vérification d'origine sur les requêtes d'écriture.
- Aucune publication automatique.

## Ce que fait le dépôt

- Vérification anti-secrets à chaque commit (hook local) et en CI (`scripts/verifier-secrets.mjs`).
- `npm audit` bloquant en CI, Dependabot hebdomadaire.

Détails et modèle de menace : [docs/securite.md](docs/securite.md).
