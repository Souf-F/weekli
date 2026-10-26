import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { avancement, avecAlpha, easeInOutCubic, easeOutCubic, easeOutExpo, melanger, mettreEnPage } from "../../visuel";
import { dessinerIcone } from "../../visuel/icones";
import { dessinerBlocVisible } from "../produit/commun";
import {
	ajusterLigne,
	type ContexteExplication,
	dessinerEnTete,
	dessinerFond,
	dessinerLigne,
	dessinerTitre,
	dessinerTuile,
	poserTitre,
	ressort,
	signaler,
} from "./commun";

// Scene `flux` (design.md 8.17) : trois etapes reliees par des rails. Une impulsion d'accent
// parcourt chaque rail et fait naitre l'etape suivante ; la derniere se remplit (c'est « recu »).

type Donnees = Extract<ScenePub, { type: "flux" }>;

const Y = 650;
const XS = [360, 960, 1560];
const COTE = 200;
const ICONE = 96;
const RAILS = [
	[480, 840],
	[1080, 1440],
];
const ARRIVEES = [0.4, 1.5, 2.6];
const DEBUT_RAILS = [1.0, 2.1];
const RECAP = { debut: 3.2, duree: 0.7 };
const LIBELLE = { y: 818, largeur: 360 };
const DETAIL = { y: 836, largeur: 360 };
const IMPULSION = 80;

const cloche = (p: number) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p));

export function creerFlux(c: ContexteExplication): Scene {
	function rail(ctx: Ctx2D, [a, b]: number[], debut: number, s: number, p: Palette) {
		const rp = easeInOutCubic(avancement(s, debut, 0.5));
		if (rp <= 0) return;
		const front = a + (b - a) * rp;
		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.lineWidth = 6;
		ctx.strokeStyle = avecAlpha(p.encre, 0.15);
		ctx.beginPath();
		ctx.moveTo(a, Y);
		ctx.lineTo(front, Y);
		ctx.stroke();
		if (rp >= 1) {
			ctx.beginPath();
			ctx.moveTo(b - 14, Y - 14);
			ctx.lineTo(b, Y);
			ctx.lineTo(b - 14, Y + 14);
			ctx.stroke();
		}
		// impulsion : collee au front pendant le trace, puis s'eteint au bout du rail
		const fin = avancement(s, debut + 0.5, 0.18);
		if (fin < 1) impulsion(ctx, a, b, front, p, 1 - fin);
		ctx.restore();
	}

	function impulsion(ctx: Ctx2D, a: number, b: number, front: number, p: Palette, alpha: number) {
		const x0 = Math.max(a, front - IMPULSION);
		const x1 = Math.min(b, front);
		if (x1 <= x0 || alpha <= 0) return;
		ctx.save();
		ctx.globalAlpha *= alpha;
		ctx.lineCap = "round";
		ctx.lineWidth = 6;
		const g = ctx.createLinearGradient(x0, 0, x1, 0);
		g.addColorStop(0, avecAlpha(p.accentClair, 0));
		g.addColorStop(1, p.accentClair);
		ctx.strokeStyle = g;
		ctx.beginPath();
		ctx.moveTo(x0, Y);
		ctx.lineTo(x1, Y);
		ctx.stroke();
		ctx.restore();
	}

	function noeud(ctx: Ctx2D, d: Donnees, n: number, s: number, p: Palette, gonfle: number) {
		const t0 = ARRIVEES[n];
		const e = easeOutExpo(avancement(s, t0, 0.5));
		if (e <= 0) return;
		const x = XS[n];
		const y = Y + 40 * (1 - e);
		const dernier = n === 2;
		const f = dernier ? easeOutCubic(avancement(s, 2.85, 0.3)) : 0;
		// le dernier noeud se remplit avec un rebond (amplitude de l'ambiance)
		const bond = dernier ? (0.04 + c.depassement) * cloche(avancement(s, 2.85, 0.35)) : 0;
		const k = (0.9 + 0.1 * e) * (1 + gonfle + bond);
		const noeudData = d.noeuds[n];

		// couronne de 6 carres a l'arrivee des noeuds 2 et 3
		if (n > 0) {
			const q = avancement(s, t0, 0.45);
			if (q > 0 && q < 1) {
				ctx.save();
				ctx.fillStyle = p.accentClair;
				ctx.globalAlpha *= 1 - easeOutCubic(q);
				const r = 128 + 30 * easeOutCubic(q);
				for (let j = 0; j < 6; j++) {
					const a = ((j * 60 + 30) * Math.PI) / 180;
					ctx.beginPath();
					ctx.roundRect(x + Math.cos(a) * r - 8, Y + Math.sin(a) * r - 8, 16, 16, 4);
					ctx.fill();
				}
				ctx.restore();
			}
		}

		dessinerTuile(ctx, x, y, COTE * k, p, { alpha: e, fond: melanger(p.surface, p.accentClair, f), bord: f > 0 ? avecAlpha(p.accentClair, 1) : undefined });
		dessinerIcone(ctx, noeudData.icone, x, y, ICONE * k, {
			trace: easeOutCubic(avancement(s, t0 + 0.05, 0.4)),
			couleur: melanger(p.encre, p.blanc, f),
			accent: melanger(p.accentClair, p.blanc, f),
			alpha: e,
		});

		// pastille de numero, accrochee au coin haut gauche
		const pop = ressort(avancement(s, t0 + 0.15, 0.4), c.depassement);
		if (pop > 0) {
			const px = x - (COTE * k) / 2 + 14;
			const py = y - (COTE * k) / 2 + 14;
			ctx.save();
			ctx.translate(px, py);
			ctx.scale(pop, pop);
			ctx.fillStyle = melanger(p.accentClair, p.blanc, f);
			ctx.strokeStyle = p.clair;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(0, 0, 20, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = melanger(p.blanc, p.accentClair, f);
			ctx.font = `600 20px "Geist", ui-sans-serif, system-ui, sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(String(n + 1), 0, 1);
			ctx.restore();
		}

		const lib = ajusterLigne(ctx, noeudData.libelle, 30, 600, LIBELLE.largeur);
		signaler(c, d.id, lib.coupe, noeudData.libelle);
		const el = easeOutExpo(avancement(s, t0 + 0.15, 0.45));
		dessinerLigne(ctx, lib, 600, x, LIBELLE.y + 20 * (1 - el), p.encre, el);
		if (noeudData.detail) {
			const bloc = mettreEnPage(ctx, noeudData.detail, { niveau: "carte", ambiance: c.ambiance, x, y: DETAIL.y, largeur: DETAIL.largeur, lignesMax: 2, alignement: "centre" });
			c.signalerCoupe(d.id, bloc, noeudData.detail);
			const ed = easeOutExpo(avancement(s, t0 + 0.25, 0.45));
			dessinerBlocVisible(ctx, bloc, p.encreDouce, ed, 16 * (1 - ed));
		}
	}

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as Donnees;
		const s = i.secondes;
		dessinerFond(ctx, i, p);
		dessinerEnTete(ctx, c.script, i, p);
		dessinerTitre(ctx, c, poserTitre(ctx, c, d.id, d.titre), s, p);

		RAILS.forEach((r, n) => rail(ctx, r, DEBUT_RAILS[n], s, p));
		// recapitulation : une impulsion traverse les deux rails d'un coup
		const q = easeInOutCubic(avancement(s, RECAP.debut, RECAP.duree));
		if (q > 0 && q < 1) {
			const front = RAILS[0][0] + (RAILS[1][1] - RAILS[0][0]) * q;
			for (const [a, b] of RAILS) impulsion(ctx, a, b, front, p, 1);
		}
		const gonfle = 0.03 * cloche(avancement(s, RECAP.debut + 0.1, 0.6));
		for (let n = 0; n < 3; n++) if (d.noeuds[n]) noeud(ctx, d, n, s, p, gonfle);
	}

	return { dessiner };
}
