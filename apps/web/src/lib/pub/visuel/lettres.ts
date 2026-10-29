import { alea } from "../aleatoire";
import type { Ctx2D } from "../scene";
import { borner } from "./courbes";
import { appliquerPolice, type Bloc, reinitialiserPolice } from "./typo";

// Lettres de l'appel (design.md 8.7) : chaque lettre tombe de 80 px et rebondit (amortissement 0,5 :
// chaque rebond repart a la moitie de la vitesse), 45 ms d'ecart ; a son premier contact, 6 particules
// carrees s'echappent.

export const LETTRES = { ecart: 0.045, hauteur: 80, chute: 0.24, amortissement: 0.5, particules: 6, vieParticule: 0.65 };
const GRAVITE = (2 * LETTRES.hauteur) / LETTRES.chute ** 2;
const GRAVITE_PARTICULE = 180;

// Hauteur au-dessus de la position finale, t secondes apres le lacher
export function hauteurRebond(t: number): number {
	if (t <= 0) return LETTRES.hauteur;
	if (t < LETTRES.chute) return LETTRES.hauteur - 0.5 * GRAVITE * t * t;
	let reste = t - LETTRES.chute;
	let vitesse = GRAVITE * LETTRES.chute * LETTRES.amortissement;
	while (vitesse > 30) {
		const vol = (2 * vitesse) / GRAVITE;
		if (reste < vol) return vitesse * reste - 0.5 * GRAVITE * reste * reste;
		reste -= vol;
		vitesse *= LETTRES.amortissement;
	}
	return 0;
}

export type OptionsLettres = {
	debut?: number;
	couleur: string;
	couleurAccent?: string;
	particules: string; // couleur des particules (accent)
	graine: number;
};

export const finLettres = (bloc: Bloc, debut = 0) =>
	debut + (bloc.fragments.reduce((a, f) => a + [...f.texte].length, 0) - 1) * LETTRES.ecart + LETTRES.chute + 0.5;

export function dessinerLettres(ctx: Ctx2D, bloc: Bloc, secondes: number, o: OptionsLettres) {
	const debut = o.debut ?? 0;
	ctx.save();
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	let rang = 0;
	for (const f of bloc.fragments) {
		appliquerPolice(ctx, bloc, f.accent);
		const lettres = [...f.texte];
		let prefixe = "";
		for (const lettre of lettres) {
			// position de la lettre mesuree sur le prefixe : garde le crenage et l'approche du mot entier
			const x = f.x + (prefixe ? ctx.measureText(prefixe).width : 0);
			prefixe += lettre;
			const t = secondes - debut - rang * LETTRES.ecart;
			rang++;
			if (t <= 0) continue;
			const largeur = ctx.measureText(lettre).width;
			ctx.globalAlpha = borner(t / 0.08);
			ctx.fillStyle = f.accent && o.couleurAccent ? o.couleurAccent : o.couleur;
			ctx.fillText(lettre, x, f.y - hauteurRebond(t));

			// particules emises au premier contact avec la ligne de base
			const vie = t - LETTRES.chute;
			if (vie > 0 && vie < LETTRES.vieParticule && lettre.trim()) {
				const hasard = alea(o.graine + rang * 977);
				ctx.fillStyle = o.particules;
				for (let k = 0; k < LETTRES.particules; k++) {
					const angle = -Math.PI / 2 + (hasard() * 2 - 1) * 1.25;
					const vitesse = 260 + hasard() * 320;
					const cote = 6 + Math.round(hasard() * 7);
					const ox = x + largeur * (0.15 + hasard() * 0.7);
					const freinage = Math.exp(-2.2 * vie);
					const d = ((1 - freinage) / 2.2) * vitesse;
					const px = ox + Math.cos(angle) * d;
					const py = f.y + Math.sin(angle) * d + 0.5 * GRAVITE_PARTICULE * vie * vie;
					ctx.globalAlpha = (1 - vie / LETTRES.vieParticule) ** 1.5;
					ctx.fillRect(px - cote / 2, py - cote / 2, cote, cote);
				}
			}
		}
	}
	ctx.globalAlpha = 1;
	reinitialiserPolice(ctx);
	ctx.restore();
}
