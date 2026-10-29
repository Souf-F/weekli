import { CATALOGUE_POSTS, type DemandePost, MAX_COMMITS_POST, MAX_FICHIERS_TUTO, type TypePost } from "@weekli/core";

// Logique pure du parcours du tableau : reglages propres au type, validation, demande a l'API, texte pour Claude.

export const LIMITE_LONG = 500;
export const LIMITE_SUJET = 140;
export const JOURS_COMMITS = [7, 30, 90] as const;

export type ReglagesType = {
	pourquoi: string;
	demarche: string;
	sujet: string;
	probleme: string;
	choix: string;
	jours: number;
	commits: string[];
	// null tant que la liste proposee par le serveur n'est pas arrivee
	fichiers: string[] | null;
	ajoutes: string[];
};

export const reglagesVides = (): ReglagesType => ({
	pourquoi: "",
	demarche: "",
	sujet: "",
	probleme: "",
	choix: "",
	jours: 30,
	commits: [],
	fichiers: null,
	ajoutes: [],
});

// Le texte saisi serait perdu si on change de repo ou de type
export const aSaisie = (r: ReglagesType): boolean =>
	[r.pourquoi, r.demarche, r.sujet, r.probleme, r.choix].some((t) => t.trim() !== "");

// Les commits ne sont charges et affiches que si le type en a besoin
export const besoinCommits = (type: TypePost): boolean => CATALOGUE_POSTS[type].commits !== "non";

export function messageValidation(type: TypePost, r: ReglagesType): string {
	switch (type) {
		case "tuto":
			return (r.fichiers?.length ?? 0) === 0 ? "Coche au moins un fichier à lire." : "";
		case "coulisses":
			if (r.commits.length === 0) return "Choisis au moins un commit à raconter.";
			return r.commits.length > MAX_COMMITS_POST ? `${MAX_COMMITS_POST} commits au plus.` : "";
		case "lecon":
			return r.probleme.trim() === "" && r.commits.length === 0 ? "Décris le problème, ou choisis un commit." : "";
		default:
			return "";
	}
}

// Corps de POST /api/posts/donnees pour les types qui portent sur un seul repo
export function demandeDonnees(type: TypePost, repo: string, r: ReglagesType): DemandePost {
	switch (type) {
		case "tuto":
			return { type, repo, fichiers: (r.fichiers ?? []).slice(0, MAX_FICHIERS_TUTO) };
		case "coulisses":
			return { type, repo, commits: r.commits.slice(0, MAX_COMMITS_POST) };
		case "lecon":
			return r.commits.length > 0 ? { type, repo, commits: r.commits.slice(0, MAX_COMMITS_POST) } : { type, repo };
		default:
			return { type, repo };
	}
}

// Ce que l'utilisateur a ecrit lui-meme : donnee de confiance pour Claude, jamais envoyee a Weekli
export function composerNotes(type: TypePost, r: ReglagesType): string {
	const ligne = (titre: string, texte: string) => (texte.trim() ? `${titre} : ${texte.trim()}` : "");
	const lignes =
		type === "presentation"
			? [ligne("Pourquoi je l'ai fait", r.pourquoi), ligne("Comment je l'ai conçu", r.demarche)]
			: type === "tuto"
				? [ligne("Sujet du tuto", r.sujet)]
				: type === "coulisses"
					? [ligne("Pourquoi ce choix", r.choix)]
					: type === "lecon"
						? [ligne("Le problème", r.probleme)]
						: [];
	return lignes.filter(Boolean).join("\n");
}

export const ajouterReponse = (notes: string, question: string, reponse: string): string =>
	[notes, `Question de Claude : ${question.trim()}\nRéponse : ${reponse.trim()}`].filter(Boolean).join("\n\n");

// Sans cle API : la meme demande, a copier dans Claude
export function demandeClaude(type: TypePost, repos: string[]): string {
	const { nom, multiRepos } = CATALOGUE_POSTS[type];
	if (multiRepos) {
		const cible = repos.length > 0 ? `mes repos ${repos.join(", ")}` : "tous mes repos";
		return `Prépare un post de type « ${nom} » sur ${cible} avec Weekli.`;
	}
	return `Prépare un post de type « ${nom} » sur mon repo ${repos[0] ?? "<repo>"} avec Weekli.`;
}

// Phrase d'attente propre au type
export const TITRE_VIDE: Record<TypePost, string> = {
	presentation: "Ta présentation",
	tuto: "Ton mini tuto",
	coulisses: "Tes coulisses",
	lecon: "Ta leçon",
	semaine: "Ta semaine",
};

export const nomCourtRepo = (repo: string): string => repo.split("/").pop() ?? repo;
