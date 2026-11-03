// Les 4 etapes du parcours du tableau
export const ETAPES = [
	{ numero: 1, nom: "Repo" },
	{ numero: 2, nom: "Type" },
	{ numero: 3, nom: "Réglages" },
	{ numero: 4, nom: "Posts" },
] as const;

export type NumeroEtape = 1 | 2 | 3 | 4;
