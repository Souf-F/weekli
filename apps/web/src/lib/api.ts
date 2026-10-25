import type { Activite, Brouillon, DetailsCommit, Post } from "@weekli/core";

export type Moi = { login: string; nom: string; avatar: string };
export type Domaine = { hote: string; verifie: string };
export type Preuve = {
	hote: string;
	dns: { nom: string; type: string; valeur: string };
	fichier: { url: string; contenu: string };
};

export class ErreurApi extends Error {
	readonly statut: number;

	constructor(message: string, statut: number) {
		super(message);
		this.statut = statut;
	}
}

async function lire<T>(chemin: string, init?: RequestInit): Promise<T> {
	const res = await fetch(chemin, { credentials: "same-origin", ...init });
	if (!res.ok) {
		const corps = await res.json().catch(() => ({}));
		throw new ErreurApi(corps.erreur ?? `Erreur ${res.status}`, res.status);
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
	supprimerMesDonnees: () => lire<void>("/api/moi/donnees", { method: "DELETE" }),
	capturer: async (url: string, format: "bureau" | "mobile"): Promise<Blob> => {
		const res = await fetch("/api/captures", { credentials: "same-origin", ...json("POST", { url, format }) });
		if (!res.ok) {
			const corps = await res.json().catch(() => ({}));
			throw new ErreurApi(corps.erreur ?? `Erreur ${res.status}`, res.status);
		}
		return res.blob();
	},
	supprimerBrouillon: (id: string) => lire<void>(`/api/brouillons/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
