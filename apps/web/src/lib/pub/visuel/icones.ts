import { ICONE_DEFAUT, type Icone } from "@weekli/core";
import type { Ctx2D } from "../scene";
import { borner, easeOutCubic } from "./courbes";

// Icones des scenes d'explication (design.md 8.17) : glyphes vectoriels sur une grille de 24,
// traces au chemin (aucune image), bouts et angles arrondis, un seul element en couleur d'accent.
// Chaque forme est aplatie une fois en polylignes : on peut ainsi tracer le trait progressivement
// (le stylo avance a vitesse constante) et le dessin reste une fonction pure de `trace`.

type Pt = [number, number];
type Sommet = [number, number, number]; // x, y, rayon d'arrondi du coin (0 : coin net)
type Contour = { points: Pt[]; ferme: boolean };
type Accent = { contours: Contour[]; mode: "remplir" | "tracer"; regle?: CanvasFillRule };
type Def = { traits: Contour[]; accent: Accent };

const TAU = Math.PI * 2;

// Constructeur de chemin : segments droits (coins arrondis a la demande), courbes et arcs aplatis
class Chemin {
	s: Sommet[] = [];
	m(x: number, y: number, r = 0) {
		this.s.push([x, y, r]);
		return this;
	}
	l(x: number, y: number, r = 0) {
		this.s.push([x, y, r]);
		return this;
	}
	c(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
		const [x0, y0] = this.s[this.s.length - 1];
		for (let i = 1; i <= 14; i++) {
			const t = i / 14;
			const u = 1 - t;
			this.s.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y, 0]);
		}
		return this;
	}
	a(cx: number, cy: number, r: number, a0: number, a1: number) {
		const n = Math.max(6, Math.ceil((Math.abs(a1 - a0) * r) / 0.6));
		for (let i = 0; i <= n; i++) {
			const a = a0 + ((a1 - a0) * i) / n;
			this.s.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]);
		}
		return this;
	}
	fin(ferme = false): Contour {
		return { points: arrondir(this.s, ferme), ferme };
	}
}

// Coins arrondis : chaque sommet de rayon r est remplace par une courbe tangente aux deux segments
function arrondir(s: Sommet[], ferme: boolean): Pt[] {
	const sortie: Pt[] = [];
	const n = s.length;
	for (let i = 0; i < n; i++) {
		const [x, y, r] = s[i];
		const avant = ferme ? s[(i - 1 + n) % n] : s[i - 1];
		const apres = ferme ? s[(i + 1) % n] : s[i + 1];
		if (!r || !avant || !apres) {
			sortie.push([x, y]);
			continue;
		}
		const d1 = Math.hypot(avant[0] - x, avant[1] - y);
		const d2 = Math.hypot(apres[0] - x, apres[1] - y);
		const d = Math.min(r, d1 / 2, d2 / 2);
		const ax = x + ((avant[0] - x) * d) / d1;
		const ay = y + ((avant[1] - y) * d) / d1;
		const bx = x + ((apres[0] - x) * d) / d2;
		const by = y + ((apres[1] - y) * d) / d2;
		for (let k = 0; k <= 6; k++) {
			const t = k / 6;
			const u = 1 - t;
			sortie.push([u * u * ax + 2 * u * t * x + t * t * bx, u * u * ay + 2 * u * t * y + t * t * by]);
		}
	}
	return sortie;
}

// Formes de base
const poly = (pts: number[][], ferme = false): Contour => {
	const c = new Chemin();
	for (const [x, y, r = 0] of pts) c.l(x, y, r);
	return c.fin(ferme);
};
const ligne = (x1: number, y1: number, x2: number, y2: number) => poly([[x1, y1], [x2, y2]]);
const point = (x: number, y: number) => ligne(x, y, x + 0.01, y);
const cercle = (cx: number, cy: number, r: number): Contour => {
	const c = new Chemin().a(cx, cy, r, -Math.PI / 2, (3 * Math.PI) / 2);
	c.s.pop();
	return c.fin(true);
};
const rrect = (x: number, y: number, l: number, h: number, r: number) =>
	poly([[x, y, r], [x + l, y, r], [x + l, y + h, r], [x, y + h, r]], true);
// Pilule entre deux points, de largeur w
function capsule(x1: number, y1: number, x2: number, y2: number, w: number): Contour {
	const a = Math.atan2(y2 - y1, x2 - x1);
	return new Chemin().a(x2, y2, w / 2, a - Math.PI / 2, a + Math.PI / 2).a(x1, y1, w / 2, a + Math.PI / 2, a + (3 * Math.PI) / 2).fin(true);
}
// Pilule centree, d'axe incline (maillons)
const maillon = (cx: number, cy: number, demi: number, w: number, a: number) =>
	capsule(cx - Math.cos(a) * demi, cy - Math.sin(a) * demi, cx + Math.cos(a) * demi, cy + Math.sin(a) * demi, w);
// Arc epais a bouts ronds
function arcPlein(cx: number, cy: number, r: number, ep: number, a0: number, a1: number): Contour {
	const e = ep / 2;
	const p = (rr: number, a: number) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
	const c = new Chemin().a(cx, cy, r + e, a0, a1);
	const [fx, fy] = p(r, a1);
	c.a(fx, fy, e, a1, a1 + Math.PI).a(cx, cy, r - e, a1, a0);
	const [dx, dy] = p(r, a0);
	c.a(dx, dy, e, a0 + Math.PI, a0 + TAU);
	return c.fin(true);
}

const remplir = (...contours: Contour[]): Accent => ({ contours, mode: "remplir" });
const anneau = (...contours: Contour[]): Accent => ({ contours, mode: "remplir", regle: "evenodd" });
const tracer = (...contours: Contour[]): Accent => ({ contours, mode: "tracer" });

function etoile(): number[][] {
	const pts: number[][] = [];
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const r = i % 2 ? 4.2 : 9.6;
		pts.push([12 + Math.cos(a) * r, 12.9 + Math.sin(a) * r, 0.9]);
	}
	return pts;
}

function engrenage(): number[][] {
	const pts: number[][] = [];
	for (let k = 0; k < 8; k++) {
		const t = (k * Math.PI) / 4 - Math.PI / 2;
		for (const [da, r] of [[-0.31, 7], [-0.17, 9.6], [0.17, 9.6], [0.31, 7]]) pts.push([12 + Math.cos(t + da) * r, 12 + Math.sin(t + da) * r, 0.6]);
	}
	return pts;
}

// Crayon : repere le long de l'axe, de la pointe (4, 20) vers le haut droit
function crayon(): Def {
	const u = [Math.SQRT1_2, -Math.SQRT1_2];
	const v = [Math.SQRT1_2, Math.SQRT1_2];
	const P = (a: number, b: number, r = 0) => [4 + u[0] * a + v[0] * b, 20 + u[1] * a + v[1] * b, r];
	const long = 21.4;
	return {
		traits: [poly([P(0, 0, 0.6), P(5, 2.6), P(long, 2.6, 1), P(long, -2.6, 1), P(5, -2.6)], true), poly([P(5, -2.6), P(5, 2.6)]), poly([P(long - 4, -2.6), P(long - 4, 2.6)])],
		accent: remplir(poly([P(0, 0, 0.6), P(5, 2.6, 0.3), P(5, -2.6, 0.3)], true)),
	};
}

const DEG = Math.PI / 180;

const DEFINITIONS: Record<Icone, () => Def> = {
	document: () => ({
		traits: [poly([[6, 3, 1.6], [14, 3, 0.4], [19, 8, 0.4], [19, 21, 1.6], [6, 21, 1.6]], true), poly([[14, 3.4], [14, 8, 0.8], [18.6, 8]]), ligne(9, 15.2, 16, 15.2), ligne(9, 18.2, 13.4, 18.2)],
		accent: remplir(capsule(9.2, 11.6, 15.6, 11.6, 2.4)),
	}),
	message: () => ({
		traits: [poly([[3, 4.8, 3], [21, 4.8, 3], [21, 16.4, 3], [11.4, 16.4, 0.8], [6.6, 20.4, 0.6], [6.6, 16.4, 0.4], [3, 16.4, 3]], true)],
		accent: remplir(cercle(8, 10.6, 1.4), cercle(12, 10.6, 1.4), cercle(16, 10.6, 1.4)),
	}),
	video: () => ({
		traits: [rrect(2.5, 5, 19, 14, 3.6)],
		accent: remplir(poly([[10, 8.6, 0.9], [15.8, 12, 0.9], [10, 15.4, 0.9]], true)),
	}),
	image: () => ({
		traits: [rrect(3, 4, 18, 16, 3), poly([[3.6, 18.2], [9, 12.4, 0.9], [14.6, 18.4]]), poly([[12.8, 16.2], [15.8, 13.2, 0.9], [20.4, 17.6]])],
		accent: remplir(cercle(15.6, 8.8, 2.1)),
	}),
	calendrier: () => ({
		traits: [rrect(3, 5, 18, 16, 3), ligne(8, 3, 8, 7), ligne(16, 3, 16, 7), ligne(3.4, 10, 20.6, 10), point(7.5, 14), point(12, 14), point(16.5, 14), point(7.5, 17.6), point(12, 17.6)],
		accent: remplir(rrect(14.7, 15.8, 3.6, 3.6, 1)),
	}),
	horloge: () => ({
		traits: [cercle(12, 12, 9.2), ligne(12, 12, 12, 6.2)],
		accent: remplir(capsule(12, 12, 15.8, 14.4, 2.6)),
	}),
	personne: () => ({
		traits: [new Chemin().a(12, 21.2, 7.6, Math.PI, TAU).fin()],
		accent: remplir(cercle(12, 7.6, 4.2)),
	}),
	equipe: () => ({
		traits: [new Chemin().a(12, 19.8, 6.2, Math.PI, TAU).fin(), cercle(5.6, 9.8, 2.3), cercle(18.4, 9.8, 2.3), new Chemin().a(5.4, 19.6, 3.4, Math.PI, 1.5 * Math.PI).fin(), new Chemin().a(18.6, 19.6, 3.4, 1.5 * Math.PI, TAU).fin()],
		accent: remplir(cercle(12, 7.6, 3.2)),
	}),
	cadenas: () => ({
		traits: [new Chemin().m(8, 11).l(8, 7.6).a(12, 7.6, 4, Math.PI, TAU).l(16, 11).fin(), rrect(4.5, 11, 15, 10, 2.6)],
		accent: remplir(cercle(12, 15, 1.8), capsule(12, 15.4, 12, 18.2, 1.6)),
	}),
	bouclier: () => ({
		traits: [new Chemin().m(12, 2.8, 1).l(19.6, 5.6, 1.2).l(19.6, 11.4).c(19.6, 16.4, 16.2, 19.6, 12, 21.2).c(7.8, 19.6, 4.4, 16.4, 4.4, 11.4).l(4.4, 5.6, 1.2).fin(true)],
		accent: tracer(poly([[8.6, 12], [11, 14.4, 0.4], [15.6, 9.6]])),
	}),
	eclair: () => {
		const forme = poly([[13.4, 2.6, 0.8], [4.8, 13.4, 0.8], [11.4, 13.4, 0.6], [10.6, 21.4, 0.8], [19.2, 10.4, 0.8], [12.6, 10.4, 0.6]], true);
		return { traits: [forme], accent: remplir(forme) };
	},
	etoile: () => ({
		traits: [poly(etoile(), true)],
		accent: remplir(cercle(12, 12.9, 2)),
	}),
	coeur: () => ({
		traits: [new Chemin().m(12, 20.4).c(6, 16, 2.8, 12.6, 3.3, 8.8).c(3.8, 5.2, 8.6, 3.6, 12, 7.4).c(15.4, 3.6, 20.2, 5.2, 20.7, 8.8).c(21.2, 12.6, 18, 16, 12, 20.4).fin(true)],
		accent: remplir(new Chemin().m(12, 20.4).c(6, 16, 2.8, 12.6, 3.3, 8.8).c(3.8, 5.2, 8.6, 3.6, 12, 7.4).fin(true)),
	}),
	panier: () => ({
		traits: [poly([[3, 9.6, 1.2], [21, 9.6, 1.2], [18.6, 20.6, 1.6], [5.4, 20.6, 1.6]], true), ligne(9, 13, 9.4, 17.2), ligne(12, 13, 12, 17.2), ligne(15, 13, 14.6, 17.2)],
		accent: remplir(arcPlein(12, 9.6, 5.4, 1.8, Math.PI, TAU)),
	}),
	lien: () => ({
		traits: [maillon(8.6, 15.4, 3.6, 6, -45 * DEG)],
		accent: anneau(maillon(15.4, 8.6, 3.6, 6.8, -45 * DEG), maillon(15.4, 8.6, 3.6, 3, -45 * DEG)),
	}),
	dossier: () => ({
		traits: [poly([[3, 6, 1.6], [9.6, 6, 0.8], [11.8, 8.6, 0.8], [21, 8.6, 1.6], [21, 19.6, 1.8], [3, 19.6, 1.8]], true)],
		accent: remplir(poly([[3, 6, 1.6], [9.6, 6, 0.8], [11.8, 8.6, 0.3], [3, 8.6, 0.3]], true)),
	}),
	courrier: () => ({
		traits: [rrect(2.6, 5, 18.8, 14, 2.6), poly([[3.6, 6.6], [12, 13, 0.9], [20.4, 6.6]])],
		accent: remplir(poly([[3.6, 6, 0.6], [20.4, 6, 0.6], [12, 12.4, 0.9]], true)),
	}),
	telephone: () => ({
		traits: [new Chemin().m(5.2, 3.2).l(8.6, 3.2, 1.2).l(10.2, 7.8, 1).l(7.9, 9.6).c(9.1, 12.4, 11.6, 14.9, 14.4, 16.1).l(16.2, 13.8, 1).l(20.8, 15.4, 1.2).l(20.8, 18.8).c(20.8, 19.9, 19.9, 20.8, 18.8, 20.8).c(10.4, 20.4, 3.6, 13.6, 3.2, 5.2).c(3.2, 4.1, 4.1, 3.2, 5.2, 3.2).fin(true)],
		accent: remplir(arcPlein(13.4, 10.6, 3.8, 1.7, -Math.PI / 2 + 0.14, -0.14), arcPlein(13.4, 10.6, 7.2, 1.7, -Math.PI / 2 + 0.12, -0.12)),
	}),
	graphique: () => ({
		traits: [poly([[3.6, 3.6], [3.6, 20.4, 1.2], [20.4, 20.4]]), ligne(8.4, 16.6, 8.4, 12.8), ligne(12.6, 16.6, 12.6, 9.6)],
		accent: remplir(capsule(17, 16.8, 17, 5.4, 2.8)),
	}),
	coche: () => ({
		traits: [cercle(12, 12, 9.2)],
		accent: tracer(poly([[7.8, 12.2], [10.8, 15.2, 0.4], [16.4, 9.4]])),
	}),
	nuage: () => ({
		traits: [new Chemin().a(17, 14.8, 3.7, 90 * DEG, -100 * DEG).a(11.5, 11.5, 5.2, -5 * DEG, -170 * DEG).a(6.5, 14.6, 3.9, -95 * DEG, -270 * DEG).fin(true)],
		accent: tracer(ligne(12, 16.2, 12, 11.8), poly([[9.8, 13.8], [12, 11.6, 0.4], [14.2, 13.8]])),
	}),
	engrenage: () => ({
		traits: [poly(engrenage(), true)],
		accent: remplir(cercle(12, 12, 3)),
	}),
	loupe: () => ({
		traits: [cercle(10.4, 10.4, 6.6), ligne(15.3, 15.3, 20.4, 20.4)],
		accent: remplir(cercle(10.4, 10.4, 6.6)),
	}),
	crayon,
	micro: () => ({
		traits: [rrect(9, 2.6, 6, 12, 3), new Chemin().a(12, 10.6, 6.4, 0, Math.PI).fin(), ligne(12, 17.2, 12, 20.6), ligne(8.4, 20.6, 15.6, 20.6)],
		accent: remplir(rrect(9, 2.6, 6, 12, 3)),
	}),
	musique: () => ({
		traits: [poly([[9.6, 17], [9.6, 5.4, 0.8], [19.6, 3.4, 0.8], [19.6, 15]])],
		accent: remplir(cercle(7, 17.4, 2.7), cercle(17, 15.4, 2.7)),
	}),
	cle: () => ({
		traits: [ligne(10.9, 13.1, 20, 4), ligne(17, 7, 19.2, 9.2), ligne(14.4, 9.6, 16.2, 11.4)],
		accent: anneau(cercle(7.6, 16.4, 4.6), cercle(7.6, 16.4, 2.1)),
	}),
	maison: () => ({
		traits: [poly([[2.8, 11.4], [12, 3.6, 1], [21.2, 11.4]]), poly([[5.4, 9.4], [5.4, 20.4, 1.4], [18.6, 20.4, 1.4], [18.6, 9.4]])],
		accent: remplir(poly([[10, 20.4], [10, 15.4, 1], [14, 15.4, 1], [14, 20.4]], true)),
	}),
};

type Icon = Def & { longueurs: number[]; total: number; centre: Pt; plein?: { traits: Path2D; accent: Path2D } };
const cache = new Map<Icone, Icon>();

const longueur = (c: Contour) => {
	const p = c.ferme ? [...c.points, c.points[0]] : c.points;
	let l = 0;
	for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
	return l;
};

function charger(nom: Icone): Icon {
	const connue = cache.get(nom);
	if (connue) return connue;
	const def = DEFINITIONS[nom]();
	const longueurs = def.traits.map(longueur);
	const tous = def.accent.contours.flatMap((c) => c.points);
	const centre: Pt = [tous.reduce((a, p) => a + p[0], 0) / tous.length, tous.reduce((a, p) => a + p[1], 0) / tous.length];
	const icone: Icon = { ...def, longueurs, total: longueurs.reduce((a, b) => a + b, 0), centre };
	cache.set(nom, icone);
	return icone;
}

// Geometrie seule (tests) : contours aplatis sur la grille de 24
export function geometrieIcone(nom: Icone) {
	const i = charger(nom);
	return { traits: i.traits.map((c) => c.points), accent: i.accent.contours.map((c) => c.points), mode: i.accent.mode, longueur: i.total };
}

function chemin(ctx: Ctx2D | Path2D, c: Contour, part = 1) {
	const pts = c.ferme ? [...c.points, c.points[0]] : c.points;
	ctx.moveTo(pts[0][0], pts[0][1]);
	if (part >= 1) {
		for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
		if (c.ferme) ctx.closePath();
		return;
	}
	let reste = longueur(c) * part;
	for (let i = 1; i < pts.length && reste > 0; i++) {
		const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
		const k = Math.min(1, reste / d);
		ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
		reste -= d;
	}
}

export const ICONE_TRAIT = 5; // px, quelle que soit la taille

export type OptionsIcone = {
	trace?: number; // 0 a 1 : avancement du stylo (1 : icone complete)
	couleur: string; // traits (encre, ou blanc sur tuile d'accent)
	accent: string; // element rempli (accentClair, ou blanc)
	epaisseur?: number; // px
	alpha?: number;
};

// Icone centree sur (cx, cy), de `taille` px. Le stylo trace les traits a vitesse constante, puis
// l'element d'accent apparait (pop depuis son centre, ou trace s'il s'agit d'un trait).
export function dessinerIcone(ctx: Ctx2D, nom: Icone, cx: number, cy: number, taille: number, o: OptionsIcone) {
	const trace = borner(o.trace ?? 1);
	if (trace <= 0 || (o.alpha ?? 1) <= 0) return;
	const icone = charger(nom in DEFINITIONS ? nom : ICONE_DEFAUT);
	const k = taille / 24;
	ctx.save();
	ctx.globalAlpha *= o.alpha ?? 1;
	ctx.translate(cx - 12 * k, cy - 12 * k);
	ctx.scale(k, k);
	ctx.lineWidth = (o.epaisseur ?? ICONE_TRAIT) / k;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	const { accent } = icone;
	const pTraits = borner(trace / 0.78);
	const pAccent = borner((trace - 0.62) / 0.38);
	const complet = trace >= 1 && typeof Path2D !== "undefined";
	if (complet && !icone.plein) {
		const traits = new Path2D();
		for (const c of icone.traits) chemin(traits, c);
		const acc = new Path2D();
		for (const c of accent.contours) chemin(acc, c);
		icone.plein = { traits, accent: acc };
	}

	// element d'accent rempli : sous les traits
	if (accent.mode === "remplir" && pAccent > 0) {
		ctx.save();
		const e = easeOutCubic(pAccent);
		const s = 0.4 + 0.6 * e + 0.12 * Math.sin(Math.PI * pAccent) * (1 - pAccent);
		ctx.translate(icone.centre[0], icone.centre[1]);
		ctx.scale(s, s);
		ctx.translate(-icone.centre[0], -icone.centre[1]);
		ctx.globalAlpha *= e;
		ctx.fillStyle = o.accent;
		if (complet && icone.plein) ctx.fill(icone.plein.accent, accent.regle ?? "nonzero");
		else {
			ctx.beginPath();
			for (const c of accent.contours) chemin(ctx, c);
			ctx.fill(accent.regle ?? "nonzero");
		}
		ctx.restore();
	}

	ctx.strokeStyle = o.couleur;
	if (complet && icone.plein) ctx.stroke(icone.plein.traits);
	else {
		ctx.beginPath();
		let fait = 0;
		const voulu = icone.total * pTraits;
		icone.traits.forEach((c, i) => {
			const l = icone.longueurs[i];
			if (fait >= voulu) return;
			chemin(ctx, c, Math.min(1, (voulu - fait) / l));
			fait += l;
		});
		ctx.stroke();
	}

	if (accent.mode === "tracer" && pAccent > 0) {
		ctx.strokeStyle = o.accent;
		ctx.lineWidth *= 1.35;
		ctx.beginPath();
		for (const c of accent.contours) chemin(ctx, c, easeOutCubic(pAccent));
		ctx.stroke();
	}
	ctx.restore();
}
