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

## 2026-10-25 : discipline de production de la pub (méthode d'un skill externe)

- **Décision de Soufiane** : garder l'énergie et la structure narrative Stepwize ainsi que la voix Vivienne, et adopter pour la discipline la méthode d'un skill de motion design externe, lu comme matériau (rien n'est exécuté, aucun nom propre repris). Détail dans `design.md` 8.16.
- **Gestes** : champ facultatif `gestes` (2 à 3 identifiants parmi 10) sur `ScriptPub`. Le moteur n'applique que ces gestes, le reste prend sa version neutre. Absent : comportement actuel, donc aucun script existant ne change. Écart : le skill parle de « grammaire de deux ou trois gestes » sans liste fermée ; la liste fermée de dix est un choix de Weekli pour pouvoir la valider.
- **But de scène** : champ facultatif `but` (`lire`, `comprendre`, `montrer`) sur chaque scène, avec un but par défaut par type. Il règle la pause de lecture (1,2 s, 0,8 s, 0,5 s). L'effet sur la durée est à implémenter dans le moteur (F10) ; `timeline.ts` n'est pas modifié ici, les durées estimées restent celles de la voix.
- **Image zéro et miniature PNG** livrées avec le MP4 ; **honnêteté** (jamais une animation présentée comme démonstration réelle, réel et illustratif distingués) ; **contrôles finaux** (images aux raccords, crête vraie sous -1,5 dBTP, pas de noirs involontaires). Ces trois points sont des règles de moteur et de guide, sans champ de script.
- **Post du projet** : la trame décrite dans `tasks.md` (point 7) est écrite dans `REGLES_POST_PROJET` (`packages/core/src/pub/guide.ts`), distincte de `REGLES_PUB`, pour l'outil `proposer_post_projet` (B16).
- **Avertissement, pas rejet** : tous les cas `gestes` et `but` invalides donnent un avertissement et un repli, jamais un rejet, pour ne pas bloquer un script produit par Claude.

## 2026-10-25 : trames narratives, la référence n'est plus un modèle

- **Correction de Soufiane** : la vidéo Stepwize est un exemple du style dynamique qu'il aime, pas une narration à recopier. Toutes les pubs auraient suivi la même trame (repère « Lundi », répétition, boucle, « Et si », révélation) et se ressembleraient. La vidéo reste une référence de niveau et d'énergie seulement ; les mentions de modèle à suivre sont retirées de `design.md` (le modèle de pub devient « référence de niveau »).
- **Trois trames** (`design.md` 8.13) : `probleme-qui-revient` (l'ancienne), `demonstration-directe` (révélation avant 6 s puis l'usage) et `vision-manifeste` (une conviction, puis la preuve par l'usage). Le repère de temps devient une accroche parmi d'autres (question, chiffre réel, citation, contraste Avant/Après).
- **Champ `trame`** facultatif sur `ScriptPub` (types, schéma, `nettoyerScriptPub` : valeur inconnue ignorée avec avertissement). Aucun script existant ne change ; le moteur et les types de scènes sont inchangés.
- **Guide** : section TRAMES NARRATIVES dans `CATALOGUE_PUB`, règle « varier, ne jamais copier une référence » dans `REGLES_PUB`.
- **`scriptPubDepuisReponses`** choisit la trame (`choisirTrame`, heuristique documentée en 8.13) et écrit `trame` dans le script. Écart assumé : la démonstration exige 4 captures, sinon elle ne tient pas 50 s.
- **`calculerTimeline`** : la voix d'une scène, décalée de 0,15 s (`DECALAGE_VOIX`), doit finir avant le début du chevauchement de la suivante ; sinon la scène est allongée (au-delà de son maximum de type si besoin). Effet : les durées estimées montent d'environ 0,3 s par scène avec une transition longue.
- **Restent à aligner** (hors zone de cette mission) : `specs.md` (US-P4), `architecture.md` (ADR du moteur) et `brief.md` parlent encore de « niveau Stepwize » ; c'est cohérent avec « référence de niveau » mais `brief.md` ligne 42 dit « ce style » : à reformuler par l'orchestrateur.

## 2026-10-25 : captures rares, scènes d'explication, anti-répétition et variété

Retours de Soufiane sur la première vraie pub (`apps/web/dev/pub-weekli.json`) : il adore le design, la musique et le rendu, mais elle répétait « c'est gratuit » (gratuité dite dans la preuve, le badge, la voix de l'appel et la fin), il craint que les pubs d'autres projets se ressemblent, et il veut plus de motion design et moins de captures, que les gens n'ont pas le temps de lire.

- **Anti-répétition** : chaque argument n'est dit qu'une fois dans la pub, voix et visuels confondus. `REGLES_PUB` l'énonce ; `nettoyerScriptPub` avertit (nouveau module `repetition.ts`) quand un des 7 arguments connus est dans 2 scènes ou qu'un même mot significatif revient dans 3 scènes ou plus (scènes de tension exclues, reprises du slogan par la fin ignorées). Avertissement, jamais rejet, comme pour les gestes. Détail en `design.md` 8.18.
- **Captures rares et brèves** : une capture devient un but `montrer` de 2,5 s au plus, 2 par pub au plus, facultative, voix de 5 mots. `dureeScene` borne les étapes-capture (1,8 à 2,5 s). Troisième capture : liste vide avec avertissement. Écart assumé : une capture de 2,5 s ne laisse que 5 mots de voix ; plus long, la scène s'allongerait.
- **Trois scènes d'explication sans capture** : `transformation` (une donnée devient un résultat), `flux` (trois nœuds à icône reliés) et `avantapres` (un panneau qui se réécrit). Types, schéma, `nettoyerScriptPub`, durées, transitions, `BUT_DEFAUT`, `CATALOGUE_PUB` (rubriques 8 à 10, le catalogue passe à 14 scènes décrites) et 28 icônes fermées (`ICONES`). Spécification de dessin pour l'agent frontend en `design.md` 8.17. Elles ne sont pas des étapes : pas de numérotation « ÉTAPE 0n ».
- **Variété** : règle écrite dans `REGLES_PUB` et en 8.18 (varier trame, accroche, scènes d'explication et gestes selon le projet). `scriptPubDepuisReponses` reçoit une graine déterministe dérivée du nom du repo (`graineDepuisRepo`, ou `graine` explicite) qui varie le jeu de gestes, l'accroche, l'ordre des explications et les icônes. Écart : le script de départ écrit désormais `gestes` (avant : aucun, donc comportements par défaut du catalogue).
- **Script de départ** : parcours de 3 scènes d'explication plus au plus une capture brève ; le chorus facultatif n'est plus écrit (trop de voix) ; la scène `resultat` ne redit plus la promesse (déjà dite par la révélation) ; la démonstration demande au moins une capture, non plus quatre. Textes génériques réécrits pour ne dire la simplicité qu'une fois. Un nom de plus de 5 mots n'est lu en entier que dans la révélation.
- **Pub de Weekli** : réécrite pour passer sans avertissement (51 s, une seule capture « Connexion », trois explications, gratuité dite une fois dans la preuve, badge de l'appel retiré, `fin` sans argument). Les voix MP3 de la première version ne correspondent plus : à resynthétiser pour les scènes modifiées et nouvelles. Test : `pub-weekli.test.ts`.
- **Reste à faire (hors zone de cette mission)** : dessin des trois scènes dans le moteur (`registreScenes`) par un agent frontend en opus, d'après `design.md` 8.17 ; `specs.md` (US-P4) et `tasks.md` à aligner.

