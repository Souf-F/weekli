# Contrat d'API

Mis à jour le 2026-10-24. Source de vérité entre le front, le serveur et Claude. Toute évolution passe par ce fichier avant le code. Les types sont exportés par `@weekli/core` sous les mêmes noms.

Légende des statuts : **existant** (déjà en place, comportement à préserver), **modifié** (existe, change en V1), **V1** (à créer).

## 1. Règles communes

### 1.1 API JSON du site (`/api/*`)

| Règle | Détail |
|---|---|
| Authentification | Cookie de session `HttpOnly` (`__Host-weekli` en HTTPS, `weekli` en local). Sans session valide : `401 {"erreur": "Non connecte"}` |
| Identité | Toujours l'**id GitHub numérique** de la session, jamais un identifiant passé en paramètre (ADR-01) |
| Écriture | Toute méthode autre que `GET`, `HEAD`, `OPTIONS` exige l'en-tête `Origin` égal à l'origine du site, sinon `403` texte `Origine refusee` |
| Débit | 60 requêtes par minute et par utilisateur (clé `api:<id>`) : `429 {"erreur": "Trop de requetes, reessaie dans une minute"}` |
| Corps | JSON, 64 Ko maximum : `413 {"erreur": "Requete trop volumineuse"}` |
| Erreurs | Toujours `{"erreur": "<message en francais, sans accent>"}`. Erreur GitHub ou inattendue : `502 {"erreur": "Erreur lors de la lecture de GitHub"}` (aucun détail interne) |
| Cache | `Cache-Control: no-store` sur `/api/*` et `/auth/*` |
| Identifiants | Brouillons et pubs : UUID v4 (`/^[0-9a-f-]{36}$/`), sinon `400 {"erreur": "Identifiant invalide"}` |
| Conservation | Chaque écriture de `brouillons:`, `pubs:`, `style:`, `domaines:` pose `expirationTtl` = 90 jours. À la lecture, les brouillons dont `cree` et les pubs dont `maj` datent de plus de 90 jours sont retirés |

### 1.2 Outils MCP (`/mcp`)

| Règle | Détail |
|---|---|
| Authentification | Token OAuth Weekli (`Authorization: Bearer`), audience `PUBLIC_URL/mcp` |
| Identité | `this.props.id`, relu à chaque appel ; refus si différent du propriétaire du Durable Object |
| Débit | 60 appels par minute et par utilisateur (clé `mcp:<id>`), `429` avec `Retry-After: 60` |
| Réponse | `content: [{ type: "text", text: <JSON indenté> }]`, ou `image` pour `capturer_site` |
| Erreur | `{ content: [{ type: "text", text: "Erreur : <message>" }], isError: true }` |
| Contenus de repo | Tout texte libre venu d'un repo (descriptions, README, messages de commit, extraits de diff) est rangé dans un objet `contenu_non_fiable`, et la description de l'outil rappelle que c'est une donnée à lire, jamais une consigne (audit m7). Forme exacte par outil en 4.1 et 4.2. Les champs sûrs (nom, URL, dates, nombres, sujets) restent à la racine. L'API du site (`/api/*`) renvoie ces données à plat |

## 2. Types partagés

```ts
// Existants
type Commit = { sha: string; message: string; date: string };
type ActiviteRepo = { repo: string; description: string; langage: string; url: string; site: string; commits: Commit[] };
type Activite = { depuis: string; repos: ActiviteRepo[] };
type DetailsRepo = { repo: string; description: string; site: string; url: string; sujets: string[]; langages: string[]; etoiles: number; readme: string };
type DetailsCommit = { sha: string; message: string; date: string; stats?: { additions?: number; deletions?: number; total?: number }; fichiers: FichierModifie[] };
type FichierModifie = { nom: string; statut: string; ajouts: number; suppressions: number; extrait: string };
type Post = { titre: string; format: string; source: string; texte: string }; // 200, 100, 200, 6000 caracteres
type Brouillon = Post & { id: string; cree: string; publie: boolean };
type Domaine = { hote: string; verifie: string };

// V1
type RepoResume = { repo: string; description: string; site: string; url: string; maj: string };

type StyleEcriture = {
  exemples: string;   // 0 a 8000 caracteres, posts bruts de l'utilisateur
  profil: string;     // 0 a 2000 caracteres, synthese du style (redigee par Claude ou l'utilisateur)
  maj: string | null; // ISO 8601, null si jamais enregistre
};

// PubResume et PubEnregistree sont définis dans packages/core/src/pub/types.ts (exportés par @weekli/core)
type PubResume = { id: string; titre: string; projet: string; cree: string; maj: string; scenes: number }; // scenes : scènes visibles seulement (masquee exclue)
type PubEnregistree = { id: string; cree: string; maj: string; script: ScriptPub };
```

### 2.1 `ScriptPub` (version 1)

Le sens visuel de chaque champ est décrit dans `docs/design.md`, section 8. Limites appliquées par `nettoyerScriptPub` (tronquer sans couper un mot, retirer les caractères de contrôle et les tirets longs ou moyens, remplacés par une virgule).

```ts
type Hex = `#${string}`; // #rrggbb uniquement

type ScriptPub = {
  version: 1;
  titre: string;                       // 80, nom de la pub dans le studio
  projet: {
    nom: string;                       // 40, nom affiche dans la revelation
    repo: string;                      // nom du repo GitHub public (NOM_REPO)
    lien: string;                      // 120 maximum, URL https affichee en fin (site, page GitHub) ; au-dela : rejet, jamais tronque
  };
  reponses: {
    pourQui: string;                   // 300
    probleme: string;                  // 300
    promesse: string;                  // 300
  };
  marque: {
    primaire: Hex;                     // obligatoire
    accent?: Hex;                      // defaut : primaire (ou couleur extraite de la capture si la marque est grise, sinon #3d4bff), ajustee en luminosite pour le contraste ; invalide : ignore avec avertissement
    alerte?: Hex;                      // defaut : #e5484d (mots de tension) ; invalide : ignore avec avertissement
    logo: "monogramme" | "image";      // "image" : fichier importe dans le navigateur, jamais dans le script
    monogramme?: string;               // 1 ou 2 caracteres, defaut : initiale du nom
    typo: "nette" | "editoriale";      // defaut "nette"
  };
  voix: {
    mode: "synthese" | "importee" | "aucune";
    vitesse: number;                   // 0.85 a 1.2, defaut 1
    prononciation: Record<string, string>; // 20 entrees max, cle et valeur 40 caracteres
  };
  musique: "energique" | "calme" | "aucune";
  gestes?: Geste[];                    // 2 a 3 gestes distincts parmi la bibliotheque (design.md 8.16) ; absent : defauts du catalogue
  captures: CaptureRef[];              // 0 a 6
  scenes: ScenePub[];                  // 8 a 14
};

type CaptureRef = {
  id: string;                          // /^[a-z0-9-]{1,24}$/, unique
  source: "site" | "importee";         // "importee" : image locale, fournie dans le studio
  url?: string;                        // obligatoire si source "site" : https, domaine verifie
  format: "bureau" | "mobile";
  legende?: string;                    // 60, ex. "Accueil"
};

type Cadrage = "haut" | "milieu" | "bas" | "complet" | { x: number; y: number; largeur: number; hauteur: number }; // fractions 0 a 1

type MotsAccent = { texte: string; accent?: string }; // accent : partie de texte a colorer ou surligner, doit etre contenue dans texte

type Transition = "coupe" | "glitch" | "flou" | "pixels";

type Geste = "accent" | "surlignage" | "soulignement" | "frappe" | "impact" | "lettres" | "glitch" | "pixels" | "flou" | "rayons";
type But = "lire" | "comprendre" | "montrer";

type SceneCommune = {
  id: string;                          // /^[a-z0-9-]{1,24}$/, unique
  voix: string;                        // 0 a 220 caracteres, lu par la voix off
  duree?: number;                      // secondes, utilisee seulement sans voix ; bornee par type
  transition?: Transition;             // transition d'entree, defaut selon le type
  but?: But;                           // regle la pause de lecture (design.md 8.16) ; defaut selon le type (lire, comprendre ou montrer)
  masquee?: boolean;                   // presente dans le script mais pas rendue
};

type ScenePub = SceneCommune & (
  | { type: "ouverture"; moment: string /*14*/; detail?: string /*30*/ }
  | { type: "repetition"; lignes: MotsAccent[] /*2 a 3, 30*/; impact: string /*14*/; carte?: { titre: string /*30*/; detail?: string /*40*/ } }
  | { type: "boucle"; phrase: MotsAccent /*70*/; reperes: string[] /*2 a 4, 14*/; carte: { titre: string /*30*/; detail?: string /*40*/ } }
  | { type: "chorus"; titre: MotsAccent /*50*/; chute: MotsAccent /*50*/; bulles: string[] /*3 a 6, 28*/ }
  | { type: "rupture"; texte: MotsAccent /*80*/ }
  | { type: "revelation"; slogan: MotsAccent /*60*/; signature?: string /*30*/ }
  | { type: "etape"; titre: MotsAccent /*50*/; texte?: string /*110*/; filigrane: string /*14*/; onglet: string /*14*/;
      visuel:
        | { type: "capture"; capture: string; cadrage?: Cadrage; focus?: { x: number; y: number; largeur: number; hauteur: number } }
        | { type: "liste"; titre: string /*30*/; elements: string[] /*2 a 4, 40*/ } }
  | { type: "resultat"; titre: MotsAccent /*50*/; avant: string /*24*/; tampon: string /*12*/; apres: string /*24*/; chute?: MotsAccent /*70*/ }
  | { type: "preuve"; surtitre: string /*30*/; elements: string[] /*1 a 4, 30*/; cartes?: { titre: string /*30*/; texte?: string /*60*/ }[] /*0 a 3*/ }
  | { type: "appel"; question: MotsAccent /*70*/; badge?: MotsAccent /*30*/; action: string /*20*/; bouton: string /*30*/ }
  | { type: "fin"; slogan?: string /*40*/; bouton?: string /*30*/; liens: string[] /*1 a 2, 40*/; mentionWeekli?: boolean /*defaut false*/ }
);
```

Règles de structure (avertissement si non respectées, rejet si marqué « rejet ») :

| Règle | Effet |
|---|---|
| 8 à 14 scènes | rejet hors bornes, y compris au-dessus de 14 (tronquer risquerait de couper la `fin`) |
| Au moins une scène `revelation` non masquée (une révélation masquée ne compte pas) | rejet |
| Dernière scène non masquée de type `fin` | rejet |
| `etape` : 2 à 4 scènes, numérotées automatiquement dans l'ordre (`ÉTAPE 01 / 04`) | avertissement au-delà de 4, les suivantes sont masquées. Une seule étape : aucun avertissement |
| Une capture référencée doit exister dans `captures` | la scène passe en `visuel: liste` vide (`elements: []`, `titre: ""`), avertissement. Le moteur n'affiche alors que le titre de l'étape ; le script de départ (`preparer_pub`, studio) ne doit jamais produire ce cas |
| Voix totale de 120 à 170 mots | avertissement |
| Durée totale estimée de 50 à 65 s | avertissement |
| Texte qui ressemble à du code ou à une commande (accent grave, signe dollar, ou mots `npm`, `git`, `commit`, `const`, `function`) | avertissement « la pub ne montre pas de code » |
| Taille JSON après nettoyage supérieure à 24 Ko | rejet |
| `gestes` : identifiants inconnus ou en double | retirés, avertissement |
| `gestes` : plus de 3 identifiants valides | les 3 premiers sont gardés, avertissement |
| `gestes` : moins de 2 identifiants valides, ou valeur qui n'est pas une liste | champ ignoré (défauts du catalogue), avertissement |
| Transition `glitch`, `flou` ou `pixels` d'une scène visible absente de `gestes` (quand `gestes` est présent) | avertissement, rien n'est retiré |
| `but` hors de `lire`, `comprendre`, `montrer` | champ ignoré (but par défaut du type), avertissement |

Autres règles appliquées par `nettoyerScriptPub` :

- `projet.lien` de plus de 120 caractères : rejet (une URL tronquée serait invalide). Même principe pour l'URL d'une capture `site` (500 caractères maximum). La vérification du domaine reste côté serveur.
- `marque.accent` ou `marque.alerte` invalide : ignoré avec un avertissement. `marque.primaire` invalide : rejet.
- Accent par défaut : calculé par `paletteDepuisMarque(marque, accentParDefaut?)`. Le paramètre optionnel `accentParDefaut` est la couleur la plus saturée extraite de la capture (fournie par le navigateur) ; il ne sert que si la marque est presque grise (chroma inférieure à 0,03). Sans lui : `#3d4bff`. Détail dans `docs/design.md` 8.4.
- Durée totale estimée : somme des durées de scène moins les chevauchements de transition (`docs/design.md` 8.8 et 8.13).

Risques connus :

- **Limite de 24 Ko** : avec du texte latin, elle est pratiquement inatteignable (les limites de champs la maintiennent très en dessous). Elle ne se déclenche qu'avec des caractères multi-octets (emoji, CJK). Elle protège le stockage, pas le quotidien.
- **`voix.prononciation` et sortie structurée stricte** : `SCHEMA_SCRIPT_PUB` y décrit un objet à clés libres (`additionalProperties: { type: "string" }`), ce qu'un mode strict de sortie structurée peut refuser. Les bornes (longueurs, tailles de tableaux) ne figurent pas non plus dans le schéma : `nettoyerScriptPub` les applique. À vérifier à l'intégration de la génération (B9) ; repli possible : tableau de paires `{ mot, lecture }` converti en objet après la génération.

`nettoyerScriptPub(entree: unknown): { script: ScriptPub | null; avertissements: string[]; erreurs: string[] }`.

## 3. API JSON du site

### 3.1 Compte

#### `GET /api/moi` : modifié

Réponse `200` :

```json
{ "id": "583231", "login": "Souf-F", "nom": "Soufiane Filali", "avatar": "https://avatars.githubusercontent.com/u/583231" }
```

#### `GET /api/moi/donnees` : V1 (export)

Réponse `200`, en-têtes `Content-Type: application/json` et `Content-Disposition: attachment; filename="weekli-donnees.json"` :

```json
{
  "exporte": "2026-10-24T15:00:00.000Z",
  "profil": { "id": "583231", "login": "Souf-F", "nom": "Soufiane Filali" },
  "brouillons": [{ "id": "6f0c...", "titre": "Mon audit SSL", "format": "retour", "source": "scanner-ssl", "texte": "...", "cree": "2026-10-20T08:00:00.000Z", "publie": false }],
  "pubs": [{ "id": "a1b2...", "cree": "2026-10-22T10:00:00.000Z", "maj": "2026-10-23T09:12:00.000Z", "script": { "version": 1 } }],
  "style": { "exemples": "...", "profil": "...", "maj": "2026-10-21T12:00:00.000Z" },
  "domaines": [{ "hote": "scanner-ssl.dev", "verifie": "2026-10-10T09:00:00.000Z" }],
  "conservation": "90 jours apres la derniere modification"
}
```

Le token GitHub n'est jamais exporté. Erreurs : `401`, `429`.

#### `DELETE /api/moi/donnees` : modifié (effacement complet)

Corps : aucun. Exige `Origin`. Effets, dans l'ordre (ADR-02), chaque étape tentée même si une précédente échoue :

| # | Effet | Détail |
|---|---|---|
| 1 | Données KV | Supprime `brouillons:<id>`, `pubs:<id>`, `style:<id>`, `domaines:<id>`, et les anciennes clés par login tant que la migration ADR-01 existe |
| 2 | Autorisations MCP | `OAUTH_PROVIDER.listUserGrants(id)` puis `revokeGrant` pour chacune : tokens d'accès et de rafraîchissement de Claude invalidés |
| 3 | Durable Objects | Pour chaque nom listé dans `mcp:<id>` : RPC `detruire()` (`this.destroy()`), puis suppression de `mcp:<id>` |
| 4 | Autorisation GitHub | `DELETE https://api.github.com/applications/{client_id}/grant`, corps `{ "access_token": <token de la session> }` : révoque tous les tokens de l'app pour ce compte |
| 5 | Sessions | Supprime toutes les sessions listées dans `sessions:<id>`, puis l'index, puis le cookie (`Set-Cookie` expiré). **Non tentée si l'étape 1 a échoué** : les sessions sont alors gardées, y compris la session courante et son cookie, pour que l'utilisateur puisse relancer l'effacement |

Réponses :

| Code | Cas |
|---|---|
| `204` | Étapes 1 et 5 réussies (les échecs des étapes 2 à 4 sont journalisés sans donnée personnelle, l'expiration naturelle prend le relais : 30 jours au plus pour un grant, 24 h pour un DO) |
| `401` | Pas de session : rien n'est supprimé |
| `403` | `Origin` absente ou étrangère |
| `429` | Débit dépassé |
| `500 {"erreur": "Suppression incomplete, reessaie"}` | Étape 1 (KV) ou 5 en échec. Les sessions sont gardées (et le cookie n'est pas expiré), ce qui permet de relancer ; l'appel est idempotent |

### 3.2 GitHub

| Méthode | Route | Statut | Réponse `200` | Erreurs |
|---|---|---|---|---|
| GET | `/api/activite?jours=7` | existant | `Activite` (1 à 30 jours, bornés) | `401`, `429`, `502` |
| GET | `/api/repos` | **V1** | `RepoResume[]` : 30 repos publics au plus, sans forks, triés par `maj` décroissant | `401`, `429`, `502` |
| GET | `/api/repos/:repo` | existant | `DetailsRepo` (README 6000 caractères max) | `400 {"erreur":"Nom de repo invalide"}`, `404`, `502` |
| GET | `/api/repos/:repo/commits/:sha` | existant | `DetailsCommit` | `400 {"erreur":"Parametres invalides"}`, `404`, `502` |

Exemple `GET /api/repos` :

```json
[
  { "repo": "scanner-ssl", "description": "Audit de surface d'attaque", "site": "https://scanner-ssl.dev", "url": "https://github.com/Souf-F/scanner-ssl", "maj": "2026-10-20T18:02:11Z" }
]
```

### 3.3 Brouillons de posts (existants)

| Méthode | Route | Corps | Réponse | Erreurs |
|---|---|---|---|---|
| GET | `/api/brouillons` | | `200 Brouillon[]` (100 max, plus récents d'abord, plus de 90 jours exclus) | `401` |
| POST | `/api/brouillons` | `{ "posts": Post[] }` (5 max) | `201 Brouillon[]` (créés) | `400 {"erreur":"Aucun post valide"}`, `413` |
| PATCH | `/api/brouillons/:id` | `{ "texte"?: string, "publie"?: boolean }` | `200 Brouillon` | `400` (id ou texte vide), `404` |
| DELETE | `/api/brouillons/:id` | | `204` | `400`, `404` |

### 3.4 Style d'écriture : V1

#### `GET /api/style`

`200` (jamais `404`, valeurs vides si rien n'est enregistré) :

```json
{ "exemples": "Cette semaine j'ai enfin...\n---\nTrois choses apprises...", "profil": "Phrases courtes, tutoiement, une question en accroche, un emoji maximum, pas de jargon.", "maj": "2026-10-21T12:00:00.000Z" }
```

#### `PUT /api/style`

Corps : `{ "exemples"?: string, "profil"?: string }` (au moins un des deux). Les champs absents sont conservés. Nettoyage par `nettoyerStyle` (8000 et 2000 caractères, contrôles retirés).

`200` : le `StyleEcriture` enregistré. Erreurs : `400 {"erreur":"Style vide"}` si les deux champs résultants sont vides (utiliser `DELETE`), `413`.

#### `DELETE /api/style`

`204`, idempotent.

### 3.5 Pubs vidéo : V1

| Méthode | Route | Corps | Réponse | Erreurs |
|---|---|---|---|---|
| GET | `/api/pubs` | | `200 PubResume[]` (20 max, `maj` décroissant) | `401` |
| GET | `/api/pubs/:id` | | `200 PubEnregistree` | `400`, `404` |
| POST | `/api/pubs` | `{ "script": ScriptPub }` | `201 { "pub": PubEnregistree, "avertissements": string[] }` | `400 {"erreur":"Script invalide","details":[...]}`, `409 {"erreur":"20 pubs au maximum, supprime une ancienne pub"}`, `413` |
| PUT | `/api/pubs/:id` | `{ "script": ScriptPub }` | `200 { "pub": PubEnregistree, "avertissements": string[] }` | `400`, `404`, `413` |
| DELETE | `/api/pubs/:id` | | `204` | `400`, `404` |

Exemple `POST /api/pubs`, réponse `201` :

```json
{
  "pub": { "id": "0b6f8d5e-6a51-4c0e-9d0e-3f3b2c1a9e77", "cree": "2026-10-24T15:00:00.000Z", "maj": "2026-10-24T15:00:00.000Z", "script": { "version": 1, "titre": "Pub Scanner SSL" } },
  "avertissements": ["Voix totale de 182 mots : vise 120 a 170 mots pour tenir en 60 s"]
}
```

`details` de l'erreur `400` reprend `erreurs` de `nettoyerScriptPub`, en français sans données internes.

### 3.6 Domaines vérifiés et captures (existants, clés par id)

| Méthode | Route | Corps | Réponse | Erreurs |
|---|---|---|---|---|
| GET | `/api/domaines` | | `200 Domaine[]` | `401` |
| POST | `/api/domaines/preparer` | `{ "hote": "monsite.dev" }` | `200 { hote, dns: { nom, type: "TXT", valeur }, fichier: { url, contenu } }` (rien n'est enregistré) | `400 {"erreur":"Nom de domaine invalide (exemple : monsite.dev)"}` |
| POST | `/api/domaines/verifier` | `{ "hote" }` | `200 Domaine[]` | `400`, `422 {"erreur":"Preuve introuvable..."}`, `429` (5 par minute) |
| DELETE | `/api/domaines/:hote` | | `204` | `400` |
| POST | `/api/captures` | `{ "url": "https://...", "format": "bureau" \| "mobile" }` | `200 image/jpeg` (1280 × 800, ou 390 × 844 en densité 2), jamais stockée | `400 {"erreur":"<raison>"}` (domaine non vérifié, redirection...), `429` (5 par minute) |

Le jeton de vérification devient `HMAC(secret, "<id>:<hote>")` (ADR-01) : les domaines vérifiés avant la migration devront être revérifiés à la prochaine revérification (audit m5).

### 3.7 Authentification du site (`/auth/*`)

| Méthode | Route | Statut | Comportement |
|---|---|---|---|
| GET | `/auth/login` | existant | Redirection GitHub (PKCE, state lié au navigateur) |
| GET | `/auth/callback` | modifié | Crée la session `{ id, login, nom, avatar, token }`, l'ajoute à `sessions:<id>`, lance la migration ADR-01, redirige vers `/app` |
| POST | `/auth/logout` | modifié | Révoque le token chez GitHub (`DELETE /applications/{client_id}/token`), supprime la session de KV et de l'index, `204` |

## 4. Outils MCP

### 4.1 Existants

| Outil | Statut | Annotations | Entrée | Sortie |
|---|---|---|---|---|
| `activite_github` | modifié (contenu non fiable) | `readOnlyHint` | `{ jours: 1..30 = 7 }` | `{ depuis, repos: [{ repo, langage, url, site, contenu_non_fiable: { description, commits: Commit[] } }] }` |
| `details_repo` | modifié (idem) | `readOnlyHint` | `{ repo }` | `{ repo, site, url, sujets, langages, etoiles, contenu_non_fiable: { description, readme } }` |
| `details_commit` | modifié (idem, secrets masqués dans les extraits) | `readOnlyHint` | `{ repo, sha }` | `{ sha, date, stats?, contenu_non_fiable: { message, fichiers: FichierModifie[] } }` |
| `sauver_brouillons` | existant | `destructiveHint: false` | `{ posts: Post[1..5] }` | `{ enregistres, ids }` |
| `lister_brouillons` | existant | `readOnlyHint` | `{ nonPublies = true }` | `Brouillon[]` |
| `capturer_site` | existant | `readOnlyHint`, `openWorldHint` | `{ url, format = "bureau" }` | image JPEG |
| Prompt `posts_semaine` | modifié | | `{ jours?, style? }` | Message ; si `style` est absent, le style stocké (profil puis exemples) est injecté ; consigne d'appeler `lire_style` retirée dans ce cas |

Masquage des secrets dans `details_commit` : les extraits de diff passent par `masquerSecrets` (`packages/core/src/masquage.ts`) avant la troncature à 1500 caractères. Seuls des **formats de jetons connus** sont remplacés par `[secret masque]` : `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`, `sk-ant-`, clés `sk-` longues contenant un chiffre, `AKIA`, `xox`, blocs de clé privée PEM. Il n'y a volontairement **aucun motif générique** (entropie, `password=`) : trop de faux positifs sur du code. Un secret d'un autre format n'est donc pas masqué : le contenu du diff reste une donnée non fiable.

### 4.2 Nouveaux outils : V1

#### `lister_repos`

- Description : « Liste les repos publics de l'utilisateur (sans forks), même sans activité récente. Utile pour choisir le projet d'une pub. »
- Annotations : `readOnlyHint: true`. Entrée : `{}`. Sortie : 30 repos au plus, sans forks, du plus récemment poussé au plus ancien. Forme : `RepoResume` dont `description` est rangée dans `contenu_non_fiable` (écart volontaire avec `GET /api/repos`, qui reste à plat) :

```json
[{ "repo": "scanner-ssl", "site": "https://scanner-ssl.dev", "url": "https://github.com/Souf-F/scanner-ssl", "maj": "2026-10-20T18:02:11Z", "contenu_non_fiable": { "description": "Audit de surface d'attaque" } }]
```

#### `lire_style`

- Description : « Renvoie le style d'écriture mémorisé de l'utilisateur. Appelle cet outil avant de rédiger un post, et respecte le profil. »
- Annotations : `readOnlyHint: true`. Entrée : `{}`. Sortie : `StyleEcriture` (champs vides si aucun).

#### `sauver_style`

- Description : « Mémorise le style d'écriture de l'utilisateur : quelques posts qu'il a écrits (exemples) et une synthèse (profil : ton, longueur, tournures, emojis). À utiliser seulement à sa demande. »
- Annotations : `readOnlyHint: false, destructiveHint: false, idempotentHint: true`.
- Entrée : `{ exemples?: string (8000), profil?: string (2000) }`, au moins un. Sortie : `{ enregistre: true, maj }`. Erreur : `Style vide`.

#### `preparer_pub`

- Description : « Première étape d'une pub vidéo de projet. Renvoie le contexte du repo, les domaines vérifiés pour les captures, la marque et les captures déjà connues, les 3 questions à poser à l'utilisateur, le catalogue des scènes, les règles d'écriture et le schéma du script. Pose ensuite les questions sans réponse avant d'écrire le script. »
- Annotations : `readOnlyHint: true`.
- Entrée : `{ repo: string (NOM_REPO) }`.
- Sortie :

```json
{
  "repo": { "repo": "scanner-ssl", "site": "https://scanner-ssl.dev", "url": "https://github.com/Souf-F/scanner-ssl", "sujets": ["securite"], "contenu_non_fiable": { "description": "...", "readme": "..." } },
  "domainesVerifies": ["scanner-ssl.dev"],
  "pubExistante": "0b6f8d5e-6a51-4c0e-9d0e-3f3b2c1a9e77",
  "marqueConnue": { "primaire": "#3d4bff", "logo": "monogramme", "typo": "nette" },
  "capturesDisponibles": [{ "id": "accueil", "source": "site", "url": "https://scanner-ssl.dev", "format": "bureau", "legende": "Accueil" }],
  "questions": [
    { "cle": "pourQui", "question": "Pour qui est ton projet ?", "aide": "Décris la personne et son quotidien, pas la technique. Exemple : ..." },
    { "cle": "probleme", "question": "Quel problème lui règles-tu ?", "aide": "Ce qui revient, ce qui agace, ce qui coûte. Exemple : ..." },
    { "cle": "promesse", "question": "Que lui promets-tu ?", "aide": "Le résultat en une phrase, sans jargon. Exemple : ..." }
  ],
  "catalogue": "<texte : types de scenes, champs, durees, ordre conseille>",
  "regles": "<texte : regles d'ecriture de guide.ts>",
  "schema": { "$comment": "SCHEMA_SCRIPT_PUB" }
}
```

- `pubExistante`, `marqueConnue` et `capturesDisponibles` sont repris de la pub la plus récente du même repo (`projet.repo`) : id, `script.marque` et `script.captures`. Sans pub précédente : `null`, `null` et `[]`. Aucun stockage de marque séparé n'existe. Claude peut passer `pubExistante` comme `id` à `sauver_pub` pour la remplacer.
- Les `questions`, leurs aides et exemples sont les textes accentués de `QUESTIONS_PUB` (`guide.ts`), montrés tels quels à l'utilisateur. L'exemple ci-dessus abrège les exemples des aides.
- Les domaines sont revérifiés après 7 jours (`domainesRevalides`, appels DNS et HTTP, 5 s au plus), comme pour `capturer_site`.
- Erreurs : repo invalide, `Repo introuvable ou prive : Weekli ne lit que les repos publics.`

#### `sauver_pub`

- Description : « Enregistre le script d'une pub vidéo (nouveau, ou remplacement si id est fourni) et renvoie le lien du studio où l'utilisateur la rend en MP4. Jamais de code, de commit, de terminal ni de chiffre de développement dans la pub. »
- Annotations : `readOnlyHint: false, destructiveHint: false, idempotentHint: false`.
- Entrée : `{ id?: uuid, script: ScriptPub }` (validé par zod pour la forme générale, puis `nettoyerScriptPub`).
- Sortie :

```json
{ "id": "0b6f8d5e-6a51-4c0e-9d0e-3f3b2c1a9e77", "lien": "https://weekli.example/app/studio?pub=0b6f8d5e-6a51-4c0e-9d0e-3f3b2c1a9e77", "avertissements": [], "dureeEstimee": 59 }
```

- Erreurs : `Script invalide : <erreurs séparées par « ; »>` (la validation passe avant la limite), `20 pubs au maximum : supprime une ancienne pub sur le site Weekli` (l'outil ne supprime rien, il renvoie vers le site), `Pub introuvable` (id inconnu).
- `lien` = `PUBLIC_URL` + `/app/studio?pub=<id>`.
- `dureeEstimee` : voix comptée à 170 mots par minute (débit mesuré de Kokoro à vitesse 1 sur le banc : environ 188).

#### `lister_pubs`

- Annotations : `readOnlyHint: true`. Entrée : `{}`. Sortie : `PubResume[]` (`scenes` compte les scènes visibles).

#### `lire_pub`

- Annotations : `readOnlyHint: true`. Entrée : `{ id: uuid }`. Sortie : `PubEnregistree`. Erreur : `Pub introuvable`.

#### Prompt `pub_projet` : V1

- Arguments : `{ repo: string }`.
- Message : marche à suivre (appeler `preparer_pub`, poser les 3 questions, regarder le site si un domaine est vérifié, écrire le script selon les règles, appeler `sauver_pub`, donner le lien).

### 4.3 Ce que les outils ne font jamais

Aucun outil ne supprime de données de l'utilisateur, ne publie sur LinkedIn, n'écrit sur GitHub, ni n'appelle un modèle d'IA. L'effacement est réservé au site (`DELETE /api/moi/donnees`).

## 5. Fichiers statiques du modèle vocal : V1

| Méthode | Route | Réponse |
|---|---|---|
| GET | `/modeles/kokoro/manifeste.json` | `{ "version": "kokoro-82m-v1.0-int8", "sha256": "<empreinte du modele recolle>", "morceaux": [{ "fichier": "modele.000", "taille": 20971520 }], "voix": { "fichier": "ff_siwis.bin", "sha256": "..." }, "phonemiseur": { "fichier": "espeak-ng.wasm", "sha256": "..." } }` |
| GET | `/modeles/kokoro/<fichier>` | Binaire, `Cache-Control: public, max-age=31536000, immutable` |

Servis comme assets (aucun passage par le Worker, aucune session).
