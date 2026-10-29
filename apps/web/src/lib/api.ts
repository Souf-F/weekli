import type { Activite, Brouillon, Commit, DemandePost, DetailsCommit, DonneesPost, EcartsTuto, DetailsRepo, Post, PubEnregistree, PubResume, RepoResume, ScriptPub, StyleEcriture } from "@weekli/core";

export type Moi = { login: string; nom: string; avatar: string };
export type Domaine = { hote: string; verifie: string };
export type Preuve = {
	hote: string;
	dns: { nom: string; type: string; valeur: string };
	fichier: { url: string; contenu: string };
};

// Apercu de la lecture d'un mini tuto : aucun fichier n'est lu, les chemins viennent du repo (non fiables)
export type ApercuTuto = {
	branche: string;
	arborescence: string[];
	arborescenceTronquee: boolean;
	proposes: string[];
	ecartes: EcartsTuto;
};

export type PubSauvee = { pub: PubEnregistree; avertissements: string[] };

export class ErreurApi extends Error {
	readonly statut: number;
	readonly details: string[];

	constructor(message: string, statut: number, details: string[] = []) {
		super(message);
		this.statut = statut;
		this.details = details;
	}
}

async function lire<T>(chemin: string, init?: RequestInit): Promise<T> {
	const res = await fetch(chemin, { credentials: "same-origin", ...init });
	if (!res.ok) {
		const corps = await res.json().catch(() => ({}));
		throw new ErreurApi(corps.erreur ?? `Erreur ${res.status}`, res.status, Array.isArray(corps.details) ? corps.details.map(String) : []);
	}
	return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, corps: unknown): RequestInit => ({
	method,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(corps),
});

export const api = {
	moi: () => lire<Moi>("/api/moi"),
	activite: (jours: number) => lire<Activite>(`/api/activite?jours=${jours}`),
	commit: (repo: string, sha: string) =>
		lire<DetailsCommit>(`/api/repos/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`),
	deconnexion: () => lire<void>("/auth/logout", { method: "POST" }),
	brouillons: () => lire<Brouillon[]>("/api/brouillons"),
	sauverBrouillons: (posts: Post[]) => lire<Brouillon[]>("/api/brouillons", json("POST", { posts })),
	modifierBrouillon: (id: string, modif: { texte?: string; publie?: boolean }) =>
		lire<Brouillon>(`/api/brouillons/${encodeURIComponent(id)}`, json("PATCH", modif)),
	domaines: () => lire<Domaine[]>("/api/domaines"),
	preparerDomaine: (hote: string) => lire<Preuve>("/api/domaines/preparer", json("POST", { hote })),
	verifierDomaine: (hote: string) => lire<Domaine[]>("/api/domaines/verifier", json("POST", { hote })),
	supprimerDomaine: (hote: string) => lire<void>(`/api/domaines/${encodeURIComponent(hote)}`, { method: "DELETE" }),
	style: () => lire<StyleEcriture>("/api/style"),
	sauverStyle: (style: { exemples?: string; profil?: string }) => lire<StyleEcriture>("/api/style", json("PUT", style)),
	supprimerStyle: () => lire<void>("/api/style", { method: "DELETE" }),
	exporterMesDonnees: async (): Promise<Blob> => {
		const res = await fetch("/api/moi/donnees", { credentials: "same-origin" });
		if (!res.ok) {
			const corps = await res.json().catch(() => ({}));
			throw new ErreurApi(corps.erreur ?? `Erreur ${res.status}`, res.status);
		}
		return res.blob();
	},
	supprimerMesDonnees: () => lire<void>("/api/moi/donnees", { method: "DELETE" }),
	capturer: async (url: string, format: "bureau" | "mobile"): Promise<Blob> => {
		const res = await fetch("/api/captures", { credentials: "same-origin", ...json("POST", { url, format }) });
		if (!res.ok) {
			const corps = await res.json().catch(() => ({}));
			throw new ErreurApi(corps.erreur ?? `Erreur ${res.status}`, res.status);
		}
		return res.blob();
	},
	repos: () => lire<RepoResume[]>("/api/repos"),
	commitsRepo: (nom: string, jours: number) =>
		lire<Commit[]>(`/api/repos/${encodeURIComponent(nom)}/commits?jours=${jours}`),
	fichiersTuto: (nom: string) => lire<ApercuTuto>(`/api/repos/${encodeURIComponent(nom)}/fichiers-tuto`),
	donneesPost: (demande: DemandePost) => lire<DonneesPost>("/api/posts/donnees", json("POST", demande)),
	repo: (nom: string) => lire<DetailsRepo>(`/api/repos/${encodeURIComponent(nom)}`),
	pubs: () => lire<PubResume[]>("/api/pubs"),
	pub: (id: string) => lire<PubEnregistree>(`/api/pubs/${encodeURIComponent(id)}`),
	creerPub: (script: ScriptPub) => lire<PubSauvee>("/api/pubs", json("POST", { script })),
	sauverPub: (id: string, script: ScriptPub) => lire<PubSauvee>(`/api/pubs/${encodeURIComponent(id)}`, json("PUT", { script })),
	supprimerPub: (id: string) => lire<void>(`/api/pubs/${encodeURIComponent(id)}`, { method: "DELETE" }),
	supprimerBrouillon: (id: string) => lire<void>(`/api/brouillons/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
