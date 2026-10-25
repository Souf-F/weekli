import type { Ctx2D, Toile } from "../scene";

// Toiles de travail reutilisees d'une image a l'autre (tuiles de motif, couches de flou, canaux du
// glitch). Simple cache memoire : leur contenu est entierement redessine a chaque usage, il ne porte
// aucun etat d'une image a la suivante.
const cache = new Map<string, Toile>();

function nouvelleToile(l: number, h: number): Toile {
	if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(l, h);
	return Object.assign(document.createElement("canvas"), { width: l, height: h });
}

// Toile vide de l x h pixels, transformation remise a zero
export function toileDeTravail(nom: string, l: number, h: number): { toile: Toile; ctx: Ctx2D } {
	let toile = cache.get(nom);
	if (!toile) {
		toile = nouvelleToile(l, h);
		cache.set(nom, toile);
	}
	if (toile.width !== l) toile.width = l;
	if (toile.height !== h) toile.height = h;
	const ctx = toile.getContext("2d") as Ctx2D;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = "source-over";
	ctx.filter = "none";
	ctx.clearRect(0, 0, l, h);
	return { toile, ctx };
}

// Tuile dessinee une seule fois par cle (motifs fixes : grain, grille de points)
export function tuile(cle: string, l: number, h: number, peindre: (ctx: Ctx2D) => void): Toile {
	const existante = cache.get(`tuile:${cle}`);
	if (existante) return existante;
	const toile = nouvelleToile(l, h);
	peindre(toile.getContext("2d") as Ctx2D);
	cache.set(`tuile:${cle}`, toile);
	return toile;
}

