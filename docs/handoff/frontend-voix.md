# Handoff F1 : voix française dans le navigateur (Kokoro `ff_siwis`)

Date : 2026-10-25. Rien n'est commité.

## Verdict

**Faisable, sous condition d'isolation cross-origin.** Le texte du banc (53 mots) est synthétisé dans Chrome desktop en **40 à 54 s** avec onnxruntime-web en WASM sur 4 fils (critère < 60 s tenu sur 3 mesures sur 4, la quatrième à 61 s), mais en **106 s** sur un seul fil. Le multithread exige que la page soit `crossOriginIsolated`, donc un en-tête `Cross-Origin-Embedder-Policy` en plus du `Cross-Origin-Opener-Policy: same-origin` déjà présent. **Je ne l'ai pas ajouté à `_headers`** (consigne : CSP strictement), c'est la décision à prendre (voir « Décision attendue »). Sans lui, le critère des 60 s n'est pas tenu.

Le rendu est fidèle à l'écoute de référence 09 : même modèle int8, même pipeline de phonèmes que kokoro-onnx, et une mesure objective le confirme (corrélation du spectre moyen 0,999 avec 09, contre 0,993 avec Piper siwis et 0,957 avec edge-tts Vivienne). **L'écoute finale reste à faire par Soufiane** : `npx vite --config src/lib/voix/essai/vite.essai.config.ts` depuis `apps/web`, puis http://127.0.0.1:5173/src/lib/voix/essai/index.html, « Charger », « Synthétiser », écouter ou télécharger le WAV.

Le repli (Piper, puis voix importée seule) n'est pas nécessaire si l'isolation est acceptée.

## Mesures

Machine : MacBook Apple M1 (4 cœurs performance + 4 efficacité, 8 Go), Chrome 155, serveur Vite local. **La machine était très chargée pendant les mesures** (load average entre 26 et 70 à cause des autres agents) : les temps sont pessimistes et dispersés. Audio produit : 16,1 s (16,7 s pour la référence 09, qui lisait encore « (en) » devant les mots anglais).

| Configuration | Chargement (modèle en cache IndexedDB) | Synthèse du texte du banc | Facteur temps réel |
|---|---|---|---|
| WASM, 1 fil (page non isolée, cas actuel de la production) | 18,2 s (session ONNX 14,0 s) | **106,1 s** | 6,6 |
| WASM, 4 fils (COOP + COEP) | 2,5 à 20,6 s (session 1,5 à 19,5 s selon la charge) | **39,9 s, 45,4 s, 53,7 s, 61,3 s** | 2,5 à 3,8 |
| WASM, 8 fils | 8,4 s | 84,9 s | 5,2 (les cœurs d'efficacité freinent : plafond fixé à 4 fils) |
| WebGPU, modèle int8 | 37,0 s (session 36,5 s) | abandonné après plus de 160 s | > 10 |

Détail d'un chargement à froid (réseau local, cache vide) : 2,48 s au total, dont téléchargement et vérification SHA-256 des 94 Mo en 0,91 s, espeak-ng 0,06 s, session ONNX 1,50 s. En production il faut ajouter le temps de téléchargement réel de 94 Mo (environ 8 s à 100 Mbit/s), une seule fois grâce au cache IndexedDB (relecture en 0,2 à 0,7 s). Phonémisation : 0,01 à 0,4 s.

Comparaison spectrale (spectre moyen log sur 40 bandes, trames voisées, calculée dans le navigateur sur les fichiers de `.bench-voix/ecoute/`) :

| Fichier | Corrélation avec notre sortie | Corrélation avec 09 |
|---|---|---|
| 09 Kokoro int8 | 0,999 | 1,000 |
| 07 Kokoro fp32, prononciation corrigée | 0,998 | 0,998 |
| 10 Piper siwis | 0,993 | 0,991 |
| 12 Piper upmc | 0,961 | 0,960 |
| 04 edge-tts Vivienne | 0,957 | 0,963 |

**Non mesuré** : Edge (non installé sur la machine), Firefox et Safari (installés, mais je ne peux piloter que Chrome ; l'extension et l'accès écran limitent les autres navigateurs à la lecture). Procédure pour Soufiane : lancer la page d'essai comme ci-dessus et l'ouvrir dans chaque navigateur ; la page affiche les temps. Attendus : Firefox gère COEP et le multithread WASM ; Safari gère COOP + COEP `require-corp` mais pas `credentialless`.

## Choix du modèle (pour B12)

Dépôt Hugging Face `onnx-community/Kokoro-82M-v1.0-ONNX`, révision épinglée `1939ad2a8e416c0acfeecc08a694d14ef25f2231`.

| Fichier du dépôt | Taille | SHA-256 |
|---|---|---|
| `onnx/model_quantized.onnx` (int8 dynamique, équivalent du fichier de l'écoute 09) | 92 361 116 octets | `fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478` |
| `voices/ff_siwis.bin` (510 x 256 float32, seule la voix française) | 522 240 octets | `a35f5675ad08948e326ae75fd0ea16ba5d0042e4f76b5f3d1df77d0a48c54861` |

Pourquoi : c'est la quantification de l'écoute validée (09), la plus rapide en WASM (10,3 s contre 17,5 s en fp32 au banc natif), et le dépôt fournit la voix seule (0,5 Mo) au lieu du fichier de 28 Mo de toutes les voix. Les variantes fp16 et q4 n'ont pas été téléchargées (disque). Le WebGPU ne vaut la peine qu'avec un modèle fp16 ou fp32 (163 ou 326 Mo) et un binaire WASM de 26,8 Mo qui dépasse la limite de 25 Mio des assets : écarté pour la V1.

Données espeak-ng : au lieu des 24 Mo du paquet complet, seulement les fichiers communs, le dictionnaire français et le dictionnaire anglais (967 Ko). Un test vérifie que ce sous-ensemble donne exactement les mêmes phonèmes que le paquet complet.

Total servi par Weekli : 93,9 Mo de fichiers vocaux + 14,2 Mo de WASM onnxruntime (3,7 Mo en gzip) + 0,86 Mo de Worker JS.

### Ce que B12 doit faire

`apps/web/src/lib/voix/outils/preparer-modeles.mjs <dossier>` fait déjà, à partir des deux fichiers téléchargés : vérification des SHA-256 épinglés, découpe en morceaux de 20 Mio, extraction d'espeak-ng depuis `node_modules`, écriture de `public/modeles/kokoro/manifeste.json`. Il exporte `REVISION` et `SOURCES` (chemins dans le dépôt et empreintes). B12 n'a plus qu'à écrire `scripts/modeles-voix.mjs` : téléchargement des deux fichiers à la révision épinglée, appel de ce script (ou déplacement de sa logique), saut si les empreintes du manifeste correspondent déjà, et appel depuis `npm run build`. Format du manifeste : type `Manifeste` dans `apps/web/src/lib/voix/fichiers.ts`.

## Fichiers

Tous dans `apps/web/src/lib/voix/` sauf mention :

| Fichier | Rôle |
|---|---|
| `client.ts` | API côté page pour F9 : `creerVoix()` puis `charger({ surProgression })`, `synthetiser(texte, { vitesse, prononciation })`, `terminer()` |
| `worker.ts` | Web Worker : manifeste, fichiers, espeak-ng, session, synthèse ; mesures renvoyées à la page |
| `protocole.ts` | Messages page et Worker |
| `kokoro.ts` | Session onnxruntime-web (build `onnxruntime-web/wasm`), style par longueur, inférence, rognage, pauses entre lots |
| `phonemes.ts` | Pipeline de kokoro-onnx 0.6.1 : ponctuation préservée, nettoyage d'espeak-ng, filtrage du vocabulaire, découpe en lots équilibrés de 510 symboles |
| `prononciation.ts` | Dictionnaire (Weekli, GitHub, LinkedIn, MCP, API, IA, Anthropic, pull request, README, React, TypeScript, JSON, backend, frontend...), complétable par projet |
| `espeak.ts`, `espeak-ng.d.ts` | Chargement d'espeak-ng avec le paquet reconstitué ; types du paquet |
| `fichiers.ts`, `cache.ts` | Téléchargement des morceaux, vérification SHA-256, cache IndexedDB (une entrée par rôle, remplacée quand l'empreinte change) |
| `audio.ts` | Rognage (portage de librosa trim), assemblage, export WAV |
| `vocabulaire.ts` | Vocabulaire Kokoro (Apache-2.0) |
| `voix.test.ts` | 10 tests Vitest avec le vrai espeak-ng sous Node |
| `outils/preparer-modeles.mjs` (+ `.d.mts`) | Préparation des fichiers servis (voir B12) |
| `essai/index.html`, `essai.ts`, `essai.css` | Page de test interne, sans script ni style inline |
| `essai/vite.essai.config.ts` | Config Vite de la page d'essai : CSP lue dans `_headers` et envoyée en en-tête, COOP + COEP |
| `apps/web/public/modeles/kokoro/` | Fichiers servis (non versionnés, ajoutés à `.git/info/exclude`) |
| `apps/web/package.json` | Dépendances et script `test` |
| `apps/web/public/_headers` | CSP |
| `LICENSE`, `README.md`, `package.json` (racine) | GPL-3.0 |

La page d'essai n'est pas une entrée du build (seul `apps/web/index.html` l'est) et affiche « Page réservée au développement » si elle est servie hors du mode dev. Elle n'est accessible que par le serveur Vite local.

## Dépendances ajoutées (`-w @weekli/web`)

- `onnxruntime-web` ^1.30.0 (MIT, Microsoft). Ajoute `protobufjs` dont le script `postinstall` n'est pas couvert par `allowScripts` (avertissement npm, sans effet : c'est une vérification de version). À ajouter en `false` dans `allowScripts` de la racine si on veut taire l'avertissement (hors de ma zone).
- `@echogarden/espeak-ng-emscripten` 0.3.5 exact (GPL-3.0). Version exacte car le sous-ensemble espeak-ng dépend des positions des fichiers dans ce paquet. C'est une compilation Emscripten en JavaScript (wasm2js), pas en WASM : même résultat, aucune `eval`.
- `vitest` ^5.0.5 en devDependency (déjà présent dans le dépôt), script `npm test -w @weekli/web`.

## CSP (pour l'audit)

Ajout dans `public/_headers`, et rien d'autre :

- `script-src 'self' 'wasm-unsafe-eval'` : autorise uniquement la compilation de WebAssembly (le binaire d'onnxruntime servi par le site). N'autorise ni `eval` ni `new Function` ni les scripts inline. Sans cette directive, la CSP interdit `WebAssembly.compile`.
- `worker-src 'self'` : le Worker vocal et les fils d'onnxruntime sont des scripts du site ; pas de `blob:`.

Vérifié : la synthèse fonctionne avec cette CSP servie en en-tête HTTP sur la page et sur le Worker (une balise meta ne suffit pas, le Worker reçoit la politique de sa propre réponse). Le contre-essai sans `'wasm-unsafe-eval'` n'a pas été concluant : le Chrome piloté par l'extension a laissé passer la compilation, alors que les styles inline étaient bien bloqués. À revérifier à la main pendant l'audit, dans un Chrome non piloté. `connect-src` est inchangé (même origine) et le modèle n'a besoin d'aucune nouvelle origine.

## Décision attendue

1. **Isolation cross-origin** (condition du critère des 60 s). Proposition : ajouter `Cross-Origin-Embedder-Policy: require-corp` dans `_headers`. Risque : les avatars `avatars.githubusercontent.com` doivent alors être chargés avec `crossorigin="anonymous"` (GitHub renvoie `Access-Control-Allow-Origin: *`), à vérifier dans les pages qui les affichent. Variante : `credentialless` (pas d'attribut à ajouter, mais Safari ne le gère pas et y resterait sur 1 fil). Variante limitée : l'en-tête sur la seule route du studio. Sans isolation, la voix marche mais il faut compter environ 1 min 45 s pour 16 s d'audio sur un M1.
2. **SPDX de la licence** : j'ai mis `GPL-3.0-only` (« GPL-3.0 » demandé). espeak-ng est en `GPL-3.0-or-later`, les deux sont compatibles. Changer en `GPL-3.0-or-later` si Soufiane préfère.

## Limites connues

- Mesures faites sur une machine très chargée ; à refaire au calme pour la fiche produit.
- Pas de flux : l'audio arrive d'un bloc à la fin. Pour un script plus long que 510 symboles, la synthèse est découpée en lots ; F9 pourra renvoyer les lots au fil de l'eau si besoin.
- Les mots anglais absents du dictionnaire sont lus avec la phonétique anglaise d'espeak-ng (drapeaux « (en) » retirés, contrairement au banc qui les lisait). Le dictionnaire est extensible par projet (`options.prononciation`).
- Le cache IndexedDB occupe environ 94 Mo par navigateur ; il échoue sans bloquer en navigation privée (la voix fonctionne, mais retélécharge).
- `ADR-08` parle de Cache Storage ; la tâche demandait IndexedDB, c'est IndexedDB (une entrée par fichier vérifié).
- Attribution SIWIS (CC-BY 4.0) à ajouter dans les mentions légales : tâche F12, hors de ma zone.
- Le README de `apps/web/src` (arborescence) ne mentionne pas encore `lib/voix/` : fichier modifié par F2, je n'y ai pas touché.

## Tests

- `npm test -w @weekli/web` : 10 tests sur 10 verts (dictionnaire lu en français par espeak-ng, sous-ensemble espeak-ng identique au paquet complet, phonèmes du texte du banc, découpe en lots, pauses, rognage, WAV).
- `tsc -b` et `oxlint src/lib/voix` sans erreur.
- Build de production du client vérifié à part (config temporaire hors du dépôt) : Worker de 858 Ko et WASM de 14,2 Mo, sous la limite de 25 Mio.

## Disque

Une seule variante du modèle dans le projet, en morceaux, dans `apps/web/public/modeles/kokoro/` (93,9 Mo, exclu de Git). Fichiers d'origine, environnement Python de référence et copies de paquets supprimés. Aucun téléchargement partiel ne reste.

## Commits proposés

```
build(web): add onnxruntime-web and espeak-ng for in-browser voice
feat(voix): synthesize french voice-over with kokoro in a web worker
test(voix): cover phonemes, pronunciation dictionary and audio helpers
feat(voix): add dev-only voice test page
security(csp): allow wasm compilation and same-origin workers for voice
chore(license): relicense under gpl-3.0 to ship espeak-ng
```

Fichiers par commit, dans l'ordre : `apps/web/package.json` et `package-lock.json` ; `apps/web/src/lib/voix/` sauf `essai/` et `voix.test.ts` ; `voix.test.ts` ; `essai/` ; `apps/web/public/_headers` ; `LICENSE`, `README.md`, `package.json`. Au moment de mon relevé, le diff de `package-lock.json` ne contenait que ces dépendances : le relire avant l'ajout, d'autres agents installent aussi des paquets.
