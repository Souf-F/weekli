import type { ScriptPub } from "@weekli/core";
import type { ContexteRendu, Ctx2D } from "../../scene";

// Logo du projet (design.md 8.11) pour l'en-tete des etapes et la fin : monogramme pixel (1 ou 2
// caracteres en Geist 800 rasterises sur 9 x 9 cellules, carres arrondis) ou image importee (id "logo").
// La revelation (F6) construit le meme motif avec ses particules : la grille est identique.

const GRILLE = 9;
const RESOLUTION = 12; // sous-pixels par cellule pour mesurer la couverture
const SEUIL = 0.42; // part d'encre au-dessus de laquelle la cellule est pleine

// Cellules pleines par monogramme. Depend seulement du texte et de la police (chargee avant le premier
// dessin, contrat du moteur) : calcule une fois, comme la memoire de mise en page de F5.
const cellules = new Map<string, boolean[]>();

function nouvelleToile(cote: number) {
	if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(cote, cote);
	return Object.assign(document.createElement("canvas"), { width: cote, height: cote });
}

export function cellulesMonogramme(texte: string): boolean[] {
	const connu = cellules.get(texte);
	if (connu) return connu;
	const cote = GRILLE * RESOLUTION;
	const toile = nouvelleToile(cote);
	const ctx = toile.getContext("2d") as Ctx2D | null;
	const vide = new Array<boolean>(GRILLE * GRILLE).fill(false);
	if (!ctx) return vide;
	// la taille est ajustee pour que le texte occupe la grille sans la deborder
	let taille = cote * 1.1;
	ctx.font = `800 ${taille}px "Geist", ui-sans-serif, system-ui, sans-serif`;
	const m = ctx.measureText(texte);
	const largeur = m.actualBoundingBoxRight + m.actualBoundingBoxLeft || m.width;
	const hauteur = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || taille * 0.72;
	taille *= Math.min((cote * 0.98) / Math.max(1, largeur), (cote * 0.98) / Math.max(1, hauteur));
	ctx.font = `800 ${taille}px "Geist", ui-sans-serif, system-ui, sans-serif`;
	const n = ctx.measureText(texte);
	ctx.fillStyle = "#000";
	ctx.textBaseline = "alphabetic";
	// centrage sur l'encre reelle du glyphe, pas sur sa chasse
	const x = cote / 2 - (n.actualBoundingBoxRight - n.actualBoundingBoxLeft) / 2;
	const y = (cote + n.actualBoundingBoxAscent - n.actualBoundingBoxDescent) / 2;
	ctx.fillText(texte, x, y);
	const pixels = ctx.getImageData(0, 0, cote, cote).data;
	const resultat = vide.slice();
	for (let ly = 0; ly < GRILLE; ly++) {
		for (let lx = 0; lx < GRILLE; lx++) {
			let somme = 0;
			for (let py = 0; py < RESOLUTION; py++) {
				for (let px = 0; px < RESOLUTION; px++) somme += pixels[((ly * RESOLUTION + py) * cote + lx * RESOLUTION + px) * 4 + 3];
			}
			resultat[ly * GRILLE + lx] = somme / (RESOLUTION * RESOLUTION * 255) > SEUIL;
		}
	}
	cellules.set(texte, resultat);
	return resultat;
}

export const texteMonogramme = (script: ScriptPub) =>
	(script.marque.monogramme?.trim() || [...script.projet.nom.trim()][0] || "?").slice(0, 2).toLocaleUpperCase("fr");

// Dessine le logo dans un carre de `cote` px dont le coin haut gauche est (x, y)
export function dessinerLogo(ctx: Ctx2D, script: ScriptPub, contexte: ContexteRendu, x: number, y: number, cote: number, couleur: string) {
	const image = script.marque.logo === "image" ? contexte.images.get("logo") : undefined;
	if (image) {
		const k = Math.min(cote / image.width, cote / image.height);
		const l = image.width * k;
		const h = image.height * k;
		ctx.drawImage(image, x + (cote - l) / 2, y + (cote - h) / 2, l, h);
		return;
	}
	const pleines = cellulesMonogramme(texteMonogramme(script));
	const pas = cote / GRILLE;
	const carre = pas * 0.84;
	const rayon = Math.max(0.5, pas * 0.16);
	ctx.save();
	ctx.fillStyle = couleur;
	ctx.beginPath();
	pleines.forEach((pleine, i) => {
		if (!pleine) return;
		const cx = x + (i % GRILLE) * pas + (pas - carre) / 2;
		const cy = y + Math.floor(i / GRILLE) * pas + (pas - carre) / 2;
		ctx.roundRect(cx, cy, carre, carre, rayon);
	});
	ctx.fill();
	ctx.restore();
}
