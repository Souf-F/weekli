# Handoff frontend : studio de pub (F10) et retrait de l'ancien studio (F11)

Date : 2026-10-29. Branche `feat/weekli-v1`, rien de commité.

## Livré

`/app/studio` ouvre trois écrans selon l'adresse (`apps/web/src/pages/Studio/Studio.tsx`) :

| Adresse | Écran | Fichiers |
|---|---|---|
| `/app/studio` | Mes pubs : cartes avec vignette (image de la révélation rendue à la volée), ouvrir, dupliquer, supprimer avec confirmation, état vide avec le prompt Claude à copier, plafond de 20 | `ListePubs.tsx`, `vignette.ts` |
| `?nouveau` | Assistant en 4 étapes : projet (`/api/repos`, recherche), 3 questions (`QUESTIONS_PUB`, 300 caractères), captures (2 au plus, facultatives : page d'un domaine vérifié ou image importée), script | `Assistant.tsx`, `Etape*.tsx` |
| `?pub=<id>` | Éditeur : onglets Scènes, Marque, Gestes, Voix ; aperçu en direct ; export | `Editeur.tsx`, `Panneau*.tsx`, `ChampsScene.tsx`, `Apercu.tsx` |

- **Script de départ** : `scriptPubDepuisReponses`, aucun appel hors Weekli. Il demande une capture d'abord seulement si le script sans capture dure moins de 50 s (`lib/studio/depart.ts`, `exigeCapture`).
- **Écrire avec Claude** (mode clé API, bouton absent sinon, avec lien vers les réglages) : `genererScriptPub` dans `lib/generation.ts`, avec `REGLES_PUB`, `CATALOGUE_PUB`, `QUESTIONS_PUB`, `TRAMES_PUB` et `SCHEMA_SCRIPT_PUB` ; la clé reste dans le navigateur. Le README et la description du repo sont passés comme contenu non fiable.
- **Édition** : texte, mot en couleur, but, transition, voix, durée (sans voix), monter, descendre, masquer, dupliquer, retirer. Les règles de structure se signalent sans bloquer (`lib/studio/diagnostic.ts`) ; les avertissements de `nettoyerScriptPub` s'affichent sur la scène concernée, les autres en tête de liste.
- **Marque** : trois couleurs proposées d'après la première capture, couleur, accent, alerte, typographie, monogramme ou logo importé (IndexedDB, jamais envoyé).
- **Voix** : générée (Vivienne puis repli Kokoro, état annoncé), importée scène par scène, ou sans voix ; vitesse, prononciation, musique ; voix périmée signalée quand un texte change.
- **Sauvegarde** : `hooks/useSauvegarde.ts`, 2 s après la dernière frappe, envoi à la sortie de l'éditeur, état « Enregistré » annoncé en `role="status"`, refus du serveur affiché avec ses `details`.
- **Export** (`PanneauExport.tsx`) : format annoncé avant de lancer, voix, mixage, MP4 image par image, miniature PNG 1920 x 1080 (image zéro), SRT, progression, annulation. Contrôles finaux (`lib/studio/controles.ts`) : durée de la vidéo, dimensions et pistes, audio et vidéo de même durée, crête vraie sous -1,5 dBTP (estimée par suréchantillonnage x4), aucun noir involontaire, image zéro du MP4 décodée comparée au PNG, planche de relecture (raccords et deux images par scène, mention « Illustration »). Un échec bloque le téléchargement du MP4 et donne la cause.
- **Accessibilité** : onglets à tabindex itinérant et flèches, accordéon de scènes, tout contrôle nommé (vérifié : 44 contrôles, aucun sans nom), focus global du site, `prefers-reduced-motion` (transitions CSS coupées, aucune lecture automatique, note affichée), aucun scroll horizontal à 375 px.

### Impacts de la discipline de production

- `but` : `calculerTimeline` impose gestes d'entrée plus pause (1,2 / 0,8 / 0,5 s) comme plancher (`packages/core/src/pub/timeline.ts`, `limites.ts`, 3 tests).
- `gestes` : les transitions non choisies deviennent des coupes dans la timeline (un seul calendrier, 2 tests) ; `contexte.gestes` et `gestePresent()` exposent le choix aux scènes.
- Miniature PNG : `lib/studio/miniature.ts`, proposée au téléchargement.
- Plafond du mixage -1 à -2 dBFS (`audio/mixage.ts`) : la crête vraie était à -0,9 dBTP, elle est à -1,8.

### Retrait de l'ancien studio (F11)

Supprimés : `apps/web/src/lib/video/`, `packages/core/src/storyboard.ts` et son test, `genererStoryboard`, `EditeurScene.tsx`, le bouton « En vidéo » de l'historique. READMEs de `apps/web`, `apps/web/src` et `packages/core` alignés. `grep` de storyboard et de lib/video dans `apps` et `packages` : zéro résultat.

## Recette (Vite sur 127.0.0.1:5190, `VITE_DEMO=1`)

Lancer : `cd apps/web && VITE_DEMO=1 npx vite --host 127.0.0.1 --port 5190`. Le faux serveur (`src/lib/demo/installer.ts`, absent du build, vérifié) simule compte, repos, domaines, captures, pubs en mémoire de l'onglet.

Exercé de bout en bout : liste avec vignette, assistant complet (projet, questions, capture du domaine de démonstration, script de départ), création puis ouverture par `?pub=`, édition d'un slogan (aperçu à jour en moins de 300 ms, « Modifications en attente » puis « Enregistré »), saut d'aperçu à la scène choisie, lecture avec son (clic réel), onglets Marque et Gestes, navigation clavier des onglets, export MP4 complet (46,3 s, 33 Mo, 12 à 22 s) avec les 6 contrôles réussis, planche de relecture, page à 375 px.

## Non exercé et limites

- **Aucune session GitHub réelle** ni route `/api/pubs`, `/api/repos`, `/api/domaines` réelles : le contrat est suivi, jamais vérifié contre le serveur.
- **Voix** : le serveur de voix (Vivienne) et le repli Kokoro n'ont pas été exercés dans le studio (le faux serveur renvoie 503 ; la pub de recette est en « Sans voix »). La voix importée non plus. La couche `lib/pub/audio` est testée à part.
- **Écrire avec Claude** : non exercé (pas de clé API). Compilé et typé ; le schéma strict peut refuser `prononciation` (risque déjà noté dans api-contract.md).
- **Gestes de texte** : `accent`, `surlignage`, `soulignement`, `frappe`, `impact`, `lettres`, `rayons` ne sont pas appliqués : les scènes (`lib/pub/scenes`, `lib/pub/visuel`) étaient hors de ma zone. Il reste à lire `contexte.gestes` dans les scènes (`gestePresent(contexte, "impact")`) et à rendre la version neutre. Seules les transitions suivent `gestes`. Le critère « deux films visiblement différents » n'est donc pas tenu pour le texte.
- **Image zéro complète** (logo et nom posés à t = 0 dans l'ouverture) : même cause, côté scènes. Le contrôle de l'image zéro vérifie seulement que MP4 et PNG coïncident (écart moyen de 2,18 sur 255, tolérance 3).
- `DUREE_GESTES` (durées d'entrée par type) est une estimation : à remplacer par les valeurs réelles des scènes.
- **Instrument Serif reste** : `lib/pub/visuel/typo.ts` l'utilise pour la typographie `editoriale` de la pub, donc la police et sa licence OFL ne peuvent pas partir. À décider avec l'architecte.
- Références restantes dans les docs (hors de ma zone) : `docs/roadmap.md` (V0.4 storyboards), `docs/securite.md` ligne 98, `docs/architecture.md` (ADR-10 et arborescence, décision d'origine), `docs/design.md`.
- Le chunk du studio fait 732 ko (203 ko gzip) : mediabunny, moteur et scènes, chargés à la demande seulement.
- Lighthouse non mesuré.
- Le flux mobile place les réglages avant l'aperçu (ordre du DOM gardé pour le clavier).

## Tests

`npm run typecheck`, `npm test` (core 243, server 213, web 88) et `npm run build` : verts. Ajoutés : 3 + 2 tests de timeline (but, gestes), 6 d'édition, 4 de script de départ, 2 de crête vraie.
