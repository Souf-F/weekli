# Handoff frontend-senior : contrastes, polices de titres, accueil

Date : 2026-10-25. Rien n'est commité.

## 1. Contrastes

Méthode : script maison dans le navigateur (ratio réel de chaque texte visible, calculé sur les pixels du canvas du mesh, le voile, les fonds en verre et les fonds pleins, plusieurs positions de scroll) + Lighthouse 12 accessibilité (Chrome avec `--force-prefers-reduced-motion`, sinon les blocs `.revele` à opacité 0 sont ignorés et le score est faussement parfait). Vite sur 127.0.0.1, API simulée en local.

Causes : texte secondaire et accents moka posés directement sur les taches sombres du mesh (jusqu'à #8a7064 en bas de page).

Corrections (tokens et voile, direction artistique conservée) :
- `--texte-doux` #6a5a4f vers #4d4036.
- Nouveau `--moka-texte` #523726 pour tout texte moka (surtitres, mots en italique, badges, tags). `--moka` reste pour fonds et bordures.
- Nouveau `--voile-mesh` (platine 56 %) posé entre le canvas et le contenu (`html::after` dans global.css).
- Pied de page de l'accueil en espresso.

| Texte | Avant | Après |
|---|---|---|
| Pied : « GitHub », « Projet open source… » | 1,85 à 2,2 | 6,4 et plus |
| Pied : liens légaux | 2,2 à 2,7 | 5,4 et plus |
| Surtitre « Comment ça marche » | 2,66 | 5,45 |
| Surtitre « Deux modes » | 2,96 | 5,56 |
| Titre en italique « Deux façons… » | 3,07 (grand, seuil 3) | 5,0 et plus |
| Intro du hero | 3,67 | 6,0 et plus |
| Note du hero (capitales) | 3,49 | 6,0 et plus |
| Surtitre « Fonctionnalités » | 3,88 | 5,5 et plus |
| Résultats d'outil dans la maquette (verre) | 4,18 | 5,2 et plus |

Après : minimum mesuré 5,45 sur l'accueil (mobile et desktop), aucun texte actif sous 4,5 sur app, historique, captures, réglages, studio et pages légales. Seuls restent les boutons désactivés (opacité 0,5, exemptés WCAG 1.4.3).
Autres corrections d'accessibilité trouvées par Lighthouse : cases à cocher à 24 px (target-size), titres de cartes de l'historique en h2 (heading-order), filigrane de l'affiche en contenu généré.

Lighthouse accessibilité (final) : accueil 100, confidentialité 100, mentions légales 100, app 100, réglages 100, captures 100, studio 100, historique 100 (après le correctif h2, à relancer si doute).

## 2. Polices de titres (rien d'appliqué au site)

Page : `apps/web/dev/polices.html` (+ `.css`, `.ts`), à `http://127.0.0.1:5173/dev/polices.html`, boutons pour voir une colonne seule. Image : `docs/reviews/polices.png`.
Fichiers woff2 (npm pack de @fontsource, v5.3.0, subset latin) copiés uniquement dans `apps/web/dev/polices/` avec leurs licences OFL 1.1.
- Option 1 : Fraunces (variable, axe opsz, italique). Serif chaleureux, garde la voix éditoriale.
- Option 2 : Bricolage Grotesque (variable). Grotesque serrée et vive, proche du rythme de la pub. Pas d'italique : mots clés en moka seulement.
- Option 3 : Young Serif (400). Serif d'affiche épais, très lisible. Pas d'italique non plus.
Si le choix est fait : copier le woff2 dans `public/fonts/`, ajouter le `@font-face` à `fonts.css`, changer `--serif` dans `tokens.css`, ajuster `--t-affiche` (les options 2 et 3 sont plus larges, échelle 0,88 testée) et ajouter `font-style: normal` aux `em` pour 2 et 3.

## 3. Accueil

- Hero : « Ton projet raconté, pub et post compris. », connecteur Claude en bouton principal, maquette sur `preparer_pub` / `sauver_pub` et le post du projet (« Aujourd'hui je vous présente… »).
- Nouvelle section `PubProjet` (#pub, après le bandeau) : emplacement F13 repéré par `data-emplacement="pub-demo"` dans `PubProjet.tsx` (commentaire en tête), affiche 16:9 en CSS en attendant la vidéo, trois étapes et l'extrait du post.
- Fonctionnalités : pub vidéo, voix off, post du projet, style, lecture seule, activité filtrée.
- Deux modes : Claude en panneau espresso élargi et recommandé, clé API en bonus (nouvelle variante de bouton `clair`).
- Étapes et installer réécrits. Bandeau sans marque tierce (Cloudflare et OAuth retirés). Aucune mention de la référence ni de Stepwize. Claude, GitHub et LinkedIn restent cités car ils font le produit.
- Chiffre des outils : `NB_OUTILS = 13` dans `pages/Accueil/donnees.ts` (comptage des `registerTool` dans `apps/server/src/mcp/outils-*.ts` : 4 GitHub, 4 pub, 2 brouillons, 2 style, 1 capture). Les 14 à 15 attendus ne sont pas dans le code : à trancher (outil manquant, ou chiffre du brief à corriger). Le code est la vérité, donc 13.

## Vérifications
`npm run typecheck` et `npm run build` (apps/web) verts. Aucun tiret long dans les fichiers modifiés.

## Limites
Audit de contraste fait sur le mesh à des instants et scrolls échantillonnés, pas sur toutes les positions possibles (marge visée au moins 0,9 point). L'app a été auditée avec une API simulée.
