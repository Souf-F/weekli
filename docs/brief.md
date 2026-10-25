# Brief V1 : Weekli

Mis à jour le 2026-10-24. Référence de toute l'équipe. Toute déviation passe par l'orchestrateur et est notée dans `docs/changelog.md`.

## 1. Objectif

Projet portfolio, gratuit, sans paiement prévu. Weekli transforme l'activité GitHub d'un développeur en posts LinkedIn rédigés par Claude, accompagnés d'une **pub vidéo de son projet** pour rendre le post plus attirant.

Résultat attendu : un produit fini, démontrable de bout en bout, qui met en valeur le savoir-faire de Soufiane.

## 2. Cible

- Développeurs francophones qui veulent rendre leurs projets visibles sur LinkedIn.
- Desktop en priorité pour le site, mobile correct. Claude web, desktop et mobile pour le connecteur.
- **Français uniquement.** Pas d'i18n en V1.

## 3. Périmètre V1

### Dans la V1

| Priorité | Fonctionnalité |
|---|---|
| 1 | **Connecteur MCP dans Claude** : produit principal. Lecture GitHub, rédaction des posts, brouillons, script de pub vidéo. |
| 1 | **Pub vidéo du projet** (voir section 4) : refonte complète du studio. |
| 2 | **Style d'écriture mémorisé** par utilisateur, utilisé par Claude et par le site. |
| 2 | Captures de sites sur domaines vérifiés (existant), utilisées dans la pub. |
| 2 | Historique des brouillons (existant). |
| 2 | RGPD : conservation 90 jours, bouton « supprimer mes données », page de confidentialité et mentions légales. |
| 3 | **Mode site avec clé API** : bonus. Maintenu, pas de nouveau développement sauf pour rester compatible. |

### Hors V1

- Paiement, abonnements.
- Langue anglaise.
- Repos privés (resterait en scope `read:user`).
- Publication automatique sur LinkedIn.
- Format vidéo « histoire des commits » : supprimé du produit.
- Déploiement public : seulement quand tout est validé en local.

## 4. La pub vidéo (refonte)

**Référence de niveau : `~/Desktop/Stepwize_pub_audit_gratuit.mp4`.** C'est une référence de niveau et d'énergie, un exemple du style dynamique visé, pas un modèle à recopier : chaque pub suit une des trames de `docs/design.md` et l'identité du projet de l'utilisateur.

Ce que c'est : la pub du **projet de l'utilisateur**, comme celle d'une entreprise. L'idée, le problème résolu, ce que ça apporte, comment le site a été pensé (parti pris, pas technique). **Jamais** de commits, de code, de terminal ou de chiffres de développement.

Grammaire visuelle tirée de la référence :
- Typographie cinétique plein écran, mots qui entrent un par un, mots clés surlignés ou colorés.
- Tension d'ouverture (le problème qui revient), puis rupture (« Et si... »), puis révélation du nom avec effet de pixels et rayons.
- Parcours produit en étapes numérotées (« Étape 01 / 04 ») avec interface du site en cartes animées et grand mot en filigrane.
- Preuve sociale, puis appel à l'action avec bouton et lien.
- Alternance fond sombre de marque et fond clair, transitions glitch et flou.
- Voix off féminine française, musique, environ 60 secondes.

Fonctionnement :
1. Claude (outil MCP) ou le site pose 3 questions : pour qui, quel problème, quelle promesse. Il lit le README et les captures du site.
2. Claude écrit le script de la pub (voix off et scènes), enregistré comme brouillon.
3. L'utilisateur ajuste les scènes et lance le rendu sur le site, export MP4.
4. Les couleurs et le logo du projet de l'utilisateur sont repris (pas ceux de Weekli).

Le pipeline Remotion local (`apps/video`) reste un **outil interne** pour la pub de lancement de Weekli lui-même. Son format « histoire » est retiré.

## 5. Direction artistique du site

On garde l'existant (mesh WebGL, café et platine, maquette 3D) avec une passe de cohérence par l'architecte.

## 6. Données et RGPD

- Données GitHub publiques, token GitHub chiffré, brouillons et style d'écriture chiffrés dans KV.
- Conservation 90 jours, suppression complète à la demande.
- Clé API Anthropic (mode bonus) : jamais envoyée au serveur.

## 7. Technique

- Stack existante conservée : TypeScript, React 19, Vite, CSS Modules, Cloudflare Workers, Durable Objects, KV, Browser Run, Hono.
- Règle « vanilla » : HTML, CSS et JS toujours dans des fichiers séparés. Aucun style inline, aucun CSS-in-JS, aucun script inline.
- Hébergement : **Cloudflare Workers**, avec le domaine de Soufiane pointé dessus au moment du déploiement. Le VPS n'est pas utilisé pour Weekli.
- App OAuth GitHub : déjà créée sur le compte GitHub de Soufiane. Les secrets restent chez lui (`apps/server/.dev.vars`, jamais commité).
- Ajouter un `.gitignore` local non poussé (`node_modules`, `.dev.vars`, `dist`, sorties vidéo).

## 8. Contraintes

- Budget : 0 €. Aucun service payant, y compris pour la voix off.
- Commits au format Conventional Commits à partir de maintenant, sans réécrire l'historique.
- Aucun push sans validation explicite.

## 9. Risques acceptés et points de vigilance

| Risque | Décision |
|---|---|
| Une voix off gratuite et de qualité, rendue pour n'importe quel utilisateur, n'est pas garantie | L'architecte compare les options gratuites (voir section 11) avant tout code vidéo |
| L'interface du projet de l'utilisateur ne peut pas être redessinée comme dans la référence | Utiliser ses captures recadrées et animées en cartes, avec ses couleurs |
| Stack React au lieu du vanilla par défaut | Accepté : réécrire serait du gaspillage |

## 10. Définition de « fini »

- [ ] OAuth testé de bout en bout en local, depuis Claude et depuis le site.
- [ ] Posts générés depuis Claude dans le style mémorisé.
- [ ] Pub vidéo d'un projet générée depuis Claude, rendue sur le site, de niveau comparable à la référence sans en copier la structure, validée par Soufiane.
- [ ] RGPD : suppression des données, page de confidentialité.
- [ ] Tests verts, typecheck OK, aucun tiret long.
- [ ] Audit sécurité final OK, rapport PDF dans `docs/reviews/`.
- [ ] README et installation vérifiés de bout en bout.
- [ ] Ensuite seulement : déploiement sur le domaine.

## 11. Points ouverts

1. Voix off : quelle voix a servi pour la vidéo Stepwize ? Options gratuites étudiées par l'architecte : voix neuronale Microsoft Edge (meilleure qualité, usage non officiel), Piper ou Kokoro (libres, exécutables dans le navigateur, qualité moindre).
2. Format de la pub : 16:9 comme la référence, ou 4:5 (plus visible dans le fil LinkedIn mobile) ?
