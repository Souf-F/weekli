# Spécifications V1 : Weekli

Mis à jour le 2026-10-24. Source : `docs/brief.md` (référence absolue). Ce document traduit le brief en user stories et en critères d'acceptation testables. En cas de conflit, le brief gagne et l'écart est noté dans `docs/changelog.md`.

## 1. Objectif

Weekli transforme l'activité GitHub d'un développeur en posts LinkedIn rédigés par Claude, et fabrique la **pub vidéo de son projet**, au niveau de la référence Stepwize, pour rendre ses posts plus attirants. Projet portfolio, gratuit, budget 0 €.

## 2. Cible et personas

| Persona | Contexte | Ce qu'il attend |
|---|---|---|
| **Léa, développeuse indépendante** | Utilise Claude Pro tous les jours, publie sur LinkedIn une fois par mois faute de temps | Des posts prêts à copier, dans sa voix, sans quitter Claude |
| **Karim, étudiant en reconversion** | Projet de fin de formation en ligne, cherche une alternance | Une pub d'une minute de son projet, qui donne l'air d'un vrai produit |
| **Soufiane, auteur** | Démontre son savoir-faire | Un produit fini, démontrable de bout en bout, sans dette visible |

Français uniquement. Desktop en priorité pour le site (Chrome et Edge pour l'export vidéo), mobile correct. Claude web, desktop et mobile pour le connecteur.

## 3. Périmètre

### Dans la V1, par priorité

| Priorité | Bloc | Sections |
|---|---|---|
| 1 | Connecteur MCP dans Claude | 4.1 |
| 1 | Pub vidéo du projet | 4.2 |
| 2 | Style d'écriture mémorisé | 4.3 |
| 2 | Captures de sites vérifiés utilisées dans la pub | 4.2 (US-P5) |
| 2 | Historique des brouillons (existant) | 4.1 (US-M4) |
| 2 | RGPD : conservation, effacement complet, export, information | 4.4 |
| 3 | Mode site avec clé API (bonus, maintenu compatible) | 4.5 |

### Hors périmètre V1

- Paiement, abonnements, quotas payants.
- Anglais et i18n.
- Repos privés (le scope reste `read:user`).
- Publication automatique sur LinkedIn.
- Vidéo « histoire des commits » et ancienne vidéo verticale tirée d'un post (scènes terminal, liste, avant/après) : retirées du produit.
- Format 4:5 de la pub (peut-être plus tard).
- Voix off payante (ElevenLabs, Azure Speech avec clé).
- Rendu vidéo côté serveur.
- Déploiement public tant que la définition de « fini » du brief n'est pas cochée.

## 4. User stories et critères d'acceptation

Convention : chaque critère est vérifiable par un test automatisé (TA) ou par une recette manuelle (RM).

### 4.1 Connecteur MCP (priorité 1)

**US-M1** En tant que développeur, je veux connecter Weekli à Claude en deux minutes, afin de l'utiliser avec mon abonnement sans clé API.
- [RM] Depuis Claude web (Réglages, Connecteurs, ajouter l'URL `<PUBLIC_URL>/mcp`), l'écran de consentement Weekli s'affiche, puis GitHub, puis le retour dans Claude avec le connecteur actif.
- [RM] Le même parcours fonctionne depuis Claude desktop.
- [TA] Un appel `/mcp` sans token renvoie `401` avec les métadonnées OAuth (RFC 9728).
- [TA] Les props MCP contiennent `id`, `login`, `nom` et le token GitHub **chiffré** ; aucun email (audit m1, M2).

**US-M2** En tant que développeur, je veux demander « fais mes posts de la semaine » à Claude, afin d'obtenir 2 ou 3 posts tirés de mes vrais commits.
- [RM] Claude appelle `lire_style`, `activite_github`, puis `details_repo` ou `details_commit`, et rend 2 ou 3 posts de 800 à 1300 caractères, sans tiret long, sans fait inventé.
- [TA] `activite_github` respecte les plafonds (10 repos, 30 commits par repo) et exclut forks et bruit (tests existants).

**US-M3** En tant que développeur, je veux que Claude écrive dans mon style mémorisé sans que je recolle mes anciens posts, afin de gagner du temps.
- [TA] Le prompt `posts_semaine` sans argument `style` inclut le style stocké s'il existe.
- [RM] Après `sauver_style`, une nouvelle conversation Claude produit des posts qui respectent le profil (longueur, ton, emojis).

**US-M4** En tant que développeur, je veux retrouver sur le site les brouillons rédigés dans Claude, afin de les relire et les marquer publiés.
- [TA] `sauver_brouillons` puis `GET /api/brouillons` avec la session du même compte GitHub (même **id numérique**) renvoie les posts.
- [TA] Un compte GitHub renommé garde ses brouillons ; un nouveau compte qui reprend l'ancien login ne les voit pas (audit M3).

**US-M5** En tant que développeur, je veux demander « fais la pub de mon projet X » dans Claude, afin d'obtenir un script de pub prêt à rendre sur le site.
- [RM] Claude appelle `preparer_pub`, pose les **3 questions** (pour qui, quel problème, quelle promesse) si l'utilisateur n'y a pas répondu, regarde le site avec `capturer_site` si un domaine est vérifié, écrit le script, appelle `sauver_pub` et donne le lien du studio.
- [TA] `sauver_pub` rejette un script sans scène `revelation` ni `fin`, tronque les textes trop longs et renvoie la liste des avertissements.
- [TA] Le script enregistré ne contient aucun type de scène hors catalogue (aucune scène code, terminal, commit ou chiffre de développement).

**US-M6** En tant que développeur, je veux que Claude retrouve et corrige une pub déjà écrite, afin d'itérer sans repartir de zéro.
- [TA] `lister_pubs` renvoie les pubs du compte (id, titre, projet, date) ; `lire_pub` renvoie le script complet ; `sauver_pub` avec `id` remplace la pub existante.

### 4.2 Pub vidéo du projet (priorité 1)

**US-P1** En tant que développeur, je veux répondre à 3 questions simples, afin que la pub parle de la valeur de mon projet et pas de sa technique.
- [RM] Le studio affiche les 3 questions avec un exemple sous chacune (voir `design.md`, section 9.2), 300 caractères maximum chacune, toutes obligatoires.
- [TA] `scriptPubDepuisReponses` (sans IA) produit un script valide de 8 à 14 scènes (10 à 14 en pratique : la scène `preuve`, masquée par défaut, est toujours présente) à partir des 3 réponses et des détails du repo.
- [RM] Un projet sans capture produit une pub trop courte (9 scènes visibles, environ 46 s au mieux, avec avertissements de durée et de voix). Le studio demande donc au moins une capture (importée, ou prise sur un domaine vérifié) avant d'appeler le script de départ.

**US-P2** En tant que développeur, je veux choisir le projet parmi mes repos publics, même sans commit récent, afin de faire la pub d'un projet terminé.
- [TA] `GET /api/repos` liste jusqu'à 30 repos publics non forkés, triés par dernière activité.

**US-P3** En tant que développeur, je veux que la pub reprenne les couleurs et le logo de **mon** projet, afin qu'elle ressemble à ma marque et pas à Weekli.
- [RM] Le studio propose 3 couleurs extraites de la première capture, modifiables ; le logo est un monogramme généré ou une image importée (SVG, PNG, WebP, 512 Ko maximum).
- [TA] `paletteDepuisMarque` garantit un contraste de 4,5:1 minimum entre texte courant et fond, et de 3:1 pour les textes de 48 px et plus, sur fond sombre comme sur fond clair.
- [RM] Aucun élément aux couleurs ou au nom de Weekli dans la pub, hors mention facultative « Fait avec Weekli » désactivable dans la scène de fin (désactivée par défaut).

**US-P4** En tant que développeur, je veux une pub au niveau de la référence Stepwize, afin qu'elle donne envie de cliquer.
- [RM] La pub suit la narration tension, rupture, révélation, parcours en étapes, résultat, preuve, appel, fin (voir `design.md`, section 8).
- [RM] Typographie cinétique mot par mot, mot clé surligné, alternance fond sombre de marque et fond clair, transitions glitch, flou et pixels, révélation du nom avec pixels et rayons.
- [RM] 16:9, 1920 × 1080, 30 images par seconde, 50 à 65 secondes.
- [RM] Soufiane valide une pub de démonstration comme « comparable à la référence » (définition de « fini » du brief).

**US-P5** En tant que développeur, je veux que les captures de mon site deviennent des cartes animées, afin de montrer mon produit sans le redessiner.
- [TA] Une scène `etape` qui référence une capture la charge via `POST /api/captures` (domaine vérifié) et l'affiche recadrée selon `cadrage`.
- [RM] Sans domaine vérifié, je peux importer mes propres images ; elles ne quittent pas mon navigateur.
- [RM] Les captures ne sont jamais stockées par le serveur (garantie existante).

**US-P6** En tant que développeur, je veux ajuster chaque scène (textes, voix, ordre, durée, transition) et voir le résultat tout de suite, afin de corriger sans régénérer.
- [RM] L'aperçu se met à jour en moins de 300 ms après une modification de texte.
- [RM] Monter, descendre, masquer ou dupliquer une scène ; les règles de structure (révélation présente, fin en dernier) sont signalées sans bloquer l'édition.
- [TA] Les modifications sont enregistrées par `PUT /api/pubs/:id` (sauvegarde différée de 2 s après la dernière frappe).

**US-P7** En tant que développeur, je veux une voix off féminine française et une musique, gratuites, afin que la pub soit complète.
- [RM] La voix se génère dans le navigateur, sans envoi du texte à un tiers (option recommandée, voir ADR-07) ; une barre de progression s'affiche ; une seconde génération du même texte est instantanée (cache).
- [RM] Je peux importer ma propre voix off (fichier audio) à la place.
- [TA] Le dictionnaire de prononciation remplace les mots listés avant la synthèse (« GitHub » vers « Guite-heub »).
- [RM] La musique est générée par le code, libre de droits, et baisse sous la voix.

**US-P8** En tant que développeur, je veux exporter la pub en MP4 et des sous-titres, afin de la publier sur LinkedIn.
- [RM] Chrome et Edge desktop : MP4 H.264 et AAC, 1920 × 1080. Autres navigateurs : WebM VP9 et Opus, ou message clair si WebCodecs manque.
- [RM] Fichier `.srt` téléchargeable, calé sur la voix off.
- [RM] Une pub de 60 s s'exporte en moins de 3 minutes sur un portable récent, avec progression et annulation.
- [TA] La durée du fichier exporté égale la somme des durées de la timeline à une image près.

**US-P9** En tant que développeur sans clé API ni Claude sous la main, je veux un script de départ automatique, afin de tester le studio.
- [TA] Le bouton « Script de départ » appelle `scriptPubDepuisReponses` et ne fait aucun appel réseau hors Weekli.

### 4.3 Style d'écriture mémorisé (priorité 2)

**US-S1** En tant que développeur, je veux enregistrer quelques-uns de mes posts et un profil de style, afin que Claude et le site écrivent comme moi.
- [TA] `PUT /api/style` puis `GET /api/style` renvoie le même contenu ; la valeur est chiffrée dans KV sous `style:<id>`, avec la conservation de 90 jours.
- [TA] `exemples` limité à 8000 caractères, `profil` à 2000, caractères de contrôle retirés.

**US-S2** En tant qu'utilisateur de Claude, je veux dire « mémorise mon style à partir de ces posts », afin que Claude en tire un profil réutilisable.
- [RM] Claude appelle `sauver_style` avec les exemples et un profil rédigé par lui (ton, longueur, tournures, emojis).

**US-S3** En tant qu'utilisateur du site, je veux que mon ancien style stocké dans le navigateur soit repris, afin de ne rien perdre.
- [RM] À la première visite de Réglages après la mise à jour, le style présent en `localStorage` est envoyé au serveur s'il n'y en a pas, puis retiré du navigateur.

### 4.4 RGPD (priorité 2)

**US-R1** En tant qu'utilisateur, je veux que mes données soient effacées automatiquement après 90 jours sans modification, afin de ne pas laisser de traces.
- [TA] Toute écriture de `brouillons:`, `domaines:`, `style:`, `pubs:` porte `expirationTtl` de 90 jours (déjà fait pour brouillons et domaines).
- [TA] Les entrées d'historique (brouillons, pubs) plus vieilles que 90 jours sont retirées à la lecture, même si la clé a été renouvelée.

**US-R2** En tant qu'utilisateur, je veux supprimer toutes mes données en un clic, afin d'exercer mon droit à l'effacement.
- [TA] `DELETE /api/moi/donnees` efface tout ce qui est listé dans `api-contract.md` (section 3.1) : données KV, toutes les sessions du compte, autorisations MCP, Durable Objects, autorisation GitHub. Réponse `204`, cookie effacé.
- [TA] Après l'appel, un token MCP émis avant renvoie `401`.
- [RM] Le texte du panneau et de la page Confidentialité décrit exactement ce qui est effacé.

**US-R3** En tant qu'utilisateur, je veux télécharger mes données, afin d'exercer mon droit d'accès et de portabilité.
- [TA] `GET /api/moi/donnees` renvoie un JSON (profil, brouillons, pubs, style, domaines) avec `Content-Disposition: attachment`.

**US-R4** En tant que visiteur, je veux une page de confidentialité exacte et complète, afin de savoir ce que Weekli fait de mes données.
- [RM] La page contient le tableau de la section 5 ci-dessous, les sous-traitants, les transferts hors UE, un contact privé.
- [RM] Aucune requête vers un domaine tiers au chargement du site (polices hébergées localement, audit M4).

### 4.5 Mode site avec clé API (priorité 3, bonus)

**US-K1** En tant qu'utilisateur du site, je veux continuer à générer mes posts avec ma clé API, afin de garder le mode existant.
- [RM] La génération utilise le style stocké côté serveur (et plus `localStorage`).
- [RM] La clé reste dans le navigateur (aucun changement).

**US-K2** En tant qu'utilisateur du site avec clé API, je veux que Claude écrive le script de pub depuis le studio, afin de ne pas passer par le connecteur.
- [RM] Bouton « Écrire avec Claude » : sortie JSON structurée selon `SCHEMA_SCRIPT_PUB`, nettoyée par `nettoyerScriptPub`, captures envoyées en images si l'utilisateur coche « montrer mes captures à Claude ».

## 5. Données personnelles (contenu pour la page Confidentialité)

Proposition de l'architecte, à valider par Soufiane (et idéalement relue par un juriste, comme le recommande l'audit M5).

| Traitement | Données | Où | Durée | Base légale proposée |
|---|---|---|---|---|
| Connexion au site | id GitHub, login, nom, avatar, token GitHub (`read:user`) | KV `session:*`, chiffré | 8 h | Exécution du service (art. 6.1.b) |
| Connecteur MCP | id GitHub, login, nom, token GitHub chiffré | Grants OAuth (KV), Durable Object | Grant : 30 jours non renouvelés ; DO : 24 h d'inactivité | Exécution du service |
| Historique des posts | Brouillons | KV `brouillons:<id>`, chiffré | 90 jours après la dernière écriture, entrées de plus de 90 jours purgées | Exécution du service |
| Pubs vidéo | Scripts (textes, couleurs, adresses de pages) | KV `pubs:<id>`, chiffré | Idem | Exécution du service |
| Style d'écriture | Exemples de posts, profil | KV `style:<id>`, chiffré | 90 jours après la dernière écriture | Exécution du service |
| Domaines vérifiés | Noms de domaine, date | KV `domaines:<id>`, chiffré | Idem | Exécution du service |
| Captures | Image de la page | Non stockée | Aucune | Exécution du service |
| Voix off, logo, images importées | Fichiers audio et image | Navigateur uniquement (IndexedDB) | Jusqu'à effacement par l'utilisateur | Sans objet (aucun traitement serveur) |
| Lutte contre les abus | Adresse IP, id GitHub | Limiteur de débit Cloudflare, journaux Workers | 60 s ; journaux selon la rétention Cloudflare | Intérêt légitime (art. 6.1.f) |
| Mode clé API | Clé, commits, diffs | Navigateur, puis Anthropic à l'initiative de l'utilisateur | Onglet ou jusqu'à effacement | Exécution du service |

Sous-traitants et destinataires :

| Acteur | Rôle | Localisation | Transfert hors UE |
|---|---|---|---|
| Cloudflare, Inc. | Hébergement Workers, KV, Durable Objects, Browser Run (captures), journaux | États-Unis, réseau mondial | Data Privacy Framework UE-États-Unis, clauses contractuelles types (DPA Cloudflare) |
| GitHub, Inc. | Identification OAuth, lecture des repos publics | États-Unis | DPF (Microsoft) |
| Anthropic | Mode clé API uniquement, appelé directement par le navigateur | États-Unis | À l'initiative de l'utilisateur, selon les conditions de son compte Anthropic |

Point à vérifier par Soufiane : l'inscription effective de chaque société au DPF au moment du déploiement. Contact privé à fournir (adresse dédiée) : voir questions dans `docs/handoff/architecte.md`.

## 6. Exigences non fonctionnelles

| Sujet | Exigence |
|---|---|
| Coût | 0 € : offre gratuite Cloudflare, aucun service payant, aucune IA côté serveur |
| Sécurité | Règles de `docs/securite.md` ; aucune nouvelle origine tierce dans la CSP |
| Performance site | LCP inférieur à 2,5 s sur l'accueil en 4G ; le studio et le moteur vocal sont chargés à la demande |
| Accessibilité | WCAG 2.1 AA sur le site ; pub lisible sans le son (le texte à l'écran porte le message), sous-titres `.srt` |
| Mouvement | `prefers-reduced-motion` respecté sur le site et dans l'aperçu du studio (l'export, lui, reste animé) |
| Typographie | Aucun tiret long ni moyen dans le code, les docs, l'interface, les scripts de pub |
| Vanilla | HTML, CSS et JS séparés, aucun style inline statique, aucun CSS-in-JS |
| Tests | Logique métier de `@weekli/core` couverte (validation des scripts, timeline, palette, style) |
