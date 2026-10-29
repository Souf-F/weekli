import type { Carte, MotsAccent, Palette, ScriptPub } from "@weekli/core";
import type { Ctx2D, InstantScene } from "../../scene";
import { avecAlpha } from "../../visuel/couleur";
import { dessinerFondSombre, type OptionsFondSombre } from "../../visuel/fonds";
import { tuile } from "../../visuel/toiles";
import { type Ambiance, type Bloc, mettreEnPage, type OptionsMiseEnPage } from "../../visuel/typo";

// Briques communes des scenes de tension : identite du projet, mise en page centree, carte
// d'interface et bulle de discussion (pre-rendues une fois en tuiles), flou dependant de l'echelle.

// Ce que les scenes lisent du script en dehors de leur propre scene (le nom de la revelation, la typo)
export type Identite = {
	nom: string;
	ambiance: Ambiance;
	logo: "monogramme" | "image";
	monogramme: string; // 1 ou 2 caracteres
};

export function identiteDepuisScript(script: Pick<ScriptPub, "projet" | "marque">): Identite {
	const nom = script.projet.nom.trim();
	const choisi = [...(script.marque.monogramme ?? "").trim()].slice(0, 2).join("");
	return {
		nom,
		ambiance: script.marque.typo,
		logo: script.marque.logo,
		monogramme: (choisi || [...nom][0] || "?").toLocaleUpperCase("fr"),
	};
}

// Bloc dont le centre vertical (milieu des capitales des lignes extremes) tombe sur `centre`
export function blocCentre(ctx: Ctx2D, contenu: MotsAccent | string, o: Omit<OptionsMiseEnPage, "y">, centre: number): Bloc {
	const essai = mettreEnPage(ctx, contenu, { ...o, y: 0 });
	return mettreEnPage(ctx, contenu, { ...o, y: Math.round(centre - essai.hauteur / 2) });
}

// Premiere mise en page qui tient sans troncature (chacune descend deja jusqu'a 80 % de sa taille) ;
// les suivantes sont des replis pour les textes longs. Faute de mieux, la derniere (coupee).
export type Essai = { options: Omit<OptionsMiseEnPage, "y">; centre: number };

export function blocQuiTient(ctx: Ctx2D, contenu: MotsAccent | string, essais: Essai[]): Bloc {
	let bloc: Bloc | null = null;
	for (const e of essais) {
		bloc = blocCentre(ctx, contenu, e.options, e.centre);
		if (!bloc.coupe) return bloc;
	}
	return bloc as Bloc;
}

// Fond sombre de toutes les scenes de tension, avec les options propres a la scene
export function fondTension(ctx: Ctx2D, i: InstantScene, p: Palette, extra: Partial<OptionsFondSombre> = {}) {
	dessinerFondSombre(ctx, p, { secondes: i.secondes, temps: i.temps, graine: i.graine, ...extra });
}

// ctx.filter travaille en pixels du bitmap : le rayon de flou suit l'echelle courante (apercu 0,5)
export function flou(ctx: Ctx2D, rayon: number, disponible: boolean) {
	if (!disponible || rayon < 0.3) return;
	ctx.filter = `blur(${(rayon * ctx.getTransform().a).toFixed(2)}px)`;
}

const GEIST = `"Geist", ui-sans-serif, system-ui, sans-serif`;
const RESOLUTION = 2; // tuiles rendues au double : nettes quand la carte avance au premier plan

// Texte tronque avec points de suspension pour tenir dans `largeur`
function ajuster(ctx: Ctx2D, texte: string, largeur: number): string {
	if (ctx.measureText(texte).width <= largeur) return texte;
	let t = texte;
	while (t.length > 1 && ctx.measureText(`${t}…`).width > largeur) t = t.slice(0, -1);
	return `${t.trimEnd()}…`;
}

// --- carte d'interface (repetition, boucle) ----------------------------------------------------------

export const CARTE = { largeur: 384, hauteur: 232, rayon: 22 };

function peindreCarte(c: Ctx2D, carte: Carte, p: Palette) {
	const { largeur: l, hauteur: h, rayon } = CARTE;
	c.scale(RESOLUTION, RESOLUTION);
	c.fillStyle = p.surface;
	c.beginPath();
	c.roundRect(0, 0, l, h, rayon);
	c.fill();
	// pastille d'alerte avec une horloge (le sujet qui revient)
	c.fillStyle = avecAlpha(p.alerteClair, 0.13);
	c.beginPath();
	c.roundRect(30, 28, 60, 60, 14);
	c.fill();
	c.strokeStyle = p.alerteClair;
	c.lineWidth = 3;
	c.lineCap = "round";
	c.beginPath();
	c.arc(60, 58, 15, 0, Math.PI * 2);
	c.moveTo(60, 49);
	c.lineTo(60, 58);
	c.lineTo(67, 63);
	c.stroke();
	c.textBaseline = "alphabetic";
	c.fillStyle = p.encre;
	c.font = `600 31px ${GEIST}`;
	const yTitre = carte.detail ? 148 : 166;
	c.fillText(ajuster(c, carte.titre, l - 60), 30, yTitre);
	if (carte.detail) {
		c.fillStyle = p.alerteClair;
		c.beginPath();
		c.arc(36, 188, 5, 0, Math.PI * 2);
		c.fill();
		c.font = `500 22px ${GEIST}`;
		c.fillText(ajuster(c, carte.detail, l - 82), 50, 196);
	}
}

export function tuileCarte(carte: Carte, p: Palette) {
	const cle = `tension:carte:${carte.titre}|${carte.detail ?? ""}|${p.surface}${p.encre}${p.alerteClair}`;
	return tuile(cle, CARTE.largeur * RESOLUTION, CARTE.hauteur * RESOLUTION, (c) => peindreCarte(c, carte, p)) as CanvasImageSource;
}

export type PoseCarte = {
	x: number; // centre
	y: number;
	echelle?: number;
	angle?: number; // degres
	alpha?: number;
	ombre?: boolean;
	flou?: number; // rayon en pixels logiques
	inclinaison?: number; // cisaillement horizontal (fausse perspective des cartes en profondeur)
};

export function dessinerCarte(ctx: Ctx2D, i: InstantScene, carte: Carte, pose: PoseCarte) {
	const p = i.contexte.palette;
	const e = pose.echelle ?? 1;
	const alpha = pose.alpha ?? 1;
	if (alpha <= 0.01 || e <= 0.01) return;
	const { largeur: l, hauteur: h, rayon } = CARTE;
	ctx.save();
	ctx.translate(pose.x, pose.y);
	ctx.rotate(((pose.angle ?? 0) * Math.PI) / 180);
	if (pose.inclinaison) ctx.transform(1, pose.inclinaison, 0, 1, 0, 0);
	ctx.scale(e, e);
	ctx.globalAlpha = alpha;
	if (pose.ombre) {
		const a = ctx.getTransform();
		const k = Math.hypot(a.a, a.b);
		ctx.save();
		ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
		ctx.shadowBlur = 50 * k;
		ctx.shadowOffsetY = 26 * k;
		ctx.fillStyle = p.surface;
		ctx.beginPath();
		ctx.roundRect(-l / 2 + 6, -h / 2 + 6, l - 12, h - 12, rayon);
		ctx.fill();
		ctx.restore();
	}
	flou(ctx, (pose.flou ?? 0) * e, i.contexte.filtre);
	ctx.drawImage(tuileCarte(carte, p), -l / 2, -h / 2, l, h);
	ctx.restore();
}

// --- bulle de discussion (chorus) --------------------------------------------------------------------

export const BULLE = { hauteur: 78, rayon: 24, marge: 28, taille: 32, queue: 18 };

function mesureBulle(ctx: Ctx2D, texte: string): number {
	ctx.save();
	ctx.font = `600 ${BULLE.taille}px ${GEIST}`;
	if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
	const l = ctx.measureText(texte).width;
	ctx.restore();
	return Math.ceil(Math.min(l, 560) + BULLE.marge * 2);
}

export function tuileBulle(ctx: Ctx2D, texte: string, queue: "gauche" | "droite", p: Palette) {
	const l = mesureBulle(ctx, texte);
	const { hauteur: h, rayon, marge, taille, queue: q } = BULLE;
	const cle = `tension:bulle:${texte}|${queue}|${p.surface}${p.encre}`;
	const source = tuile(cle, l * RESOLUTION, (h + q) * RESOLUTION, (c) => {
		c.scale(RESOLUTION, RESOLUTION);
		c.fillStyle = p.surface;
		c.beginPath();
		c.roundRect(0, 0, l, h, rayon);
		// queue sous la bulle, cote locuteur
		const x = queue === "gauche" ? 30 : l - 30;
		const sens = queue === "gauche" ? 1 : -1;
		c.moveTo(x, h - 2);
		c.lineTo(x + sens * 2, h + q);
		c.lineTo(x + sens * 22, h - 2);
		c.fill();
		c.fillStyle = p.encre;
		c.font = `600 ${taille}px ${GEIST}`;
		c.textBaseline = "middle";
		c.fillText(ajuster(c, texte, l - marge * 2), marge, h / 2 + 1);
	});
	return { source: source as CanvasImageSource, largeur: l, hauteur: h + q };
}
