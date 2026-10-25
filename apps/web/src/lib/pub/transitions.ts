import type { Palette } from "@weekli/core";
import { alea } from "./aleatoire";
import type { Ctx2D, RegistreTransitions, Toile, Transitionneur } from "./scene";
import { HAUTEUR, LARGEUR } from "./scene";
import { lireCouleur, melanger } from "./visuel/couleur";
import { borner, easeInCubic, easeInOutCubic, easeOutCubic, lisser } from "./visuel/courbes";
import { toileDeTravail } from "./visuel/toiles";

// Transitions de design.md 8.8. Le moteur fournit deux couches deja dessinees (scene precedente et
// courante, en pixels reels) et le progres de 0 a 1 ; la duree vient de DUREES_TRANSITION (core).
// Fonctions pures du progres : le hasard du glitch depend du numero d'image de la transition.

const source = (t: Toile) => t as CanvasImageSource;
const poser = (ctx: Ctx2D, couche: Toile, alpha = 1) => {
	ctx.globalAlpha = alpha;
	ctx.drawImage(source(couche), 0, 0, LARGEUR, HAUTEUR);
	ctx.globalAlpha = 1;
};

const coupe: Transitionneur = (ctx, _avant, apres) => poser(ctx, apres);

// --- glitch (0,3 s, 9 images) ---------------------------------------------------------------------

const IMAGES_GLITCH = 9;

// Separe la couche en deux canaux (rouge, vert + bleu) et les recompose decales de +-d pixels
function separerCanaux(couche: Toile, d: number): Toile {
	const l = couche.width;
	const h = couche.height;
	const rouge = toileDeTravail("glitch:r", l, h);
	rouge.ctx.drawImage(source(couche), 0, 0);
	rouge.ctx.globalCompositeOperation = "multiply";
	rouge.ctx.fillStyle = "#ff0000";
	rouge.ctx.fillRect(0, 0, l, h);
	const cyan = toileDeTravail("glitch:c", l, h);
	cyan.ctx.drawImage(source(couche), 0, 0);
	cyan.ctx.globalCompositeOperation = "multiply";
	cyan.ctx.fillStyle = "#00ffff";
	cyan.ctx.fillRect(0, 0, l, h);
	const sortie = toileDeTravail("glitch:sortie", l, h);
	sortie.ctx.drawImage(source(rouge.toile), -d, 0);
	sortie.ctx.globalCompositeOperation = "lighter";
	sortie.ctx.drawImage(source(cyan.toile), d, 0);
	return sortie.toile;
}

// Bruit plein cadre a basse definition, agrandi sans lissage (gros grains numeriques)
function bruit(graine: number): Toile {
	const l = 240;
	const h = 135;
	const { toile, ctx } = toileDeTravail("glitch:bruit", l, h);
	const img = ctx.createImageData(l, h);
	const hasard = alea(graine);
	for (let y = 0; y < h; y++) {
		const bande = hasard() < 0.12 ? 255 : 0; // quelques lignes blanches horizontales
		for (let x = 0; x < l; x++) {
			const i = (y * l + x) * 4;
			const v = Math.max(bande * hasard(), hasard() * 255);
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	return toile;
}

// 6 a 10 tranches horizontales decalees (+-80 px), decalage RVB +-12 px, 2 images de bruit au milieu,
// puis la nouvelle scene. L'intensite monte puis retombe autour de la bascule.
const glitch: Transitionneur = (ctx, avant, apres, progres) => {
	const image = Math.min(IMAGES_GLITCH - 1, Math.floor(progres * IMAGES_GLITCH));
	const bascule = 4; // images 4 et 5 : bruit ; avant cela l'ancienne scene, apres la nouvelle
	const couche = image < bascule ? avant : apres;
	const intensite = image < bascule ? (image + 1) / bascule : 1 - (image - bascule) / (IMAGES_GLITCH - bascule);
	const echelle = couche.width / LARGEUR;
	const hasard = alea(0x6117c4 + image * 104729);

	const composee = separerCanaux(couche, 12 * intensite * echelle);
	poser(ctx, composee);
	// tranches : bandes de l'image composee reposees avec un decalage horizontal
	const tranches = 6 + Math.floor(hasard() * 5);
	for (let i = 0; i < tranches; i++) {
		const y = hasard() * HAUTEUR;
		const h = 8 + hasard() * 90;
		const dx = (hasard() * 2 - 1) * 80 * intensite;
		ctx.drawImage(source(composee), 0, y * echelle, couche.width, h * echelle, dx, y, LARGEUR, h);
	}
	if (image === bascule || image === bascule + 1) {
		ctx.save();
		ctx.imageSmoothingEnabled = false;
		ctx.globalAlpha = image === bascule ? 0.55 : 0.3;
		ctx.globalCompositeOperation = "screen";
		ctx.drawImage(source(bruit(0xb1 + image)), 0, 0, LARGEUR, HAUTEUR);
		ctx.restore();
	}
};

// --- flou (0,5 s) ---------------------------------------------------------------------------------

const REDUCTION_FLOU = 4; // le flou est calcule au quart de la definition : meme rendu, 16 fois moins de pixels
const FLOU_MAX = 24;

// Dessine la couche floutee de `rayon` px (repere 1080p), agrandie de `zoom` autour du centre
function poserFloue(ctx: Ctx2D, couche: Toile, rayon: number, zoom: number, alpha: number) {
	const l = LARGEUR * zoom;
	const h = HAUTEUR * zoom;
	const x = (LARGEUR - l) / 2;
	const y = (HAUTEUR - h) / 2;
	ctx.globalAlpha = alpha;
	if (rayon < 0.5) {
		ctx.drawImage(source(couche), x, y, l, h);
	} else {
		const pl = Math.round(LARGEUR / REDUCTION_FLOU);
		const ph = Math.round(HAUTEUR / REDUCTION_FLOU);
		const petit = toileDeTravail("flou:petit", pl, ph);
		petit.ctx.drawImage(source(couche), 0, 0, pl, ph);
		const floue = toileDeTravail("flou:floue", pl, ph);
		floue.ctx.filter = `blur(${rayon / REDUCTION_FLOU}px)`;
		// marge : le flou ne doit pas assombrir les bords (on etire les pixels du bord)
		floue.ctx.drawImage(source(petit.toile), -2, -2, pl + 4, ph + 4);
		floue.ctx.filter = "none";
		// sous 4 px, fondu entre net et flou : evite le saut de definition de la reduction
		const net = borner(1 - rayon / 4);
		if (net > 0) ctx.drawImage(source(couche), x, y, l, h);
		ctx.globalAlpha = alpha * (1 - net);
		ctx.drawImage(source(floue.toile), x, y, l, h);
	}
	ctx.globalAlpha = 1;
}

const filtreDisponible = (ctx: Ctx2D) => "filter" in ctx;

// Ancienne scene floue (0 a 24 px) et agrandie (1 a 1,08), nouvelle scene qui passe de floue a nette.
// Sans ctx.filter : fondu enchaine avec agrandissement.
const flou: Transitionneur = (ctx, avant, apres, progres) => {
	const e = easeInOutCubic(progres);
	const fondu = lisser(0.3, 0.7, progres);
	if (!filtreDisponible(ctx)) {
		poserFloue(ctx, avant, 0, 1 + 0.08 * e, 1);
		poserFloue(ctx, apres, 0, 1 + 0.04 * (1 - e), fondu);
		return;
	}
	poserFloue(ctx, avant, FLOU_MAX * easeOutCubic(borner(progres / 0.7)), 1 + 0.08 * e, 1);
	if (fondu > 0) poserFloue(ctx, apres, FLOU_MAX * (1 - easeOutCubic(borner((progres - 0.3) / 0.7))), 1 + 0.04 * (1 - e), fondu);
};

// --- pixels (0,6 s) -------------------------------------------------------------------------------

const CASE = 64;
const ETALEMENT = 1; // part de la duree d'une phase consacree a la propagation de la vague

// Couleur du fond suivant, lue sur un pixel de la couche (pres d'un bord, loin du texte)
function couleurDuFond(apres: Toile, palette: Palette): string {
	try {
		const c = apres.getContext("2d") as Ctx2D;
		const [r, v, b] = c.getImageData(Math.round(apres.width / 2), 2, 1, 1).data;
		return `rgb(${r}, ${v}, ${b})`;
	} catch {
		return palette.sombre;
	}
}

// Grille de carres de 64 px aux couleurs du fond suivant : ils couvrent l'ecran en vague depuis le
// centre (premiere moitie), puis s'effacent en vague depuis le centre en devoilant la nouvelle scene.
const pixels: Transitionneur = (ctx, avant, apres, progres, palette) => {
	const couvre = progres < 0.5;
	poser(ctx, couvre ? avant : apres);
	const phase = couvre ? progres / 0.5 : (progres - 0.5) / 0.5;
	const fond = couleurDuFond(apres, palette);
	const [r, v, b] = lireCouleur(fond);
	const clair = 0.2126 * r + 0.7152 * v + 0.0722 * b > 140;
	const filet = melanger(fond, clair ? "#000000" : "#ffffff", clair ? 0.08 : 0.16);
	const colonnes = Math.ceil(LARGEUR / CASE) + 1;
	const rangees = Math.ceil(HAUTEUR / CASE) + 1;
	const ox = (LARGEUR / 2) % CASE - CASE / 2;
	const oy = (HAUTEUR / 2) % CASE - CASE / 2;
	const distanceMax = Math.hypot(LARGEUR / 2, HAUTEUR / 2);
	const pleins = new Path2D();
	const points = new Path2D();
	for (let j = -1; j < rangees; j++) {
		for (let i = -1; i < colonnes; i++) {
			const cx = ox + i * CASE + CASE / 2;
			const cy = oy + j * CASE + CASE / 2;
			const d = Math.hypot(cx - LARGEUR / 2, cy - HAUTEUR / 2) / distanceMax;
			const q = phase * (1 + ETALEMENT) - d * ETALEMENT;
			const taille = couvre ? easeOutCubic(borner(q)) : 1 - easeInCubic(borner(q));
			if (taille > 0.02) {
				const c = CASE * taille + (taille > 0.98 ? 1 : 0);
				pleins.rect(cx - c / 2, cy - c / 2, c, c);
			} else if (couvre && q > -0.18) {
				// avant-garde de la vague : petits points qui annoncent les carres
				points.rect(cx - 4, cy - 4, 8, 8);
			}
		}
	}
	ctx.save();
	ctx.fillStyle = fond;
	ctx.fill(pleins);
	ctx.fill(points);
	ctx.strokeStyle = filet;
	ctx.lineWidth = 1.5;
	ctx.stroke(pleins);
	ctx.restore();
};

export const TRANSITIONS_PAR_DEFAUT: RegistreTransitions = { coupe, glitch, flou, pixels };
