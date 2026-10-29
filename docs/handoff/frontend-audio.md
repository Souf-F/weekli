# Handoff F9 : audio de la pub, et isolation cross-origin

Rien n'est commité. Exports de test supprimés, serveurs arrêtés.

## COEP
- `apps/web/public/_headers` : `Cross-Origin-Embedder-Policy: require-corp` (COOP same-origin déjà présent). `apps/web/vite.config.ts` : les mêmes deux en-têtes en dev.
- `crossOrigin="anonymous"` sur les deux avatars GitHub (`layouts/AppLayout.tsx`, `pages/Tableau/CartePost.tsx`). Aucune autre ressource tierce dans le front. `crossOriginIsolated` vaut `true` en dev (vérifié). Un avatar GitHub se charge en mode CORS sous COEP (vérifié par `Image` avec `crossOrigin`, GitHub répond aussi `Cross-Origin-Resource-Policy: cross-origin`). Non vérifié dans l'app connectée (pas de session).
- Worker Cloudflare (`securite.ts`) : n'envoie ni COOP ni COEP ; il ne fait que recopier les en-têtes de la réponse, donc ceux de `_headers` passent. Rien à modifier. À noter : les pages servies par le Worker lui-même (`/authorize`) n'ont pas COEP, ce qui est sans conséquence (navigations de haut niveau).
- **Non résolu : la voix Kokoro sur 4 fils se bloque en dev** (Chrome 152 du panneau). `InferenceSession.create` avec `numThreads=4` ne rend jamais la main dans un Worker (1 fil : 1,4 s, ok ; 4 fils sur le fil principal : ok). Essayé sans effet : `optimizeDeps.exclude`, passage explicite de `mjs` dans `wasmPaths`. Le test de bout en bout a donc été fait sur 1 fil (page non isolée). À vérifier avec un build de production (la mesure 40 à 60 s de F1 n'est pas reproduite ici). Comme Kokoro n'est plus que le secours, l'impact est limité.

## Livraison F9 (`apps/web/src/lib/pub/audio/`)
| Fichier | Rôle |
|---|---|
| `voix.ts` | `synthetiserVoix(script, options)` : `POST /api/voix {texte, scene}` (audio/mpeg, décodé, rogné, 48 kHz mono) par scène ; au premier échec toute la pub bascule sur Kokoro (une seule voix) et `surEtat({source, secours, raison})` prévient l'interface ; `sansServeur` force Kokoro ; cache de session par source ; `importerVoix(fichiers par id de scène)` pour les voix importées ; renvoie `durees` pour `creerMoteur({ voixMesurees })` |
| `musique.ts` | port d'`audio.mjs` (énergique, calme), durée exacte, 48 kHz |
| `effets.ts` | souffle (durée selon la transition), montée 1,8 s, impact, clic |
| `plan.ts` | `planifierEffets` : souffle à chaque transition avec chevauchement, montée puis impact sur la révélation, clic sur chaque mot `accent` (position proportionnelle dans la voix) |
| `mixage.ts` | voix normalisées, musique baissée de 9 dB (anticipation 80 ms, attaque 80 ms, relâchement 300 ms), effets, sonie cible -16 LUFS, limiteur à -1 dBFS ; Float32 pur, sans AudioContext |
| `loudness.ts` | sonie BS.1770-4 (pondération K, portes -70 et -10), la même que `ebur128` |
| `index.ts` | `composerAudio(moteur, { voix, musique, effets })` renvoie `{ audio: AudioBuffer, mesures, avertissements }` à passer à `exporter(moteur, audio)` |

Flux : `synthetiserVoix` puis `creerMoteur({ voixMesurees: voix.durees })` (donc `calculerTimeline`) puis `composerAudio` puis `exporter`. Banc : `apps/web/dev/audio.html` (affiche l'état de la voix). `audio.ts`, `synchro.ts`, `export.ts` inchangés.

## Mesures (pub de 27,8 s, 9 scènes, énergique, voix Kokoro 1 fil car la route n'était pas utilisable : 401)
- `ffmpeg -af ebur128=peak=true` sur le MP4 exporté (H.264 + AAC) : **I = -16,0 LUFS**, LRA 1,4 LU, crête réelle **-0,9 dBFS**. Mesure interne avant encodage : -16,003 LUFS. Mixage : 2 à 4 s.
- Baisse de la musique mesurée : 9,0 dB. MP4 : vidéo 27,767 s, audio 27,796 s.
- Synchro (export en coupes, sans musique) : début de scène à l'image (`select=scene`) comparé au début de la voix (`silencedetect -40 dB`) : écart de 0,186 à 0,190 s sur 8 scènes, soit 0,15 s de décalage voulu plus environ 35 ms de seuil de détection. Dispersion inférieure à 5 ms.
- Synthèse Kokoro 1 fil : 134 s pour 17 s de voix.
- Tests : `npx vitest run src/lib/pub/audio` 24 tests verts (sonie, baisse, mixage -16 LUFS, plan, route `/api/voix` simulée, bascule sur Kokoro, annulation). `tsc` et `oxlint` propres.

## Limites
- La route `/api/voix` réelle (Vivienne) n'a pas été exercée de bout en bout : seulement simulée. Le banc a bien affiché « Secours Kokoro : le serveur de voix a répondu 401 » (route protégée par la session).
- Avertissement réel : avec une transition `pixels` (0,6 s), la voix d'une scène chevauche la suivante de 0,25 s (`calculerTimeline` ne garde que 0,35 s de marge pour 0,15 s de décalage plus 0,6 s de chevauchement). À régler dans le noyau (marge ou décalage), `composerAudio` le signale dans `avertissements`.
- Instants des effets (impact 0,15 s après la fin de la transition d'entrée de la révélation, clic selon la position du mot) à caler sur les vraies scènes de F5 à l'oreille.
- Rien n'a été écouté, seulement mesuré.

## Commits proposés
```
feat(security): isolate the site cross-origin for multithreaded voice
feat(web): add pub audio engine with generated music, effects and mix
test(web): cover loudness, ducking, mix target and voice fallback
```
Fichiers : `apps/web/public/_headers`, `apps/web/vite.config.ts`, deux avatars ; `apps/web/src/lib/pub/audio/` et `apps/web/dev/audio.*` ; `docs/handoff/frontend-audio.md`.
