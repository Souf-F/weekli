export type Commit = {
	sha: string;
	message: string;
	date: string;
};

export type ActiviteRepo = {
	repo: string;
	description: string;
	langage: string;
	url: string;
	site: string;
	commits: Commit[];
};

export type Activite = {
	depuis: string;
	repos: ActiviteRepo[];
};

export type DetailsRepo = {
	repo: string;
	description: string;
	site: string;
	url: string;
	sujets: string[];
	langages: string[];
	etoiles: number;
	readme: string;
};

export type FichierModifie = {
	nom: string;
	statut: string;
	ajouts: number;
	suppressions: number;
	extrait: string;
};

export type DetailsCommit = {
	sha: string;
	message: string;
	date: string;
	stats?: { additions?: number; deletions?: number; total?: number };
	fichiers: FichierModifie[];
};

export type Ton = "retour" | "tuto" | "coulisses" | "lecons";
export type Langue = "fr" | "en";

export type OptionsGeneration = {
	ton: Ton;
	langue: Langue;
	nombre: number;
	style: string;
};

export type Post = {
	titre: string;
	format: string;
	source: string;
	texte: string;
};

export type Brouillon = Post & {
	id: string;
	cree: string;
	publie: boolean;
};
