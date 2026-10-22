import type { Activite, DetailsCommit } from "@weekli/core";

export type Moi = { login: string; nom: string; avatar: string };

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

export const api = {
	moi: () => lire<Moi>("/api/moi"),
	activite: (jours: number) => lire<Activite>(`/api/activite?jours=${jours}`),
	commit: (repo: string, sha: string) =>
		lire<DetailsCommit>(`/api/repos/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`),
	deconnexion: () => lire<void>("/auth/logout", { method: "POST" }),
};
