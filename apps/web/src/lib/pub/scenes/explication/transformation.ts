import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { avancement, avecAlpha, easeInOutCubic, easeOutCubic, easeOutExpo, interpoler, melanger, mettreEnPage } from "../../visuel";
import { dessinerIcone } from "../../visuel/icones";
import { dessinerBlocVisible, entree } from "../produit/commun";
import {
	ajusterLigne,
	bruit,
	type ContexteExplication,
	dessinerCoche,
	dessinerEnTete,
	dessinerFond,
	dessinerLigne,
	dessinerTitre,
	dessinerTuile,
	poserTitre,
	ressort,
	signaler,
} from "./commun";

// Scene `transformation` (design.md 8.17) : une donnee entre dans l'anneau, eclate en 36 carres qui
// tourbillonnent puis se reassemblent en resultat. Continuite d'objet : la meme matiere change de forme.

type Donnees = Extract<ScenePub, { type: "transformation" }>;

const Y = 690;
const X = { entree: 360, anneau: 960, sortie: 1560 };
const COTE = 240;
const ICONE = 96;
const ANNEAU = { r: 160, trait: 4, graduations: 24 };
const LIBELLE = { y: 870, largeur: 360 };
const GRILLE = 6;
const RETRECI = 0.55;
const IMPACT = { debut: 1.7, images: 4, ampleur: 3 };

const cloche = (p: number) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p));

export function creerTransformation(c: ContexteExplication): Scene {
	function dessinerAnneau(ctx: Ctx2D, s: number, p: Palette, couleur: string, dx = 0) {
		const trace = easeInOutCubic(avancement(s, 0.8, 0.3));
		if (trace <= 0) return;
		const rot = s > 1.1 ? ((s - 1.1) * 6 * Math.PI) / 180 : 0;
		const pouls = 1 + 0.035 * cloche(avancement(s, 1.66, 0.34));
		const r = ANNEAU.r * pouls;
		ctx.save();
		ctx.translate(X.anneau + dx, Y);
		ctx.strokeStyle = couleur;
		ctx.lineWidth = ANNEAU.trait;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * trace);
		ctx.stroke();
		for (let k = 0; k < ANNEAU.graduations; k++) {
			if (k / ANNEAU.graduations > trace) break;
			const a = rot + (k / ANNEAU.graduations) * Math.PI * 2 - Math.PI / 2;
			const majeure = k % 6 === 0;
			ctx.strokeStyle = avecAlpha(couleur, majeure ? 0.55 : 0.28);
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(Math.cos(a) * (r - (majeure ? 28 : 20)), Math.sin(a) * (r - (majeure ? 28 : 20)));
			ctx.lineTo(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10));
			ctx.stroke();
		}
		// comete d'accent : un tour d'anneau pendant que la matiere se transforme
		const q = easeInOutCubic(avancement(s, 1.62, 0.7));
		if (q > 0 && q < 1 && dx === 0) {
			const a = -Math.PI / 2 + q * Math.PI * 2;
			ctx.strokeStyle = p.accentClair;
			ctx.lineWidth = 7;
			ctx.beginPath();
			ctx.arc(0, 0, r, a - (Math.PI / 3.2) * cloche(q), a);
			ctx.stroke();
		}
		ctx.restore();
	}

	function dessinerOperateur(ctx: Ctx2D, d: Donnees, s: number, p: Palette) {
		const apparition = avancement(s, 0.95, 0.12);
		if (apparition <= 0) return;
		const bloc = mettreEnPage(ctx, d.operateur, { niveau: "etiquette", ambiance: c.ambiance, x: X.anneau, y: 0, largeur: 260, lignesMax: 1, alignement: "centre" });
		c.signalerCoupe(d.id, bloc, d.operateur);
		const yb = Y + ANNEAU.r;
		const l = bloc.largeur + 48;
		const h = 46;
		const k = 0.6 + 0.4 * ressort(avancement(s, 0.95, 0.45), c.depassement);
		ctx.save();
		ctx.globalAlpha *= apparition;
		ctx.translate(X.anneau, yb);
		ctx.scale(k, k);
		ctx.translate(-X.anneau, -yb);
		ctx.fillStyle = p.clair;
		ctx.strokeStyle = p.encre;
		ctx.lineWidth = ANNEAU.trait;
		ctx.beginPath();
		ctx.roundRect(X.anneau - l / 2, yb - h / 2, l, h, h / 2);
		ctx.fill();
		ctx.stroke();
		// le bloc est pose a y = 0 : on le recentre sur le bord bas de l'anneau
		const dy = yb - bloc.hauteur / 2;
		// espacement des capitales : la derniere lettre porte un blanc a droite, compense de moitie
		ctx.translate((bloc.taille * 0.14) / 2, 0);
		dessinerBlocVisible(ctx, bloc, p.encre, 1, dy);
		ctx.restore();
	}

	// 36 carres : eclatement au centre, quart de tour, envol en courbes, reassemblage a droite
	function dessinerCarres(ctx: Ctx2D, s: number, p: Palette) {
		if (s < 1.7 || s > 2.76) return;
		const sw = easeInOutCubic(avancement(s, 1.7, 0.4));
		const angle = (sw * Math.PI) / 2;
		const ecart = 1 + 0.55 * sw;
		const cx = X.anneau + 40 * sw;
		const cellule = (COTE * RETRECI) / GRILLE;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		for (let r = 0; r < GRILLE; r++) {
			for (let col = 0; col < GRILLE; col++) {
				const n = r * GRILLE + col;
				const ox = (col - 2.5) * cellule;
				const oy = (r - 2.5) * cellule;
				const x0 = cx + (ox * cos - oy * sin) * ecart;
				const y0 = Y + (ox * sin + oy * cos) * ecart;
				// apres le quart de tour, la colonne cible est 5 - r et la ligne cible col
				const tc = GRILLE - 1 - r;
				const tr = col;
				const ordre = (GRILLE - 1 - tc) * GRILLE + tr;
				const pf = easeInOutCubic(avancement(s, 2.1 + ordre * 0.008, 0.32));
				const tx = X.sortie + (tc - 2.5) * (COTE / GRILLE);
				const ty = Y + (tr - 2.5) * (COTE / GRILLE);
				const signe = tr < 3 ? -1 : 1;
				const kx = (x0 + tx) / 2 + (bruit(n) - 0.5) * 80;
				const ky = (y0 + ty) / 2 + signe * (60 + 110 * bruit(n + 99));
				const u = 1 - pf;
				const x = u * u * x0 + 2 * u * pf * kx + pf * pf * tx;
				const y = u * u * y0 + 2 * u * pf * ky + pf * pf * ty;
				const cote = pf > 0 ? interpoler(24, COTE / GRILLE + 0.6, pf) : interpoler(cellule, 24, sw);
				const couleur = pf <= 0 ? melanger(p.surface, p.accentClair, easeOutCubic(sw)) : pf < 0.7 ? p.accentClair : melanger(p.accentClair, p.surface, (pf - 0.7) / 0.3);
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(angle + (pf * Math.PI) / 2);
				ctx.fillStyle = couleur;
				ctx.beginPath();
				ctx.roundRect(-cote / 2, -cote / 2, cote, cote, interpoler(4, 1, pf));
				ctx.fill();
				ctx.restore();
			}
		}
	}

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as Donnees;
		const s = i.secondes;
		dessinerFond(ctx, i, p);
		dessinerEnTete(ctx, c.script, i, p);

		const titre = poserTitre(ctx, c, d.id, d.titre);
		dessinerTitre(ctx, c, titre, s, p);
		if (d.texte) {
			const bloc = mettreEnPage(ctx, d.texte, { niveau: "texte", ambiance: c.ambiance, x: 120, y: Math.max(352, titre.y + titre.hauteur + 16), largeur: 760, lignesMax: 2 });
			c.signalerCoupe(d.id, bloc, d.texte);
			const e = entree(s, 0.35, 0.5, 20);
			dessinerBlocVisible(ctx, bloc, p.encreDouce, e.alpha, e.dy);
		}

		// geste impact : micro-secousse de 3 px sur 4 images au moment de l'eclatement
		const image = Math.floor((s - IMPACT.debut) * 30);
		const secoue = c.impactGeste && image >= 0 && image < IMPACT.images;
		ctx.save();
		if (secoue) ctx.translate(image % 2 ? IMPACT.ampleur : -IMPACT.ampleur, image % 3 === 1 ? IMPACT.ampleur : -IMPACT.ampleur / 2);

		// pointille de carres qui relie les trois emplacements
		ctx.fillStyle = avecAlpha(p.encre, 0.2);
		for (let x = X.entree; x <= X.sortie; x += 18) {
			if (Math.abs(x - X.anneau) < ANNEAU.r + 16 || Math.abs(x - X.entree) < COTE / 2 + 8 || Math.abs(x - X.sortie) < COTE / 2 + 8) continue;
			const k = easeOutExpo(avancement(s, 0.2 + ((x - X.entree) / (X.sortie - X.entree)) * 0.6, 0.15));
			if (k <= 0) continue;
			const cote = 6 * k;
			ctx.beginPath();
			ctx.roundRect(x - cote / 2, Y - cote / 2, cote, cote, 1.5);
			ctx.fill();
		}

		if (secoue) {
			dessinerAnneau(ctx, s, p, avecAlpha(p.alerteClair, 0.55), -IMPACT.ampleur);
			dessinerAnneau(ctx, s, p, avecAlpha(p.accentClair, 0.55), IMPACT.ampleur);
		}
		dessinerAnneau(ctx, s, p, p.encre);

		// emplacement vide laisse par l'entree
		const g = easeInOutCubic(avancement(s, 1.2, 0.5));
		if (g > 0) {
			ctx.save();
			ctx.globalAlpha *= g;
			ctx.strokeStyle = avecAlpha(p.encre, 0.24);
			ctx.lineWidth = 2;
			ctx.setLineDash([10, 12]);
			ctx.beginPath();
			ctx.roundRect(X.entree - COTE / 2, Y - COTE / 2, COTE, COTE, 40);
			ctx.stroke();
			ctx.restore();
		}

		// tuile d'entree : arrivee, glissement vers l'anneau en retrecissant, effacement de l'icone
		const libEntree = ajusterLigne(ctx, d.entree.libelle, 30, 600, LIBELLE.largeur);
		signaler(c, d.id, libEntree.coupe, d.entree.libelle);
		if (s < IMPACT.debut) {
			const ea = easeOutExpo(avancement(s, 0.3, 0.5));
			const x = interpoler(X.entree - 120 * (1 - ea), X.anneau, g);
			const y = Y - 36 * cloche(g);
			const k = 1 - (1 - RETRECI) * g;
			dessinerTuile(ctx, x, y, COTE * k, p, { alpha: ea, ombre: 1 - g * 0.5 });
			const trace = s < 1.55 ? easeOutCubic(avancement(s, 0.4, 0.4)) : 1 - avancement(s, 1.55, 0.15);
			dessinerIcone(ctx, d.entree.icone, x, y, ICONE * k, { trace, couleur: p.encre, accent: p.accentClair, alpha: ea });
		}
		const el = easeOutExpo(avancement(s, 0.5, 0.5));
		dessinerLigne(ctx, libEntree, 600, X.entree, LIBELLE.y + 24 * (1 - el), p.encre, el * interpoler(1, 0.4, g));

		dessinerOperateur(ctx, d, s, p);
		dessinerCarres(ctx, s, p);

		// tuile de sortie : formee par les carres, rebond, bord d'accent, coche
		if (s >= 2.45) {
			const apparition = avancement(s, 2.58, 0.14);
			const k = 1.05 - 0.05 * ressort(avancement(s, 2.7, 0.45), c.depassement);
			const cote = COTE * (s < 2.7 ? 1 : k);
			dessinerTuile(ctx, X.sortie, Y, cote, p, { alpha: apparition });
			const bord = avancement(s, 2.7, 0.2);
			if (bord > 0) {
				ctx.save();
				ctx.globalAlpha *= bord;
				ctx.strokeStyle = p.accentClair;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.roundRect(X.sortie - cote / 2, Y - cote / 2, cote, cote, 40);
				ctx.stroke();
				ctx.restore();
			}
			dessinerIcone(ctx, d.sortie.icone, X.sortie, Y, ICONE * (cote / COTE), { trace: easeOutCubic(avancement(s, 2.45, 0.25)), couleur: p.encre, accent: p.accentClair });
			const pop = ressort(avancement(s, 2.85, 0.4), c.depassement);
			if (pop > 0) {
				const bx = X.sortie + cote / 2 - 22;
				const by = Y - cote / 2 + 22;
				ctx.save();
				ctx.translate(bx, by);
				ctx.scale(pop, pop);
				ctx.fillStyle = p.accentClair;
				ctx.strokeStyle = p.clair;
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.arc(0, 0, 26, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.restore();
				dessinerCoche(ctx, bx, by, 26 * pop, p.blanc, avancement(s, 2.95, 0.2));
			}
		}
		const libSortie = ajusterLigne(ctx, d.sortie.libelle, 30, 600, LIBELLE.largeur);
		signaler(c, d.id, libSortie.coupe, d.sortie.libelle);
		const es = easeOutExpo(avancement(s, 2.75, 0.45));
		dessinerLigne(ctx, libSortie, 600, X.sortie, LIBELLE.y + 24 * (1 - es), p.encre, es);
		ctx.restore();
	}

	return { dessiner };
}
