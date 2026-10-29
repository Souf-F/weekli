import type { MotsAccent, Palette, ScriptPub } from "@weekli/core";
import type { Ctx2D, InstantScene } from "../../scene";
import { avecAlpha, type Bloc, dessinerFondClair, dessinerMotParMot, finMotParMot, mettreEnPage, reinitialiserPolice } from "../../visuel";
import type { Contexte } from "../produit/commun";
import { dessinerLogo } from "../produit/logo";

// Outils communs aux scenes d'explication (design.md 8.17) : fond, en-tete, titre, tuiles, ressort.
// Fonctions pures du temps local : aucune memoire d'une image a l'autre.

export const MARGE = 120;
export const TITRE = { x: MARGE, y: 168, largeur: 980, lignesMax: 2 };
export const TUILE = { rayon: 40, bord: 2 };
const EN_TETE = { y: 92, logo: 32, nom: 30 }; // identique aux etapes : continuite d'une scene a l'autre
const GEIST = `"Geist", ui-sans-serif, system-ui, sans-serif`;

export type ContexteExplication = Contexte & { accentGeste: boolean; impactGeste: boolean; depassement: number };

export function versExplication(c: Contexte): ContexteExplication {
	const gestes = new Set(c.script.gestes ?? []);
	// ressort amorti : nette 2 % de depassement, editoriale 6 %
	return { ...c, accentGeste: gestes.has("accent"), impactGeste: gestes.has("impact"), depassement: c.ambiance === "editoriale" ? 0.06 : 0.02 };
}

// Ressort amorti de 0 vers 1, premier depassement egal a `depassement`
export function ressort(p: number, depassement: number): number {
	if (p <= 0) return 0;
	if (p >= 1) return 1;
	const b = 2.5 * Math.PI;
	const a = (-Math.log(depassement) * b) / Math.PI;
	return 1 - Math.exp(-a * p) * Math.cos(b * p);
}

export function dessinerFond(ctx: Ctx2D, i: InstantScene, p: Palette) {
	dessinerFondClair(ctx, p, { secondes: i.secondes, temps: i.temps, graine: i.graine });
}

export function dessinerEnTete(ctx: Ctx2D, script: ScriptPub, i: InstantScene, p: Palette) {
	dessinerLogo(ctx, script, i.contexte, MARGE, EN_TETE.y - EN_TETE.logo / 2, EN_TETE.logo, p.accentClair);
	ctx.save();
	ctx.textBaseline = "middle";
	ctx.fillStyle = p.encre;
	ctx.font = `600 ${EN_TETE.nom}px ${GEIST}`;
	if ("letterSpacing" in ctx) ctx.letterSpacing = "-0.3px";
	ctx.fillText(script.projet.nom, MARGE + EN_TETE.logo + 16, EN_TETE.y + 1, 900);
	reinitialiserPolice(ctx);
	ctx.restore();
}

// Titre en Titre (76 px), deux lignes au plus, mot par mot ; l'accent rebondit si le geste est choisi
export function poserTitre(ctx: Ctx2D, c: ContexteExplication, id: string, titre: MotsAccent): Bloc {
	const bloc = mettreEnPage(ctx, titre, { niveau: "titre", ambiance: c.ambiance, ...TITRE });
	c.signalerCoupe(id, bloc, titre.texte);
	return bloc;
}

export function dessinerTitre(ctx: Ctx2D, c: ContexteExplication, bloc: Bloc, secondes: number, p: Palette) {
	dessinerMotParMot(ctx, bloc, secondes, { debut: 0, couleur: p.encre, couleurAccent: p.accentClair, accent: c.accentGeste ? undefined : -1 });
	return finMotParMot(bloc);
}

// Ombre des objets : 0 30px 60px -28px `sombre` a 30 %. L'etalement negatif n'existe pas en canvas :
// on projette l'ombre d'une forme retrecie de 28 px dessinee hors champ.
export function ombre(ctx: Ctx2D, x: number, y: number, l: number, h: number, r: number, p: Palette, alpha = 1) {
	if (alpha <= 0) return;
	const t = ctx.getTransform();
	const k = Math.hypot(t.a, t.b);
	const loin = 4000;
	ctx.save();
	ctx.shadowColor = avecAlpha(p.sombre, 0.3 * alpha);
	ctx.shadowBlur = 60 * k;
	ctx.shadowOffsetX = loin * k;
	ctx.shadowOffsetY = 30 * k;
	ctx.fillStyle = "#000";
	ctx.beginPath();
	ctx.roundRect(x + 28 - loin, y + 28, Math.max(1, l - 56), Math.max(1, h - 56), Math.max(0, r - 20));
	ctx.fill();
	ctx.restore();
}

export type OptionsTuile = { fond?: string; bord?: string; epaisseurBord?: number; alpha?: number; ombre?: number };

// Tuile carree centree sur (cx, cy)
export function dessinerTuile(ctx: Ctx2D, cx: number, cy: number, cote: number, p: Palette, o: OptionsTuile = {}) {
	const alpha = o.alpha ?? 1;
	if (alpha <= 0 || cote <= 0) return;
	const x = cx - cote / 2;
	const y = cy - cote / 2;
	const r = Math.min(TUILE.rayon, cote / 2);
	ctx.save();
	ctx.globalAlpha *= alpha;
	ombre(ctx, x, y, cote, cote, r, p, o.ombre ?? 1);
	ctx.fillStyle = o.fond ?? p.surface;
	ctx.beginPath();
	ctx.roundRect(x, y, cote, cote, r);
	ctx.fill();
	ctx.strokeStyle = o.bord ?? avecAlpha(p.encre, 0.08);
	ctx.lineWidth = o.epaisseurBord ?? TUILE.bord;
	ctx.stroke();
	ctx.restore();
}

// Libelle d'une ligne centre (Texte 30 px, graisse 600) : reduit jusqu'a 80 %, puis coupe
export type Ligne1 = { texte: string; taille: number; coupe: boolean };
const memoire = new Map<string, Ligne1>();
export function ajusterLigne(ctx: Ctx2D, texte: string, taille: number, graisse: number, largeur: number): Ligne1 {
	const cle = `${texte}|${taille}|${graisse}|${largeur}`;
	const connu = memoire.get(cle);
	if (connu) return connu;
	ctx.save();
	let t = taille;
	const mesure = (s: string, tt: number) => {
		ctx.font = `${graisse} ${tt}px ${GEIST}`;
		return ctx.measureText(s).width;
	};
	while (mesure(texte, t) > largeur && t > taille * 0.8 + 1e-6) t -= taille * 0.04;
	let s = texte;
	let coupe = false;
	if (mesure(s, t) > largeur) {
		coupe = true;
		while (s.length > 1 && mesure(`${s}…`, t) > largeur) s = s.slice(0, -1);
		s = `${s.trimEnd()}…`;
	}
	ctx.restore();
	const r = { texte: s, taille: t, coupe };
	if (memoire.size > 256) memoire.clear();
	memoire.set(cle, r);
	return r;
}

export function dessinerLigne(ctx: Ctx2D, l: Ligne1, graisse: number, x: number, y: number, couleur: string, alpha = 1, alignement: CanvasTextAlign = "center") {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.font = `${graisse} ${l.taille}px ${GEIST}`;
	ctx.fillStyle = couleur;
	ctx.textAlign = alignement;
	ctx.textBaseline = "alphabetic";
	ctx.fillText(l.texte, x, y);
	ctx.restore();
}

// Coche dessinee (pastilles), centree sur (cx, cy), dans un cercle de rayon r
export function dessinerCoche(ctx: Ctx2D, cx: number, cy: number, r: number, couleur: string, part = 1) {
	if (part <= 0) return;
	const a = [cx - r * 0.42, cy + r * 0.02];
	const b = [cx - r * 0.1, cy + r * 0.34];
	const c = [cx + r * 0.46, cy - r * 0.3];
	const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
	const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
	const voulu = (l1 + l2) * part;
	ctx.save();
	ctx.strokeStyle = couleur;
	ctx.lineWidth = Math.max(2, r * 0.22);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(a[0], a[1]);
	const k1 = Math.min(1, voulu / l1);
	ctx.lineTo(a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1);
	if (voulu > l1) {
		const k2 = Math.min(1, (voulu - l1) / l2);
		ctx.lineTo(b[0] + (c[0] - b[0]) * k2, b[1] + (c[1] - b[1]) * k2);
	}
	ctx.stroke();
	ctx.restore();
}

// Signale un libelle coupe (meme canal que les blocs mis en page)
export function signaler(c: ContexteExplication, id: string, coupe: boolean, texte: string) {
	if (coupe) c.signalerCoupe(id, { coupe } as Bloc, texte);
}

// Hasard deterministe par index (trajectoires des carres)
export const bruit = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};
