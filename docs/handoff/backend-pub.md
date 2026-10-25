# Handoff backend : B9, cœur de la pub (partie rédaction)

Date : 2026-10-25. Branche `docs/brief-v1`. Rien n'est commité. Aucune dépendance ajoutée. B8 est commité (`60cf5a1`), docs alignées par l'architecte (`35337ce`), relues avant de finir.

## Fichiers (tous dans `packages/core/src/pub/`)

| Fichier | Rôle |
|---|---|
| `guide.ts` | `QUESTIONS_PUB` (les 3 questions de `design.md` 8.14, avec leur aide et leur exemple), `CATALOGUE_PUB` (les 11 scènes : acte, fond, durées, champs et limites, quoi écrire ; structure type de 60 s ; règles de rejet et d'avertissement), `REGLES_PUB` (règles d'écriture de 8.2 et 8.12, plus une liste de vérifications avant d'enregistrer). Texte clair pour un modèle. Durées et bornes tirées de `limites.ts` (`DUREES_SCENE`, `LIMITES_PUB`) pour rester synchrones |
| `modele.ts` | `scriptPubDepuisReponses(entree: EntreeScriptPub): ScriptPub`, sans IA ni réseau |
| `guide.test.ts` | 4 tests |
| `modele.test.ts` | 22 tests |
| `index.ts` | ajoute `CATALOGUE_PUB`, `QUESTIONS_PUB`, `QuestionPub`, `REGLES_PUB`, `EntreeScriptPub`, `scriptPubDepuisReponses` |

`EntreeScriptPub = { nom, repo, lien, reponses: { pourQui, probleme, promesse }, slogan?, marque?: { primaire?, accent?, alerte? }, captures? }`. Préconditions côté appelant : `repo` conforme à `NOM_REPO`, `lien` en https (sinon `nettoyerScriptPub` rejette, ce qui est voulu).

Usage prévu :
- B11 (`preparer_pub`) : `questions: QUESTIONS_PUB`, `catalogue: CATALOGUE_PUB`, `regles: REGLES_PUB`, `schema: SCHEMA_SCRIPT_PUB`.
- Mode clé API : consigne système = `CATALOGUE_PUB + "\n\n" + REGLES_PUB`.
- Studio (bouton « Script de départ », US-P9) : `scriptPubDepuisReponses(...)`.

## Fonctionnement du script de départ

- Structure de 8.13 : ouverture, repetition, boucle, chorus, rupture, revelation, étapes, resultat, preuve (masquée), appel, fin. Soit 10 à 14 scènes.
- **Étapes** : uniquement sur des captures que `nettoyerScriptPub` accepte (id valide, unique, URL https pour `site`) ; les autres captures sont écartées. 0 capture : aucune étape. 1 capture : 2 étapes sur la même capture (cadrage `haut` puis `bas`). 2 à 6 captures : une étape par capture, 4 au plus. Onglet = légende si elle tient en 14 caractères, sinon « Écran n ».
- **Chorus** (facultatif) retiré quand il y a 4 étapes, pour rester sous 170 mots.
- **Preuve** : toujours présente mais `masquee: true`, surtitre « Nos engagements », élément « À compléter ». Sans IA on ne sait rien de vrai sur le projet ; l'utilisateur la remplit et l'affiche s'il a des faits réels. Rien d'inventé n'est rendu.
- **Réponses** : un morceau de réponse n'est repris que s'il tient en entier (en caractères et en mots), sinon une phrase générique le remplace. On ne coupe jamais une phrase au milieu. La cible est raccourcie avant « qui/que/dont/avec/pour » (« Les restaurateurs indépendants qui... » donne « les restaurateurs indépendants »). Le slogan vient de `slogan`, sinon de la première proposition de la promesse, sinon de sa première moitié (avant « et/mais/donc »), sinon « Tout devient simple. ».
- **Voix** : chaque voix reste sous le plafond de sa scène (durée max à 170 mots par minute), réparties comme dans 8.13. Vouvoiement fixe.
- **Accents** : derniers mots du texte, contenus par construction.
- **Nettoyage d'entrée** identique à `nettoyerScriptPub` (contrôles et marques bidirectionnelles retirés, tirets longs et moyens remplacés par une virgule) : le test vérifie que `nettoyerScriptPub(script).script` est **égal** au script produit, donc rien n'est tronqué ni modifié en aval.
- Couleurs : `#rrggbb` en minuscules ; `primaire` absente ou invalide : `#3d4bff` ; `accent`/`alerte` invalides : omis. Monogramme = initiale du nom.

## Tests et résultats réels

- `cd packages/core && npx tsc --noEmit` : OK.
- `npx vitest run` (core entier) : **11 fichiers, 174 tests verts**, dont 26 pour B9 (`modele.test.ts` 22, `guide.test.ts` 4).
- Prettier appliqué sur les 5 fichiers. `grep` des tirets longs et moyens : rien. Aucun `console.log`, aucun TODO.

Critère de fini couvert : 5 jeux de réponses variés (restaurant complet, projet sans capture avec des réponses d'un mot, nom de 66 caractères avec une seule capture, 6 captures avec slogan donné, ponctuation libre et couleur invalide) : `erreurs: []` et script inchangé par `nettoyerScriptPub`, entre 10 et 14 scènes, `fin` en dernier, chaque étape sur une capture existante. Mesures réelles :

| Jeu | Scènes | Mots de voix | Durée estimée | Avertissements |
|---|---|---|---|---|
| restaurant (2 captures) | 12 | 145 | 51 s | aucun |
| sans capture | 10 | 97 | 36 s | voix et durée trop courtes |
| nom très long (1 capture) | 12 | 155 | 50 s | aucun |
| 6 captures | 13 | 155 | 55 s | aucun |
| ponctuation libre (3 captures) | 13 | 155 | 54 s | aucun |

Autres tests : captures refusées écartées, une capture donne deux étapes, 4 étapes au plus sans chorus, preuve toujours masquée, aucune phrase coupée, slogan et lien affiché (`github.com/Souf-F/nom-long`), nom borné à 40 sans couper un mot, couleurs, tirets et marque bidirectionnelle U+202E retirés, accents contenus dans leur texte. Côté guide : les 11 types dans l'ordre avec leurs durées, les 3 questions, les interdits, aucun tiret ni gabarit non résolu.

## Points flous, à trancher par l'architecte

1. **« Jamais d'étape sans capture » contre `design.md` 8.10 aligné** : la consigne de B9 interdit une étape sans capture, alors que 8.10 dit maintenant « chaque `etape` y porte soit une capture existante, soit une liste de 2 à 4 éléments ». J'ai suivi la consigne : sans IA, une liste devrait inventer des fonctions. Le guide, lui, autorise Claude à faire une liste, mais **seulement de fonctions réelles** lues dans le README ou les captures.
2. **Projet sans capture : pub trop courte, par construction**. Sans étape, il reste 9 scènes visibles, soit environ 46 s même avec toutes les durées au maximum. L'avertissement de durée (et celui de voix) est donc inévitable. Pistes : le studio pousse à importer une capture avant le script de départ, ou on accepte l'avertissement.
3. **`specs.md` US-P1 dit « 10 à 14 scènes »**, le contrat dit 8 à 14. Le modèle produit toujours 10 à 14 grâce à la preuve masquée (9 scènes visibles sans capture).
4. **Questions** : `QUESTIONS_PUB` reprend les textes accentués de `design.md` 8.14, exemple compris dans `aide`. L'exemple JSON de `api-contract.md` 4.2 n'a pas d'accents et pas d'exemple. Je pense que ces textes doivent être accentués, puisqu'ils sont montrés à l'utilisateur. À confirmer dans le contrat.
5. **Tutoiement** non détecté par le modèle : les réponses s'adressent au développeur (« ton projet »), pas à la cible, et une détection automatique serait fragile. Le guide laisse Claude décider (« si l'utilisateur le demande ou si ses réponses tutoient sa cible »).
6. **Textes génériques** du modèle (bulles du chorus, « Réglé », « L'esprit libre », titres d'étape) : ce sont des formules neutres, pas des faits. À relire par l'architecte pour le ton.
7. **La règle « au moins 2 étapes »** figure dans le guide (contrat 2.1 : « 2 à 4 »), mais `nettoyerScriptPub` n'avertit pas pour une seule étape (choix de B8, acté dans le contrat aligné).

Aucun bug vu dans `nettoyer`, `timeline` ou `palette`.

Note d'outillage, pour les autres agents : les outils d'écriture de fichiers et de commandes de cette session **décodent les séquences d'échappement unicode** (barre oblique inverse, u, quatre chiffres hexadécimaux) du texte envoyé. Un séparateur de ligne U+2028 écrit en échappement dans une regex est devenu un vrai caractère, ce qui a cassé la compilation. Le hook anti-tirets bloque aussi l'échappement du tiret long pour la même raison. Dans `modele.ts`, les échappements ont été réécrits par script, et les tirets sont construits avec `String.fromCharCode(0x2013, 0x2014)`.

## Commits

Aucun (consigne). Message proposé, en un commit :

```
feat(core): add pub writing guide and starter script without ai

guide.ts holds the questions, scene catalogue and writing rules that
Claude reads through preparer_pub or the API key mode, with durations
and limits taken from limites.ts. scriptPubDepuisReponses builds a
draft from the 3 answers, brand and captures: it passes
nettoyerScriptPub unchanged, never makes a step without a capture and
never renders invented proof.
```

Fichiers à ajouter explicitement : `packages/core/src/pub/guide.ts`, `guide.test.ts`, `modele.ts`, `modele.test.ts`, `index.ts`, `docs/handoff/backend-pub.md`. Attention : `packages/core/src/index.ts` et `packages/core/src/github.ts` sont modifiés par d'autres agents, pas par B9.

## Code mort supprimé

Aucun (code neuf). Le fichier de mesure temporaire `zz-mesure.test.ts` a été supprimé.
