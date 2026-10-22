---
name: video-projet
description: Produit une vidéo de projet avec voix off, musique et sous-titres, à partir d'un dépôt Git. Deux formats - « presentation » (pub d'une minute, dynamique) et « histoire » (comment le projet a été construit de A à Z - commits, architecture, README). À utiliser dès qu'on demande une vidéo de présentation, une pub, une démo vidéo, ou l'histoire d'un projet.
---

# Vidéo de projet

Le moteur vit dans `apps/video` (Remotion). Ce skill décrit **comment écrire le script** et **comment le produire**. Il marche sur n'importe quel dépôt Git, pas seulement Weekli.

## Les deux formats

| | `presentation` | `histoire` |
|---|---|---|
| But | Donner envie, comme une pub | Montrer comment c'est construit |
| Durée | 50 à 65 s | 1 min 30 à 2 min 30 |
| Ambiance musicale | `energique` (112 bpm, batterie) | `calme` (84 bpm, nappes) |
| Format conseillé | `portrait` 1080 × 1350 (LinkedIn) | `paysage` 1920 × 1080 (YouTube, portfolio) |
| Segments | 8 à 10 | 9 à 13 |
| Ton | Phrases courtes, rythme, tutoiement | Narratif, factuel, chronologique |

## Procédure

1. **Collecter** les faits :
   ```bash
   npm run collecter -w @weekli/video -- <chemin-du-repo> <nom>
   ```
   Lire `apps/video/projets/<nom>/donnees.json` en entier : commits (dates, messages, lignes hors fichiers générés), README et docs, langages, stack, arborescence.

2. **Capturer** l'interface si le projet a un site qui tourne (facultatif, recommandé pour `presentation`) :
   ```bash
   node apps/video/scripts/capturer.mjs <nom> accueil <url>
   ```

3. **Écrire le script** `apps/video/projets/<nom>/<format>.json` selon le schéma ci-dessous et les règles d'écriture.

4. **Produire** :
   ```bash
   npm run produire -w @weekli/video -- <nom> <presentation|histoire>
   ```
   Voix off macOS (Thomas par défaut, `--voix Jacques` possible), musique générée, rendu, contrôle. Sortie : `apps/video/sorties/<nom>-<format>.mp4`.

5. **Vérifier** avant de livrer (voir la checklist).

## Schéma du script

```json
{
  "titre": "Weekli, la pub",
  "projet": "weekli",
  "format": "portrait",
  "ambiance": "energique",
  "prononciation": { "Weekli": "Wikli", "MCP": "M C P" },
  "segments": [
    { "id": "accroche", "voix": "Phrase dite par la voix off.", "visuel": { "type": "accroche", "texte": "Ton code, *raconté.*" } }
  ]
}
```

`voix` est lu par la voix off **et** affiché en sous-titres. La durée de chaque scène se cale automatiquement sur sa phrase : il ne faut jamais la fixer à la main.

## Ce que le moteur ajoute tout seul

Pas besoin de le décrire dans le script :
- **Décor 3D continu** : dégradé liquide et sculpture nacrée qui changent de place à chaque scène et passent en tons sombres sur les scènes sombres.
- **Transitions 3D** (pivot, bascule, plongée, iris, volets) avec éclat lumineux ; `revelation` entre en plongée, `citation` et `appel` en iris.
- **Révélation à impact** : montée de tension, lettres qui arrivent en 3D, onde de choc, secousse de caméra et coup sourd.
- **Titrage cinétique** : chaque mot sort d'un masque en pivotant.

## Les visuels disponibles

| `type` | Champs | Quand l'utiliser |
|---|---|---|
| `accroche` | `texte`, `sousTexte?` | Ouverture. Les `*mots entre étoiles*` passent en italique moka |
| `probleme` | `titre`, `points[]` (3 max) | Le problème que le projet résout. Fond sombre, points barrés |
| `revelation` | `nom`, `slogan` | Apparition du nom du projet |
| `fonctionnalites` | `titre`, `elements[] { titre, texte, icone }` (3 max) | Ce que fait le projet. Icônes : `github`, `ia`, `video`, `bouclier`, `eclair`, `code`, `camera`, `historique`, `serveur`, `cle` |
| `chiffres` | `elements[] { valeur, suffixe?, libelle }` (4 max) | Compteurs animés, fond sombre |
| `terminal` | `commande`, `lignes[]` (5 max) | Une commande et son résultat, fond sombre |
| `capture` | `image`, `legende?` | Une capture du site dans un navigateur incliné |
| `architecture` | `titre`, `noeuds[] { id, nom, detail? }` (5 max), `liens[[a, b]]` | Schéma qui se dessine |
| `chronologie` | `titre`, `etapes[] { date, titre, detail? }` (4 max) | Une phase de l'historique des commits |
| `code` | `fichier`, `lignes[]` (8 max) | Extrait de README ou de code |
| `citation` | `texte`, `auteur?` | Une phrase forte, en grand |
| `appel` | `titre`, `lien`, `sousTexte?` | Fin : où trouver le projet. Fond sombre |

## Règles d'écriture

**Exactitude, non négociable.**
- Chaque chiffre, date, nom de commit ou fonctionnalité vient de `donnees.json`. Rien d'inventé, rien d'arrondi de façon trompeuse (« près de dix mille lignes » pour 9 868 est acceptable ; « dix mille » ne l'est pas).
- Les lignes de code comptées excluent les fichiers générés : utiliser les chiffres du collecteur, jamais ceux affichés par GitHub.

**Voix off.**
- `revelation` : au moins 2 secondes de voix (nom puis slogan), sinon le nom apparaît pendant le flash de transition.
- Une à deux phrases par segment, 6 à 22 mots. Débit de 185 mots par minute : 60 s ≈ 140 mots en tout.
- Écrire pour l'oreille : pas de parenthèses, pas de listes à puces, pas d'abréviations dans `voix`.
- Les nombres s'écrivent en toutes lettres dans `voix` (« soixante-quatorze tests »), en chiffres dans les visuels.
- Jamais de tiret long ni de tiret demi-cadratin, nulle part : virgule ou deux-points à la place.
- Renseigner `prononciation` pour les sigles et noms propres (MCP, API, OAuth, GitHub, LinkedIn, le nom du projet). Tester en cas de doute : `say -v Thomas "texte"`.

**Visuels.**
- Le visuel complète la voix, il ne la répète pas mot pour mot.
- Alterner fonds clairs et sombres (`probleme`, `chiffres`, `terminal`, `appel` sont sombres) pour donner du rythme.
- Textes visuels courts : 8 mots maximum pour un titre, 6 pour un élément de liste.

**Structure `presentation`** : accroche, problème, révélation, fonctionnalités, démonstration (`terminal` ou `capture`), preuve (`chiffres`), différenciation (`citation` ou `fonctionnalites`), appel.

**Structure `histoire`** : accroche, puis l'historique découpé en 3 ou 4 phases (`chronologie`), l'architecture au moment où elle apparaît, un extrait de README (`code`), les chiffres clés, ce que les tests ont révélé, une citation, l'appel.

## Checklist avant de livrer

- [ ] `produire` a affiché `audio: true` et la durée attendue
- [ ] Planche de contrôle extraite et regardée :
  ```bash
  ffmpeg -i sorties/<nom>-<format>.mp4 -vf "fps=1/4,scale=360:-1,tile=5x3" -frames:v 1 planche.png
  ```
  Aucun texte coupé, aucun débordement, sous-titres lisibles
- [ ] Aucun tiret long dans le script : `perl -CSD -ne 'print if /\x{2014}|\x{2013}/' projets/<nom>/<format>.json` n'affiche rien
- [ ] Chaque chiffre du script retrouvé dans `donnees.json`

## Limites connues

- La voix macOS reste synthétique. Pour une voix plus naturelle, Remotion fournit `@remotion/elevenlabs` (clé API requise).
- Le rendu demande Chrome installé et le GPU (décor 3D) ; compter environ deux minutes par minute de vidéo. Si un rendu échoue sans message clair, le relancer : la voix est en cache.
- Remotion est gratuit pour les particuliers et les petites équipes ; vérifier sa licence pour un usage en entreprise.
