import { type DemandePost, estTypePost } from "./types";

export const MAX_COMMITS_POST = 10;
export const MAX_FICHIERS_TUTO = 12;
const NOM_REPO = /^[A-Za-z0-9._-]{1,100}$/;
const SHA = /^[0-9a-f]{7,40}$/i;

export type DemandeValide = { demande: DemandePost; erreur?: undefined } | { demande?: undefined; erreur: string };

// Valide et nettoie une demande venue du navigateur ou de Claude. Les messages sont montres tels quels (sans accent, comme l'API).
export function validerDemandePost(entree: unknown): DemandeValide {
	const e = (entree && typeof entree === "object" ? entree : {}) as Record<string, unknown>;
	if (!estTypePost(e.type)) return { erreur: "Type de post invalide" };
	const type = e.type;

	if (type === "semaine") {
		const jours = e.jours === undefined ? 7 : e.jours;
		if (typeof jours !== "number" || !Number.isInteger(jours) || jours < 1 || jours > 30) {
			return { erreur: "Periode invalide : 1 a 30 jours" };
		}
		return { demande: { type, jours } };
	}

	if (typeof e.repo !== "string" || !NOM_REPO.test(e.repo) || e.repo === "." || e.repo === "..") {
		return { erreur: "Nom de repo invalide" };
	}
	const demande: DemandePost = { type, repo: e.repo };

	if (type === "coulisses" || type === "lecon") {
		const commits = liste(e.commits, MAX_COMMITS_POST, (s) => SHA.test(s));
		if (commits === null) return { erreur: `Commits invalides : ${MAX_COMMITS_POST} identifiants au plus` };
		if (type === "coulisses" && commits.length === 0) return { erreur: "Choisis au moins un commit" };
		demande.commits = commits;
	}

	if (type === "tuto" && e.fichiers !== undefined) {
		const fichiers = liste(e.fichiers, MAX_FICHIERS_TUTO, (s) => s.length <= 300 && !s.startsWith("/") && !s.includes(".."));
		if (fichiers === null) return { erreur: `Fichiers invalides : ${MAX_FICHIERS_TUTO} chemins au plus` };
		demande.fichiers = fichiers;
	}
	return { demande };
}

// Liste de chaines uniques et valides, ou null si le format ou la taille ne conviennent pas
function liste(valeur: unknown, max: number, valide: (s: string) => boolean): string[] | null {
	if (valeur === undefined) return [];
	if (!Array.isArray(valeur) || valeur.length > max) return null;
	if (!valeur.every((v): v is string => typeof v === "string" && valide(v))) return null;
	return [...new Set(valeur)];
}
