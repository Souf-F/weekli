import { alea } from "../aleatoire";
import { type Ctx2D, HAUTEUR, LARGEUR } from "../scene";
import { avecAlpha } from "./couleur";
import { tuile } from "./toiles";

// Motifs de decor (design.md 8.6) : grain, carres qui derivent, rayons

const TAILLE_GRAIN = 256;

// Grain fin : tuile de bruit fixe (meme graine, memes pixels), posee a 3 % d'opacite. Fige d'une image
// a l'autre : un bruit qui change a chaque image ferait scintiller l'encodage H.264.
export function dessinerGrain(ctx: Ctx2D, opacite = 0.03) {
	const source = tuile("grain", TAILLE_GRAIN, TAILLE_GRAIN, (c) => {
		const img = c.createImageData(TAILLE_GRAIN, TAILLE_GRAIN);
		const hasard = alea(0x5eed);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = Math.round(hasard() * 255);
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
		c.putImageData(img, 0, 0);
	});
	const motif = ctx.createPattern(source as CanvasImageSource, "repeat");
	if (!motif) return;
	ctx.save();
	ctx.globalAlpha = opacite;
	ctx.fillStyle = motif;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	ctx.restore();
}

export type OptionsCarres = {
	graine: number; // change a chaque scene : les carres changent de place
	secondes: number; // temps local de la scene : derive continue
	couleur: string; // blanc sur fond sombre, encre sur fond clair
	opacite?: number; // multiplicateur global (fondu d'entree d'une scene, par exemple)
};

// 14 a 20 carres de 12 a 56 px, coins de 4 px, opacite 4 a 10 %, derive de 8 a 20 px/s
export function dessinerCarres(ctx: Ctx2D, { graine, secondes, couleur, opacite = 1 }: OptionsCarres) {
	const hasard = alea(graine ^ 0x9e3779b9);
	const nombre = 14 + Math.floor(hasard() * 7);
	ctx.save();
	ctx.fillStyle = couleur;
	for (let i = 0; i < nombre; i++) {
		const cote = 12 + hasard() * 44;
		const x0 = hasard() * LARGEUR;
		const y0 = hasard() * HAUTEUR;
		const angle = hasard() * Math.PI * 2;
		const vitesse = 8 + hasard() * 12;
		const alpha = 0.04 + hasard() * 0.06;
		// les carres sortis d'un bord reviennent par l'autre (tore elargi de la taille du carre)
		const l = LARGEUR + cote * 2;
		const h = HAUTEUR + cote * 2;
		const x = ((((x0 + Math.cos(angle) * vitesse * secondes + cote) % l) + l) % l) - cote;
		const y = ((((y0 + Math.sin(angle) * vitesse * secondes + cote) % h) + h) % h) - cote;
		ctx.globalAlpha = alpha * opacite;
		ctx.beginPath();
		ctx.roundRect(x, y, cote, cote, 4);
		ctx.fill();
	}
	ctx.restore();
}

export type OptionsRayons = {
	secondes: number;
	couleur: string; // palette.rayons
	intensite?: number; // 0 a 1 (apparition)
	ouverture?: number; // 0 a 1 : largeur des rayons, pour les ouvrir depuis rien
	x?: number;
	y?: number;
};

const NOMBRE_RAYONS = 16;
const ROTATION = (6 * Math.PI) / 180; // 6 degres par seconde

// 16 rayons pleins alternant avec 16 vides, rotation lente, fondus vers les bords par le degrade
export function dessinerRayons(ctx: Ctx2D, options: OptionsRayons) {
	const { secondes, couleur, intensite = 1, ouverture = 1, x = LARGEUR / 2, y = HAUTEUR / 2 } = options;
	if (intensite <= 0 || ouverture <= 0) return;
	const rayon = Math.hypot(LARGEUR, HAUTEUR) * 0.62;
	const pas = (Math.PI * 2) / NOMBRE_RAYONS;
	const largeur = (pas / 2) * ouverture;
	const depart = secondes * ROTATION;
	const degrade = ctx.createRadialGradient(x, y, 0, x, y, rayon);
	degrade.addColorStop(0, avecAlpha(couleur, 0.35 * intensite));
	degrade.addColorStop(0.1, avecAlpha(couleur, 0.9 * intensite));
	degrade.addColorStop(0.4, avecAlpha(couleur, 0.45 * intensite));
	degrade.addColorStop(1, avecAlpha(couleur, 0));
	ctx.save();
	ctx.fillStyle = degrade;
	ctx.beginPath();
	for (let i = 0; i < NOMBRE_RAYONS; i++) {
		const a = depart + i * pas - largeur / 2;
		ctx.moveTo(x, y);
		ctx.arc(x, y, rayon, a, a + largeur);
		ctx.closePath();
	}
	ctx.fill();
	ctx.restore();
}
