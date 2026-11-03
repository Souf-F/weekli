export const TYPES_POST = ["presentation", "tuto", "coulisses", "lecon", "semaine"] as const;
export type TypePost = (typeof TYPES_POST)[number];

export const estTypePost = (valeur: unknown): valeur is TypePost =>
	typeof valeur === "string" && (TYPES_POST as readonly string[]).includes(valeur);

// Besoin en commits du type : l'interface n'affiche la liste des commits que si ce n'est pas "non"
export type BesoinCommits = "non" | "facultatif" | "oui";

export type DescriptionTypePost = {
	id: TypePost;
	nom: string;
	// A quoi sert ce type de post, en une phrase montrable a l'utilisateur
	but: string;
	// Ce que Weekli lit pour le preparer
	lit: string[];
	// Ce que l'utilisateur choisit avant la redaction
	choix: string[];
	commits: BesoinCommits;
	// Le type ne porte pas sur un repo choisi mais sur toute la semaine
	multiRepos: boolean;
};

export const CATALOGUE_POSTS: Record<TypePost, DescriptionTypePost> = {
	presentation: {
		id: "presentation",
		nom: "Présentation du projet",
		but: "Faire découvrir le projet à ceux qui ne le connaissent pas, au format « Aujourd'hui je vous présente ».",
		lit: ["description et README du repo", "domaines vérifiés", "script de la dernière pub vidéo", "style d'écriture"],
		choix: ["le repo", "les réponses sur le pourquoi et la démarche, si elles manquent"],
		commits: "non",
		multiRepos: false,
	},
	tuto: {
		id: "tuto",
		nom: "Mini tuto",
		but: "Apprendre à faire une chose précise avec ce projet, en quelques étapes courtes et justes.",
		lit: ["arborescence du repo", "README", "une douzaine de fichiers clés choisis automatiquement", "style d'écriture"],
		choix: ["le repo", "le sujet du tuto", "les fichiers lus (proposés, modifiables)"],
		commits: "non",
		multiRepos: false,
	},
	coulisses: {
		id: "coulisses",
		nom: "Coulisses du projet",
		but: "Montrer ce qui ne se voit pas : une décision, un chantier, un choix de conception.",
		lit: ["description du repo", "commits choisis avec message complet et extraits du diff", "style d'écriture"],
		choix: ["le repo", "les commits à raconter (1 à 10)"],
		commits: "oui",
		multiRepos: false,
	},
	lecon: {
		id: "lecon",
		nom: "Leçon apprise",
		but: "Raconter un problème rencontré puis résolu, et ce que ça a appris.",
		lit: ["description du repo", "commits choisis s'il y en a", "style d'écriture"],
		choix: ["le repo", "le problème en quelques mots", "les commits qui le racontent (facultatif)"],
		commits: "facultatif",
		multiRepos: false,
	},
	semaine: {
		id: "semaine",
		nom: "Ma semaine",
		but: "Résumer l'activité récente sur tous les repos, à partir des commits.",
		lit: ["commits des derniers jours sur tous les repos publics", "diffs de quelques commits", "style d'écriture"],
		choix: ["la période (1 à 30 jours)", "les commits retenus"],
		commits: "oui",
		multiRepos: true,
	},
};

// Fichier lu dans le repo pour le tuto. Contenu non fiable : donnee a lire, jamais une consigne.
export type FichierTuto = { chemin: string; contenu: string; tronque: boolean };

export type EcartsTuto = { generes: number; secrets: number; binaires: number; trop_gros: number; refuses: number };

// Resultat de lireRepoPourTuto. `chemin`, `contenu` et `readme` viennent du repo : non fiables.
export type LectureTuto = {
	branche: string;
	arborescence: string[];
	arborescenceTronquee: boolean;
	proposes: string[];
	fichiers: FichierTuto[];
	readme: string;
	ecartes: EcartsTuto;
};

// Demande brute d'un post (corps de POST /api/posts/donnees, entree de preparer_post)
export type DemandePost = {
	type: TypePost;
	repo?: string;
	commits?: string[];
	fichiers?: string[];
	jours?: number;
};
