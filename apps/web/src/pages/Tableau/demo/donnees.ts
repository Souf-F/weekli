import type { Activite, Post } from "@weekli/core";

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
