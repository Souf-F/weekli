import type { Palette } from "@weekli/core";
import { type Ctx2D, HAUTEUR, LARGEUR } from "../scene";
import { avecAlpha } from "./couleur";
import { dessinerCarres, dessinerGrain, dessinerRayons } from "./motifs";
import { tuile } from "./toiles";

// Fonds de marque (design.md 8.6). Chaque scene dessine le sien en premier.

export type OptionsFond = {
	secondes: number; // temps local de la scene (derive des carres, rotation des rayons)
	temps: number; // temps global de la pub (respiration du halo, continue d'une scene a l'autre)
	graine: number; // place des carres
	carres?: boolean;
	carresOpacite?: number;
};

export type OptionsFondSombre = OptionsFond & {
	rayons?: { intensite?: number; ouverture?: number }; // revelation et fin
	alerte?: number; // 0 a 1 : fond teinte de la couleur d'alerte (mot d'impact)
	grain?: boolean;
	trame?: boolean; // quadrillage tres fin, comme la reference
};

const PERIODE_HALO = 6;
const PAS_TRAME = 48;
const PAS_POINTS = 32;

// Quadrillage a peine visible : donne de la matiere au sombre sans se lire comme un motif
function dessinerTrame(ctx: Ctx2D, couleur: string) {
	const source = tuile(`trame:${couleur}`, PAS_TRAME, PAS_TRAME, (c) => {
		c.fillStyle = couleur;
		c.fillRect(0, 0, PAS_TRAME, 1);
		c.fillRect(0, 1, 1, PAS_TRAME - 1);
	});
	const motif = ctx.createPattern(source as CanvasImageSource, "repeat");
	if (!motif) return;
	ctx.save();
	// grille calee sur le centre de l'image
	ctx.translate((LARGEUR / 2) % PAS_TRAME, (HAUTEUR / 2) % PAS_TRAME);
	ctx.fillStyle = motif;
	ctx.fillRect(-PAS_TRAME, -PAS_TRAME, LARGEUR + PAS_TRAME, HAUTEUR + PAS_TRAME);
	ctx.restore();
}

export function dessinerFondSombre(ctx: Ctx2D, p: Palette, o: OptionsFondSombre) {
	const cx = LARGEUR / 2;
	const cy = HAUTEUR / 2;
	ctx.save();
	ctx.fillStyle = p.sombre;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

	// halo radial qui respire de +-4 % sur 6 s (rayon 70 % de la largeur)
	const souffle = 0.96 + 0.04 * Math.sin((o.temps / PERIODE_HALO) * Math.PI * 2);
	const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, LARGEUR * 0.7);
	halo.addColorStop(0, avecAlpha(p.sombreHalo, souffle));
	halo.addColorStop(0.3, avecAlpha(p.sombreHalo, 0.5 * souffle));
	halo.addColorStop(0.65, avecAlpha(p.sombreHalo, 0.12 * souffle));
	halo.addColorStop(1, avecAlpha(p.sombreHalo, 0));
	ctx.fillStyle = halo;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

	if (o.alerte && o.alerte > 0) {
		const rouge = ctx.createRadialGradient(cx, cy, 0, cx, cy, LARGEUR * 0.75);
		rouge.addColorStop(0, avecAlpha(p.alerteSombre, 0.34 * o.alerte));
		rouge.addColorStop(1, avecAlpha(p.alerteSombre, 0.16 * o.alerte));
		ctx.fillStyle = rouge;
		ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	}

	if (o.trame !== false) dessinerTrame(ctx, avecAlpha(p.blanc, 0.028));
	if (o.rayons) dessinerRayons(ctx, { secondes: o.secondes, couleur: p.rayons, ...o.rayons });

	// vignettage : coins plus profonds, le regard reste au centre
	const coins = ctx.createRadialGradient(cx, cy, HAUTEUR * 0.3, cx, cy, LARGEUR * 0.62);
	coins.addColorStop(0, "rgba(0, 0, 0, 0)");
	coins.addColorStop(1, "rgba(0, 0, 0, 0.42)");
	ctx.fillStyle = coins;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

	if (o.carres !== false) dessinerCarres(ctx, { graine: o.graine, secondes: o.secondes, couleur: p.blanc, opacite: o.carresOpacite });
	if (o.grain !== false) dessinerGrain(ctx);
	ctx.restore();
}

// Fond clair : uni, grille de points `encre` a 6 % (pas de 32 px), carres en `encre`
export function dessinerFondClair(ctx: Ctx2D, p: Palette, o: OptionsFond) {
	ctx.save();
	ctx.fillStyle = p.clair;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	const couleurPoint = avecAlpha(p.encre, 0.06 / 0.6); // le point antialiase couvre environ 60 % de son carre
	const source = tuile(`points:${couleurPoint}`, PAS_POINTS, PAS_POINTS, (c) => {
		c.fillStyle = couleurPoint;
		c.beginPath();
		c.arc(PAS_POINTS / 2, PAS_POINTS / 2, 1.5, 0, Math.PI * 2);
		c.fill();
	});
	const motif = ctx.createPattern(source as CanvasImageSource, "repeat");
	if (motif) {
		ctx.fillStyle = motif;
		ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	}
	if (o.carres !== false) dessinerCarres(ctx, { graine: o.graine, secondes: o.secondes, couleur: p.encre, opacite: o.carresOpacite });
	ctx.restore();
}
