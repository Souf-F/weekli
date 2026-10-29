import type { Activite, Commit, Post, RepoResume, TypePost } from "@weekli/core";

// Donnees factices du mode demonstration (developpement uniquement)
const initiales = encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#6f4e37"/><text x="32" y="42" font-family="Georgia,serif" font-size="28" text-anchor="middle" fill="#e5e4e2">AM</text></svg>`,
);

export const MOI_DEMO = {
	login: "amelie-martin",
	nom: "Amélie Martin",
	avatar: `data:image/svg+xml,${initiales}`,
};

export const ACTIVITE_DEMO: Activite = {
	depuis: "2026-10-22",
	repos: [
		{
			repo: "amelie-martin/atelier-reservations",
			description: "Réservation d'ateliers de poterie pour un studio lyonnais",
			langage: "TypeScript",
			url: "https://github.com/amelie-martin/atelier-reservations",
			site: "",
			commits: [
				{ sha: "a41c9e2", message: "fix(agenda): empêcher la double réservation d'un même créneau", date: "2026-10-28" },
				{ sha: "7be03d1", message: "feat(paiement): ajouter le règlement en trois fois avec Stripe", date: "2026-10-27" },
				{ sha: "c92f7a0", message: "perf(api): remplacer 14 requêtes SQL par une seule jointure sur la liste des ateliers", date: "2026-10-26" },
				{ sha: "05d8b63", message: "test(agenda): couvrir les fuseaux horaires d'été et d'hiver", date: "2026-10-24" },
			],
		},
		{
			repo: "amelie-martin/carnet-de-bord",
			description: "Journal de développement en Markdown",
			langage: "Astro",
			url: "https://github.com/amelie-martin/carnet-de-bord",
			site: "",
			commits: [
				{ sha: "e18b4f7", message: "docs: raconter la migration de Webpack vers Vite", date: "2026-10-25" },
				{ sha: "3a6d902", message: "style: resserrer la mesure de lecture à 65 caractères", date: "2026-10-23" },
			],
		},
		{
			repo: "amelie-martin/petit-cli",
			description: "Un outil en ligne de commande pour renommer des photos",
			langage: "Rust",
			url: "https://github.com/amelie-martin/petit-cli",
			site: "",
			commits: [{ sha: "b70e5c3", message: "feat: lire la date EXIF avant de renommer", date: "2026-10-22" }],
		},
	],
};

export const POSTS_DEMO: Post[] = [
	{
		titre: "Deux clientes ont réservé le même créneau, et c'était ma faute",
		format: "Retour d'expérience",
		source: "atelier-reservations",
		texte: `Mardi, deux clientes se sont présentées au même atelier de poterie, à la même heure, pour la même place. J'ai passé la soirée à comprendre pourquoi.

Le code vérifiait la disponibilité, puis enregistrait la réservation. Deux étapes, deux requêtes. Quand deux personnes cliquent à quelques millisecondes d'écart, les deux voient « une place libre », et les deux obtiennent leur confirmation.

Ce que j'ai changé :
→ la vérification et l'écriture se font dans une seule transaction
→ une contrainte d'unicité en base refuse le doublon, même si le code se trompe
→ l'erreur est traduite en message clair : « Ce créneau vient d'être pris, voici les suivants »

Ce que j'en retiens : un test unitaire ne voit pas ce genre de bug, parce qu'il exécute les étapes l'une après l'autre. Il a fallu un test qui lance vingt réservations en parallèle pour le reproduire. Il a échoué dix-neuf fois sur vingt avant le correctif, plus jamais après.

Et vous, quelle règle de votre métier ne protégez-vous que dans le code, et pas dans la base ?`,
	},
	{
		titre: "De Webpack à Vite : ce que j'ai réellement gagné en trois semaines",
		format: "Coulisses du projet",
		source: "carnet-de-bord",
		texte: `Il y a trois semaines, mon projet mettait 41 secondes à démarrer en local. Aujourd'hui, 1,8 seconde. Voici le récit complet, avec les détours que personne ne raconte, parce que la migration ne s'est pas faite en une après-midi comme le promettaient les tutoriels.

Le point de départ

Le projet est un site de réservation pour un studio de poterie à Lyon. Une application React de taille modeste, mais avec quatre ans d'historique : trois générations de configuration Webpack empilées, des alias de chemins définis à deux endroits, et un plugin maison pour injecter des variables d'environnement que plus personne n'osait toucher.

Première semaine : comprendre avant de remplacer

J'ai commencé par lister tout ce que Webpack faisait réellement, pas ce que je croyais qu'il faisait. Résultat : onze responsabilités. Neuf étaient couvertes par Vite sans rien écrire. Deux demandaient du travail : le plugin d'environnement, et un chargeur qui transformait des fichiers SVG en composants.

Deuxième semaine : les surprises

Les imports dynamiques ne se comportaient pas pareil. Un module que Webpack chargeait paresseusement était désormais embarqué dans le premier paquet, ce qui a fait grossir la page d'accueil de 140 ko. J'ai mis une journée entière à le voir, parce que tout fonctionnait. Seul le graphique de poids des paquets montrait l'écart.

Un deuxième piège : les variables d'environnement. Webpack les remplaçait par du texte au moment de la compilation, Vite les expose sous un autre nom et un autre préfixe. Cinq endroits du code lisaient une variable qui valait maintenant undefined, sans aucune erreur visible, juste un comportement légèrement faux.

Troisième semaine : mesurer

Démarrage à froid : de 41 s à 1,8 s. Rechargement après une modification : de 6 s à moins de 100 ms. Compilation de production : de 2 min 10 à 24 s. Poids de la page d'accueil : identique, une fois le chargement paresseux rétabli.

Ce que je referais autrement

Je listerais les responsabilités de l'outil avant de toucher à la moindre ligne. Je garderais l'ancienne configuration dans une branche pendant toute la migration, pour comparer les paquets produits. Et je prévoirais une journée de plus pour les tests visuels, parce que deux composants s'affichaient avec une police de repli et que personne ne l'a remarqué avant la recette.

Ce qui change au quotidien

Le plus grand gain n'est pas dans les chiffres. C'est que je lance le projet sans y penser. Avant, je repoussais l'ouverture du serveur de développement, je groupais mes modifications pour ne pas attendre. Maintenant j'essaie des idées en direct, et j'en garde la moitié.

Si vous hésitez : faites l'inventaire d'abord. La migration elle-même est la partie facile.

Quelle étape de votre chaîne de build n'a jamais été relue depuis qu'elle fonctionne ?`,
	},
];

// ---- Parcours par type (F16) ----

export const REPOS_DEMO: RepoResume[] = [
	{ repo: "atelier-reservations", description: "Réservation d'ateliers de poterie pour un studio lyonnais", site: "https://ateliers-lyon.example", url: "https://github.com/amelie-martin/atelier-reservations", maj: "2026-10-28T18:02:11Z" },
	{ repo: "scanner-ssl", description: "Audit de surface d'attaque des certificats d'un domaine", site: "https://scanner-ssl.example", url: "https://github.com/amelie-martin/scanner-ssl", maj: "2026-10-27T09:12:00Z" },
	{ repo: "carnet-de-bord", description: "Journal de développement en Markdown", site: "", url: "https://github.com/amelie-martin/carnet-de-bord", maj: "2026-10-25T20:40:00Z" },
	{ repo: "petit-cli", description: "Un outil en ligne de commande pour renommer des photos", site: "", url: "https://github.com/amelie-martin/petit-cli", maj: "2026-10-22T07:30:00Z" },
	{ repo: "palette-cafe", description: "Générateur de palettes à partir d'une photo de tasse", site: "", url: "https://github.com/amelie-martin/palette-cafe", maj: "2026-10-12T11:00:00Z" },
	{ repo: "mini-agenda", description: "Agenda hebdomadaire sans compte, tout dans le navigateur", site: "", url: "https://github.com/amelie-martin/mini-agenda", maj: "2026-09-30T16:20:00Z" },
	{ repo: "facture-express", description: "Factures PDF pour les artisans, en trois champs", site: "", url: "https://github.com/amelie-martin/facture-express", maj: "2026-09-14T08:05:00Z" },
	{ repo: "radio-quartier", description: "Lecteur de webradio pour une association de quartier", site: "", url: "https://github.com/amelie-martin/radio-quartier", maj: "2026-08-21T13:45:00Z" },
	{ repo: "notes-de-cours", description: "Mes fiches de révision en Markdown", site: "", url: "https://github.com/amelie-martin/notes-de-cours", maj: "2026-06-03T10:00:00Z" },
];

const COMMITS_GENERIQUES = [
	["fix: empêcher la double réservation d'un même créneau", 0],
	["feat: ajouter le règlement en trois fois", 1],
	["perf: remplacer 14 requêtes SQL par une seule jointure", 2],
	["test: couvrir les fuseaux horaires d'été et d'hiver", 4],
	["refactor: extraire le calcul des tarifs dans un module", 5],
	["docs: documenter la procédure de déploiement", 6],
	["fix: corriger l'arrondi des centimes sur les remises", 8],
	["feat: envoyer un rappel la veille de l'atelier", 10],
	["chore: passer la CI sur Node 22", 12],
	["fix: ne plus perdre le panier au rechargement", 15],
	["feat: filtrer les ateliers par niveau", 19],
	["style: harmoniser les espacements de la liste", 24],
] as const;

export function commitsDemo(repo: string, jours: number): Commit[] {
	const base = new Date("2026-10-29T12:00:00Z").getTime();
	const graine = [...repo].reduce((n, c) => n + c.charCodeAt(0), 0);
	return COMMITS_GENERIQUES.filter(([, age]) => age < jours).map(([message, age], i) => ({
		sha: ((graine * 2654435761 + i * 40503) >>> 0).toString(16).padStart(8, "0").slice(0, 7),
		message,
		date: new Date(base - age * 86_400_000).toISOString().slice(0, 10),
	}));
}

export const ARBORESCENCE_DEMO = [
	"package.json", "README.md", "tsconfig.json", "vite.config.ts", "src/index.ts", "src/cli.ts", "src/scan.ts",
	"src/certificat.ts", "src/rapport.ts", "src/options.ts", "src/utils/dns.ts", "src/utils/delai.ts",
	"src/utils/format.ts", "tests/scan.test.ts", "tests/rapport.test.ts", "docs/usage.md", "docs/architecture.md",
	"scripts/release.mjs", ".github/workflows/ci.yml",
];

export const PROPOSES_DEMO = [
	"package.json", "src/index.ts", "src/cli.ts", "src/scan.ts", "src/certificat.ts", "src/rapport.ts",
	"src/options.ts", "tests/scan.test.ts", "docs/usage.md",
];

export const POSTS_PAR_TYPE: Record<TypePost, Post[]> = {
	presentation: [
		{
			titre: "Présentation, angle problème",
			format: "Présentation du projet",
			source: "scanner-ssl",
			texte: `Aujourd'hui je vous présente scanner-ssl.

Un outil en ligne de commande qui regarde les certificats d'un domaine et vous dit, en dix secondes, lesquels expirent bientôt, lesquels sont mal chaînés et lesquels n'auraient jamais dû être là.

Pourquoi ? Parce qu'un certificat oublié ne prévient personne. Il tombe un dimanche, et c'est le site du client qui affiche une page rouge.

Ce que vous obtenez :
→ un rapport lisible, trié par urgence
→ un code de sortie pour votre CI
→ aucune donnée envoyée ailleurs que sur votre machine

Le projet est ouvert, le lien est en commentaire.

#securite #devops #opensource #cli`,
		},
		{
			titre: "Présentation, angle démarche",
			format: "Présentation du projet",
			source: "scanner-ssl",
			texte: `Aujourd'hui je vous présente scanner-ssl, et surtout comment il est né.

Au départ, un tableur. Une colonne par domaine, une date d'expiration saisie à la main. Il a tenu six mois, puis il a menti.

Alors j'ai écrit l'outil que je cherchais : un seul binaire, une commande, un rapport qui dit quoi renouveler en premier.

Si vous gérez plus de trois domaines, essayez-le et dites-moi ce qui manque.

#securite #cli #opensource`,
		},
	],
	tuto: [
		{
			titre: "Tuto, surveiller un domaine en 4 étapes",
			format: "Mini tuto",
			source: "scanner-ssl",
			texte: `Surveiller l'expiration de vos certificats en 4 étapes, sans rien installer de lourd.

1. Installez l'outil : npm install -g scanner-ssl
2. Lancez un premier scan : scanner-ssl scan exemple.fr
3. Lisez le rapport : les certificats sont triés par jours restants
4. Branchez-le dans votre CI avec l'option --echec-sous 14

Si un certificat expire dans moins de 14 jours, la commande retourne une erreur et votre pipeline vous prévient.

À essayer ensuite : l'option --json pour alimenter votre propre tableau de bord.

#devops #securite #cli`,
		},
		{
			titre: "Tuto, lire le rapport",
			format: "Mini tuto",
			source: "scanner-ssl",
			texte: `Lire un rapport de scanner-ssl en 3 étapes.

1. Repérez la colonne « reste » : c'est le nombre de jours avant l'expiration
2. Regardez la chaîne : un maillon manquant s'affiche en rouge
3. Relancez avec --details pour voir l'émetteur de chaque certificat

Pas de magie, juste un tri qui met l'urgent en haut.

#securite #cli`,
		},
	],
	coulisses: [
		{
			titre: "Coulisses, une décision de conception",
			format: "Coulisses du projet",
			source: "atelier-reservations",
			texte: `Je voulais un paiement en trois fois. J'ai failli le faire à la main.

L'idée de départ : calculer les échéances moi-même et les stocker. Puis je me suis rendu compte que je réécrivais ce que le prestataire de paiement fait déjà, avec les cas limites en moins.

J'ai changé de cap : une seule source de vérité chez le prestataire, et mon code se contente de lire l'état.

Résultat : moins de code, et plus de rapprochement manuel le vendredi soir.

Quelle fonctionnalité réécrivez-vous alors qu'elle existe déjà ?

#dev #paiement #architecture`,
		},
	],
	lecon: POSTS_DEMO.slice(0, 1),
	semaine: POSTS_DEMO,
};

export const QUESTIONS_DEMO: Record<TypePost, string> = {
	presentation: "Pourquoi as-tu fait ce projet ? Un besoin personnel, une demande, une curiosité ? Je préfère ne pas l'inventer.",
	tuto: "Quel sujet précis veux-tu traiter ? Je peux proposer : installer l'outil, lancer un premier scan, ou l'intégrer à la CI.",
	coulisses: "Quel était le pourquoi de ce choix ? Les commits disent ce qui a changé, pas ce qui t'a fait hésiter.",
	lecon: "Qu'est-ce qui s'est passé exactement ? Décris le problème en deux phrases, je m'appuierai dessus.",
	semaine: "",
};
