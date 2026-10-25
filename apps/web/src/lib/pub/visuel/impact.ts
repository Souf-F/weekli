import { alea } from "../aleatoire";
import { type Ctx2D, IPS } from "../scene";
import { avancement, easeOutCubic } from "./courbes";
import { appliquerPolice, type Bloc, CAPITALE, reinitialiserPolice } from "./typo";

// Mot d'impact (design.md 8.7) : echelle 1,25 vers 1 en 160 ms, decalage chromatique rouge et cyan
// (+-6 px) pendant 4 images, micro-secousse du cadre (+-6 px) pendant 6 images.

export const IMPACT = { duree: 0.16, echelle: 1.25, chroma: 6, imagesChroma: 4, secousse: 6, imagesSecousse: 6 };

// Decalage du cadre a appliquer (ctx.translate) avant de dessiner TOUTE la scene, fond compris
export function secousseImpact(secondes: number, debut: number, graine: number): { x: number; y: number } {
	const image = Math.floor((secondes - debut) * IPS);
	if (image < 0 || image >= IMPACT.imagesSecousse) return { x: 0, y: 0 };
	const hasard = alea(graine + image * 7919);
	const force = IMPACT.secousse * (1 - image / IMPACT.imagesSecousse);
	return { x: (hasard() * 2 - 1) * force, y: (hasard() * 2 - 1) * force };
}

export type OptionsImpact = { debut: number; couleur: string };

export function dessinerImpact(ctx: Ctx2D, bloc: Bloc, secondes: number, o: OptionsImpact) {
	if (secondes < o.debut) return;
	const p = avancement(secondes, o.debut, IMPACT.duree);
	const echelle = IMPACT.echelle - (IMPACT.echelle - 1) * easeOutCubic(p);
	const image = Math.floor((secondes - o.debut) * IPS);
	const cx = bloc.x + bloc.largeur / 2;
	// centre optique : milieu des capitales, entre la premiere et la derniere ligne
	const cy = (bloc.lignes[0].y + bloc.lignes[bloc.lignes.length - 1].y) / 2 - (bloc.taille * CAPITALE) / 2;

	const poser = (couleur: string, dx: number, alpha: number) => {
		ctx.globalAlpha = alpha;
		for (const f of bloc.fragments) {
			appliquerPolice(ctx, bloc, f.accent);
			ctx.fillStyle = couleur;
			ctx.fillText(f.texte, f.x + dx, f.y);
		}
	};

	ctx.save();
	ctx.textBaseline = "alphabetic";
	ctx.translate(cx, cy);
	ctx.scale(echelle, echelle);
	ctx.translate(-cx, -cy);
	if (image < IMPACT.imagesChroma) {
		const d = IMPACT.chroma * (1 - image / IMPACT.imagesChroma) + 1.5;
		// trainee horizontale des deux premieres images (le mot arrive vite)
		if (image < 2) {
			for (const k of [-3, -2, 2, 3]) poser(o.couleur, k * d * 2.2, 0.12);
		}
		ctx.globalCompositeOperation = "lighter";
		poser("rgb(255, 0, 40)", -d, 0.9);
		poser("rgb(0, 230, 255)", d, 0.9);
		ctx.globalCompositeOperation = "source-over";
	}
	poser(o.couleur, 0, 1);
	reinitialiserPolice(ctx);
	ctx.restore();
}
