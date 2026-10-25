// Grille du logo (design.md 8.11) : le monogramme rasterise sur 9 x 9 cellules, ou le logo importe
// echantillonne en 24 x 24 sur son canal alpha. Les particules de la revelation construisent ces cellules.
// Calcul fait une fois par texte ou par image (memoire), la police doit etre chargee avant.

export type Grille = { colonnes: number; lignes: number; cellules: { c: number; l: number }[] };

const MONOGRAMME = 9;
const IMAGE = 24;
const PIXELS_CELLULE = 24;
const SEUIL = 0.42; // part de la cellule couverte par le glyphe pour qu'elle soit pleine

function toile(l: number, h: number) {
	const t = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(l, h) : Object.assign(document.createElement("canvas"), { width: l, height: h });
	return { toile: t, ctx: t.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D };
}

// Couverture moyenne de chaque cellule (canal alpha) au-dessus du seuil
function cellulesPleines(donnees: Uint8ClampedArray, cote: number, n: number, pixels: number, seuil: number) {
	const cellules: Grille["cellules"] = [];
	for (let l = 0; l < n; l++) {
		for (let c = 0; c < n; c++) {
			let somme = 0;
			for (let y = l * pixels; y < (l + 1) * pixels; y++) for (let x = c * pixels; x < (c + 1) * pixels; x++) somme += donnees[(y * cote + x) * 4 + 3];
			if (somme / (pixels * pixels * 255) >= seuil) cellules.push({ c, l });
		}
	}
	return cellules;
}

const memoireTexte = new Map<string, Grille>();

export function grilleMonogramme(texte: string): Grille {
	const connue = memoireTexte.get(texte);
	if (connue) return connue;
	const cote = MONOGRAMME * PIXELS_CELLULE;
	const { ctx } = toile(cote, cote);
	const famille = `"Geist", ui-sans-serif, system-ui, sans-serif`;
	ctx.font = `800 200px ${famille}`;
	const m = ctx.measureText(texte);
	const l = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
	const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
	// le glyphe remplit la grille sur son plus grand cote, centre sur sa boite reelle
	const echelle = (cote * 0.98) / Math.max(l, h, 1);
	ctx.translate(cote / 2, cote / 2);
	ctx.scale(echelle, echelle);
	ctx.fillStyle = "#000";
	ctx.fillText(texte, -(m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
	const donnees = ctx.getImageData(0, 0, cote, cote).data;
	const grille = { colonnes: MONOGRAMME, lignes: MONOGRAMME, cellules: cellulesPleines(donnees, cote, MONOGRAMME, PIXELS_CELLULE, SEUIL) };
	memoireTexte.set(texte, grille);
	return grille;
}

const memoireImage = new WeakMap<ImageBitmap, Grille>();

export function grilleImage(image: ImageBitmap): Grille {
	const connue = memoireImage.get(image);
	if (connue) return connue;
	const { ctx } = toile(IMAGE, IMAGE);
	const e = Math.min(IMAGE / image.width, IMAGE / image.height);
	const l = image.width * e;
	const h = image.height * e;
	ctx.drawImage(image, (IMAGE - l) / 2, (IMAGE - h) / 2, l, h);
	const grille = { colonnes: IMAGE, lignes: IMAGE, cellules: cellulesPleines(ctx.getImageData(0, 0, IMAGE, IMAGE).data, IMAGE, IMAGE, 1, 0.5) };
	memoireImage.set(image, grille);
	return grille;
}
