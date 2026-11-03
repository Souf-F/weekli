# Handoff B13 : outil interne vidéo (apps/video)

## Fichiers modifiés
- apps/video/src/types.ts, Root.tsx, temps.ts, composants/scenes.tsx, composants/monde3d.tsx : une seule composition `Presentation`, 1920x1080 par défaut (`format: "portrait"` reste possible en option), scènes `terminal`, `architecture`, `chronologie`, `code` retirées.
- apps/video/scripts/produire.mjs : plus d'argument de format, `produire <projet>`, nom validé par `exigerNom`.
- apps/video/scripts/collecter.mjs : historique des commits, totaux, langages et arborescence retirés ; reste dépôt, stack, README et docs. Avertissement dépôt de confiance en en-tête.
- apps/video/projets/weekli/histoire.json supprimé ; presentation.json en paysage, segments terminal et chiffres de développement retirés.
- apps/video/README.md, package.json (description), .claude/skills/video-projet/SKILL.md : réécrits en esprit pub de marque, avertissement m7.

## Résultats réels
- `npm run typecheck` : vert (aucune erreur).
- `node apps/video/scripts/produire.mjs "../etc/x"` : `Projet invalide : 1 a 40 caracteres parmi a-z, 0-9 et "-" (recu : "../etc/x")`, exit 1. Idem pour `Bad Name`. `collecter` refuse aussi `BAD/../x`.
- Aucun rendu lancé (disque limité). Aucun tiret long dans les fichiers touchés.

## Limites
- presentation.json de Weekli n'a pas été rendu ni écouté après le retrait de deux segments : à relire avant rendu.
- Rien n'est commité. Dépendances inchangées.

## Message de commit proposé
```
refactor(video): make video an internal brand-ad tool in 16:9

Remove the histoire format, its scenes and the commit history
collection. presentation defaults to 1920x1080. The skill now
follows the brand-ad brief and warns to use trusted repos only.
```
