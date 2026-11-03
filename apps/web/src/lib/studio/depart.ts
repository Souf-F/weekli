import {
	type CaptureRef,
	calculerTimeline,
	choisirTrame,
	type EntreeScriptPub,
	type Hex,
	LIMITES_PUB,
	type RepoResume,
	type ScriptPub,
	scriptPubDepuisReponses,
} from "@weekli/core";

// Ce que le studio sait avant le script : le projet, les 3 reponses, les captures (2 au plus, facultatives)
export const MAX_CAPTURES_STUDIO = 2;
export const COULEUR_PAR_DEFAUT: Hex = "#3d4bff";

export type Reponses = ScriptPub["reponses"];
export type EtatAssistant = {
	repo: RepoResume;
	reponses: Reponses;
	captures: CaptureRef[];
	primaire: Hex | null; // couleur extraite de la premiere capture
};

// "mon-projet_v2" donne "Mon projet v2"
export function nomProjet(repo: string): string {
	const nom = repo.replace(/[-_.]+/g, " ").trim();
	return (nom.charAt(0).toLocaleUpperCase("fr-FR") + nom.slice(1)).slice(0, LIMITES_PUB.nom);
}

// Le lien affiche en fin de pub : le site si l'URL tient dans 120 caracteres, sinon la page GitHub
export function lienPub(repo: RepoResume): string {
	const https = (u: string) => /^https:\/\//.test(u) && Array.from(u).length <= LIMITES_PUB.lien;
	return [repo.site, repo.url].find(https) ?? repo.url;
}

export function entreeDepart(e: EtatAssistant, captures = e.captures): EntreeScriptPub {
	return {
		nom: nomProjet(e.repo.repo),
		repo: e.repo.repo,
		lien: lienPub(e.repo),
		reponses: e.reponses,
		marque: { primaire: e.primaire ?? COULEUR_PAR_DEFAUT },
		captures,
	};
}

export const scriptDeDepart = (e: EtatAssistant): ScriptPub => scriptPubDepuisReponses(entreeDepart(e));

// Sans capture, le script de depart est trop court (US-P1) : le studio en demande une avant de l'appeler
export function exigeCapture(e: EtatAssistant): boolean {
	if (e.captures.length > 0) return false;
	return calculerTimeline(scriptPubDepuisReponses(entreeDepart(e, []))).duree < LIMITES_PUB.dureeTotale.min;
}

export const trameSuggeree = (e: EtatAssistant) => choisirTrame(e.reponses, e.captures.length);

export const reponsesCompletes = (r: Reponses) => Object.values(r).every((v) => v.trim().length > 0);

// "/" donne "Accueil", "/tarifs/pro" donne "Pro"
export function legendeDepuisUrl(url: string): string {
	try {
		const u = new URL(url);
		const dernier = u.pathname.split("/").filter(Boolean).pop();
		if (!dernier) return "Accueil";
		const lisible = decodeURIComponent(dernier).replace(/[-_]+/g, " ");
		return lisible.charAt(0).toLocaleUpperCase("fr-FR") + lisible.slice(1);
	} catch {
		return "Écran";
	}
}

export const idCapture = (existantes: readonly CaptureRef[]): string => {
	for (let n = 1; n <= 9; n++) if (!existantes.some((c) => c.id === `capture-${n}`)) return `capture-${n}`;
	return `capture-${Date.now() % 100000}`;
};
