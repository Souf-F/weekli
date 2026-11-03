import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { avancement, avecAlpha, easeInOutCubic, easeOutCubic, easeOutExpo, melanger, reinitialiserPolice } from "../../visuel";
import { ajusterLigne, type ContexteExplication, dessinerCoche, dessinerEnTete, dessinerFond, dessinerTitre, type Ligne1, ombre, poserTitre, signaler } from "./commun";

// Scene `avantapres` (design.md 8.17) : un seul panneau qui se reecrit. Un filet d'accent le balaie,
// le fond bascule derriere lui et chaque ligne retourne ses lettres pour devenir sa version « apres ».

type Donnees = Extract<ScenePub, { type: "avantapres" }>;

const PANNEAU = { x: 360, y: 420, l: 1200, h: 520, r: 28, bandeau: 72 };
const LIGNE = { taille: 44, pas: 120, xTexte: 452, xPastille: 408, rPastille: 14 };
const LARGEUR_TEXTE = PANNEAU.x + PANNEAU.l - 48 - LIGNE.xTexte;
const FILET = { debut: 1.9, duree: 0.9 };
const LETTRE = { ecart: 0.018, duree: 0.22 };
const GEIST = `"Geist", ui-sans-serif, system-ui, sans-serif`;

const cloche = (p: number) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p));

// Instant ou le filet atteint x (inverse de easeInOutCubic par dichotomie)
function instantFilet(x: number): number {
	const cible = (x - PANNEAU.x) / PANNEAU.l;
	let bas = 0;
	let haut = 1;
	for (let k = 0; k < 24; k++) {
		const m = (bas + haut) / 2;
		if (easeInOutCubic(m) < cible) bas = m;
		else haut = m;
	}
	return FILET.debut + FILET.duree * bas;
}

// Abscisses des lettres (prefixes mesures), memorisees par texte et taille
const positions = new Map<string, { lettres: string[]; x: number[] }>();
function lettres(ctx: Ctx2D, l: Ligne1) {
	const cle = `${l.texte}|${l.taille}`;
	const connu = positions.get(cle);
	if (connu) return connu;
	ctx.save();
	ctx.font = `600 ${l.taille}px ${GEIST}`;
	const ls = Array.from(l.texte);
	const x: number[] = [];
	let prefixe = "";
	for (const c of ls) {
		x.push(ctx.measureText(prefixe).width);
		prefixe += c;
	}
	x.push(ctx.measureText(prefixe).width);
	ctx.restore();
	const r = { lettres: ls, x };
	if (positions.size > 128) positions.clear();
	positions.set(cle, r);
	return r;
}

export function creerAvantApres(c: ContexteExplication): Scene {
	function dessinerEtiquette(ctx: Ctx2D, texte: string, couleur: string, y: number, k: number) {
		ctx.save();
		ctx.translate(0, y);
		ctx.scale(1, k);
		ctx.font = `600 20px ${GEIST}`;
		if ("letterSpacing" in ctx) ctx.letterSpacing = "2.8px";
		ctx.fillStyle = couleur;
		ctx.textBaseline = "middle";
		ctx.fillText(texte.toLocaleUpperCase("fr"), LIGNE.xPastille - LIGNE.rPastille, 1);
		reinitialiserPolice(ctx);
		ctx.restore();
	}

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as Donnees;
		const s = i.secondes;
		dessinerFond(ctx, i, p);
		dessinerEnTete(ctx, c.script, i, p);
		dessinerTitre(ctx, c, poserTitre(ctx, c, d.id, d.titre), s, p);

		const e = easeOutExpo(avancement(s, 0.3, 0.5));
		if (e <= 0) return;
		const { x, y, l, h, r } = PANNEAU;
		const fondAvant = melanger(p.clair, p.encre, 0.035);
		const fondApres = melanger(p.surface, p.accentClair, 0.08);
		const q = easeInOutCubic(avancement(s, FILET.debut, FILET.duree));
		const fx = x + l * q;

		ctx.save();
		ctx.globalAlpha *= e;
		const k = 0.96 + 0.04 * e;
		ctx.translate(x + l / 2, y + h / 2 + 60 * (1 - e));
		ctx.scale(k, k);
		ctx.translate(-(x + l / 2), -(y + h / 2));

		// panneau : fond « avant », puis fond « apres » derriere le filet
		ombre(ctx, x, y, l, h, r, p);
		ctx.beginPath();
		ctx.roundRect(x, y, l, h, r);
		ctx.fillStyle = fondAvant;
		ctx.fill();
		ctx.save();
		ctx.clip();
		if (q > 0) {
			ctx.fillStyle = fondApres;
			ctx.fillRect(x, y, fx - x, h);
		}
		ctx.fillStyle = avecAlpha(p.encre, 0.08);
		ctx.fillRect(x, y + PANNEAU.bandeau, l, 2);

		// bandeau : etiquette d'etat qui se retourne, et deux reperes d'etat a droite
		const tEtiquette = instantFilet(LIGNE.xPastille - LIGNE.rPastille);
		const pe = avancement(s, tEtiquette, LETTRE.duree);
		const yBandeau = y + PANNEAU.bandeau / 2;
		if (pe < 0.5) dessinerEtiquette(ctx, d.avant ?? "Avant", p.encreDouce, yBandeau, Math.cos(Math.PI * pe));
		else dessinerEtiquette(ctx, d.apres ?? "Après", p.accentClair, yBandeau, -Math.cos(Math.PI * pe));
		for (let n = 0; n < 2; n++) {
			const actif = n === 0 ? 1 - easeOutCubic(pe) : easeOutCubic(pe);
			ctx.fillStyle = melanger(avecAlpha(p.encre, 0.14), n === 0 ? p.encreDouce : p.accentClair, actif);
			ctx.beginPath();
			ctx.roundRect(x + l - 48 - 76 + n * 44, yBandeau - 4, 32, 8, 4);
			ctx.fill();
		}

		// lignes
		const paires = d.paires.slice(0, 3);
		const centre = y + PANNEAU.bandeau + (h - PANNEAU.bandeau) / 2;
		const tTexte = instantFilet(LIGNE.xTexte);
		const tPastille = instantFilet(LIGNE.xPastille - LIGNE.rPastille);
		paires.forEach((paire, j) => {
			const yc = centre + (j - (paires.length - 1) / 2) * LIGNE.pas;
			const base = yc + (LIGNE.taille * 0.71) / 2;
			const ee = easeOutExpo(avancement(s, 0.6 + j * 0.12, 0.45));
			if (ee <= 0) return;
			const av = ajusterLigne(ctx, paire.avant, LIGNE.taille, 600, LARGEUR_TEXTE);
			const ap = ajusterLigne(ctx, paire.apres, LIGNE.taille, 600, LARGEUR_TEXTE);
			signaler(c, d.id, av.coupe, paire.avant);
			signaler(c, d.id, ap.coupe, paire.apres);
			const la = lettres(ctx, av);
			const lp = lettres(ctx, ap);
			const dy = 24 * (1 - ee);
			ctx.save();
			ctx.globalAlpha *= ee;
			ctx.translate(0, dy);

			// pastille : alerte, puis accent avec coche qui rebondit
			const pp = avancement(s, tPastille, LETTRE.duree);
			const bond = 1 + (0.24 + c.depassement) * cloche(avancement(s, 2.8 + j * 0.1, 0.3));
			ctx.save();
			ctx.translate(LIGNE.xPastille, yc);
			ctx.scale(bond, Math.abs(Math.cos(Math.PI * pp)) * bond);
			ctx.fillStyle = pp < 0.5 ? p.alerteClair : p.accentClair;
			ctx.beginPath();
			ctx.arc(0, 0, LIGNE.rPastille, 0, Math.PI * 2);
			ctx.fill();
			if (pp >= 0.5) dessinerCoche(ctx, 0, 0, LIGNE.rPastille, p.blanc);
			ctx.restore();

			// lettres qui se retournent une a une
			const n = Math.max(la.lettres.length, lp.lettres.length);
			const fini = s >= tTexte + (n - 1) * LETTRE.ecart + LETTRE.duree;
			ctx.font = `600 ${av.taille}px ${GEIST}`;
			ctx.textBaseline = "alphabetic";
			let retournees = 0;
			if (s < tTexte) {
				ctx.fillStyle = p.encreDouce;
				ctx.fillText(av.texte, LIGNE.xTexte, base);
			} else if (fini) {
				ctx.font = `600 ${ap.taille}px ${GEIST}`;
				ctx.fillStyle = p.encre;
				ctx.fillText(ap.texte, LIGNE.xTexte, base);
				retournees = la.lettres.length;
			} else {
				for (let kk = 0; kk < n; kk++) {
					const pk = avancement(s, tTexte + kk * LETTRE.ecart, LETTRE.duree);
					if (pk >= 0.5) retournees = Math.max(retournees, kk + 1);
					const avantVisible = pk < 0.5 && kk < la.lettres.length;
					const apresVisible = pk >= 0.5 && kk < lp.lettres.length;
					if (!avantVisible && !apresVisible) continue;
					const sy = avantVisible ? Math.cos(Math.PI * pk) : -Math.cos(Math.PI * pk);
					const mot = avantVisible ? la : lp;
					ctx.save();
					ctx.font = `600 ${(avantVisible ? av : ap).taille}px ${GEIST}`;
					ctx.translate(LIGNE.xTexte + mot.x[kk], yc);
					ctx.scale(1, Math.max(0.001, sy));
					ctx.fillStyle = avantVisible ? p.encreDouce : p.encre;
					ctx.fillText(mot.lettres[kk], 0, base - yc);
					ctx.restore();
				}
			}

			// trait qui barre l'etat « avant » ; il recule a mesure que les lettres se retournent
			const barre = easeOutCubic(avancement(s, 1.1 + j * 0.08, 0.25));
			const debut = LIGNE.xTexte + la.x[Math.min(retournees, la.lettres.length)];
			const finBarre = LIGNE.xTexte + la.x[la.lettres.length] * barre;
			if (barre > 0 && finBarre > debut + 1) {
				ctx.fillStyle = p.encreDouce;
				ctx.beginPath();
				ctx.roundRect(debut - 4, yc - 2, finBarre - debut + 8, 4, 2);
				ctx.fill();
			}
			ctx.restore();
		});

		// filet vertical d'accent, avec une trainee douce
		if (q > 0 && q < 1) {
			const g = ctx.createLinearGradient(fx - 90, 0, fx, 0);
			g.addColorStop(0, avecAlpha(p.accentClair, 0));
			g.addColorStop(1, avecAlpha(p.accentClair, 0.16));
			ctx.fillStyle = g;
			ctx.fillRect(fx - 90, y, 90, h);
			ctx.fillStyle = p.accentClair;
			ctx.fillRect(fx - 2, y, 4, h);
		}
		ctx.restore();

		ctx.strokeStyle = avecAlpha(p.encre, 0.08);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(x, y, l, h, r);
		ctx.stroke();
		ctx.restore();
	}

	return { dessiner };
}
