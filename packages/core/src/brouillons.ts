import type { Brouillon, Post } from "./types";

export const MAX_BROUILLONS = 100;
export const LIMITES = { titre: 200, format: 100, source: 200, texte: 6000 } as const;

// Nettoie un post venu de l'exterieur (navigateur ou Claude) : types, longueurs, caracteres de controle
export function nettoyerPost(entree: unknown): Post | null {
	if (!entree || typeof entree !== "object") return null;
	const e = entree as Record<string, unknown>;
	const champ = (nom: keyof typeof LIMITES) =>
		typeof e[nom] === "string"
			? (e[nom] as string).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, LIMITES[nom])
			: "";
	const post = { titre: champ("titre"), format: champ("format"), source: champ("source"), texte: champ("texte") };
	return post.texte.trim() ? post : null;
}

export function creerBrouillons(posts: Post[], maintenant = new Date()): Brouillon[] {
	return posts.map((p) => ({ ...p, id: crypto.randomUUID(), cree: maintenant.toISOString(), publie: false }));
}

// Les plus recents en premier, plafonnes
export function ajouterBrouillons(existants: Brouillon[], nouveaux: Brouillon[]): Brouillon[] {
	return [...nouveaux, ...existants].slice(0, MAX_BROUILLONS);
}
