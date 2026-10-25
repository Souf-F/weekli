# Changelog des décisions

Toute déviation par rapport aux docs, avec sa raison.

## 2026-10-24

- **Stack React et TypeScript conservée** malgré la règle « vanilla JS par défaut ». Raison : le projet existe et fonctionne, le réécrire serait du gaspillage. La règle « vanilla » est interprétée comme : HTML, CSS et JS dans des fichiers séparés, aucun style ni script inline.
- **Historique Git non réécrit** : les 14 premiers commits ne suivent pas Conventional Commits. La règle s'applique à partir de maintenant.
- **Format vidéo « histoire des commits » retiré du produit**, remplacé par une pub de projet sur le modèle de la vidéo Stepwize.
- **Hébergement Cloudflare Workers** conservé, le VPS n'est pas utilisé pour Weekli.
- **Pub vidéo en 16:9** comme la référence, 4:5 éventuellement plus tard.
- **Commits centralisés par l'orchestrateur** pendant le travail en parallèle : les agents partagent le même dossier de travail, des commits simultanés se télescoperaient. Chaque agent livre, l'orchestrateur vérifie puis commite par changement logique.

## 2026-10-24 (alignement des docs sur B8)

Le code de `packages/core/src/pub/` fait foi. Alignements décidés après le handoff `backend-pub.md` :

- **Palette** : les règles écrites de `design.md` 8.4 priment ; l'exemple de référence est recalculé avec `paletteDepuisMarque` (`sombre #08004f`, `clair #f4f7ff`, `accentSombre #5773ff` à 4,7:1, etc.). L'ajustement de luminosité s'arrête dès le seuil de contraste.
- **Durées** : les chevauchements de transition se soustraient de la durée totale. Tableau 8.13 corrigé (colonnes chevauchement et cumul net : 55,9 s pour 14 scènes et 4 étapes).
- **Exemple 8.15** : voix allongée à 146 mots, 52 s estimées, aucun avertissement de `nettoyerScriptPub` (vérifié).
- **Contrat 2.1** : ajout de l'accent par défaut et du paramètre `accentParDefaut`, des 8 à 14 scènes (rejet hors bornes), du rejet d'un lien de plus de 120 caractères, de l'accent ou de l'alerte invalide ignoré avec avertissement.
- **Scène `etape` sans capture** : le script de départ n'en produit jamais ; le moteur affiche alors seulement le titre (design 8.10 et contrat 2.1).
- **Risques connus consignés** : limite de 24 Ko (peu atteignable en texte latin), `prononciation` en schéma strict.

## 2026-10-25 (alignement des docs sur B11, F1 et l'effacement)

Le code commité fait foi (`apps/server/src/mcp/`, `routes/api.ts`, `lib/donnees.ts`, `packages/core`). Alignements décidés avec l'orchestrateur après les handoffs `backend-senior.md`, `backend-pub.md` et `frontend-voix.md` :

- **Effacement (contrat 3.1)** : si l'étape KV échoue, les sessions sont gardées (étape 5 non tentée, cookie non expiré) pour permettre de relancer, et la réponse est `500`. Les étapes 2 à 4 restent facultatives et journalisées.
- **`preparer_pub` (4.2)** : nouveaux champs `pubExistante`, `marqueConnue` et `capturesDisponibles`, repris de la pub la plus récente du même repo (`null`, `null`, `[]` sans pub précédente). Les questions sont les textes accentués de `QUESTIONS_PUB` (`guide.ts`), plus l'exemple dans `aide`. Raison : `guide.ts` fait foi et ces textes sont montrés à l'utilisateur.
- **`contenu_non_fiable`** : forme réelle documentée pour `activite_github`, `details_repo`, `details_commit`, `lister_repos` et `preparer_pub`. `lister_repos` range sa `description` dedans (écart avec `GET /api/repos`, qui reste à plat). Changement de forme de sortie assumé pour les outils existants.
- **`details_commit` (4.1)** : masquage limité aux formats de jetons connus (`ghp_`, `github_pat_`, `sk-ant-`, `AKIA`, `xox`, clés PEM...), sans motif générique. Raison : un motif générique donnerait des faux positifs sur du code.
- **`sauver_pub`** : la limite de 20 pubs renvoie vers le site pour supprimer (l'outil ne supprime rien). La validation passe avant la limite.
- **`PubResume.scenes`** compte les scènes visibles ; `PubEnregistree` et `PubResume` sont dans `@weekli/core`.
- **Nombre de scènes** : 8 à 14 (corrige `specs.md` US-P1, qui disait 10 à 14). Un projet sans capture produit une pub trop courte (9 scènes visibles, environ 46 s) : le studio demande au moins une capture avant le script de départ (ajouté aux specs).
- **Voix (ADR-07 et ADR-08)** : Kokoro `ff_siwis` en int8 et espeak-ng réduit, cache en **IndexedDB** (et non Cache Storage), isolation cross-origin (`COOP: same-origin` et `COEP: require-corp`) nécessaire pour la synthèse sur 4 fils (40 à 61 s contre 106 s sur un fil). Mesures de F1 consignées dans l'ADR ; Edge, Firefox et Safari non mesurés. Licence du dépôt passée en **GPL-3.0-only** (espeak-ng).
- **CSP** : `script-src 'self' 'wasm-unsafe-eval'` et `worker-src 'self'`.
- **Écart de handoff** : `frontend-voix.md` dit que COEP n'a pas été ajouté à `_headers` ; le fichier commité le contient (`Cross-Origin-Embedder-Policy: require-corp`). Les docs suivent le fichier.

## 2026-10-25 : voix off Microsoft Vivienne via edge-tts

- **Décision de Soufiane** : la voix de la pub est `fr-FR-VivienneMultilingualNeural` (échantillon .bench-voix/ecoute/05), obtenue par le service de lecture d'Edge (edge-tts), sans compte Azure.
- **Risques signalés par l'orchestrateur et acceptés** : usage non officiel d'un service Microsoft (conditions d'utilisation), coupure possible sans préavis (déjà arrivé en 2024), blocage possible de l'adresse du Worker, textes des pubs envoyés à Microsoft sans contrat (à mentionner dans la page Confidentialité).
- **Parade** : Kokoro `ff_siwis` (F1, déjà livré) reste en secours automatique. Si edge-tts échoue, la pub est rendue avec Kokoro et l'utilisateur en est informé. L'alternative officielle (Azure Speech, même voix, offre gratuite) reste possible plus tard sans changer le front.
