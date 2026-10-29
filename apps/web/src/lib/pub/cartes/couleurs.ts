import type { Hex } from "@weekli/core";

// Couleurs dominantes d'une image ou du logo, pour proposer la marque (design.md 8.11).
// Logique pure sur des pixels RGBA : l'echantillonnage d'une image vit dans `echantillon.ts`.

export type CouleurDominante = {
	hex: Hex;
	part: number; // part des pixels opaques, 0 a 1 (les teintes proches sont fusionnees)
	saturation: number; // HSL, 0 a 1
	luminosite: number; // HSL, 0 a 1
};

const NIVEAUX = 16; // 4 bits par canal : 4096 cases
const DISTANCE_FUSION = 56; // distance RGB en dessous de laquelle deux teintes comptent pour une
const ALPHA_MIN = 128;

const versHex = (r: number, g: number, b: number): Hex =>
	`#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function hsl(r: number, g: number, b: number): { saturation: number; luminosite: number } {
	const max = Math.max(r, g, b) / 255;
	const min = Math.min(r, g, b) / 255;
	const l = (max + min) / 2;
	const d = max - min;
	return { saturation: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), luminosite: l };
}

type Case = { n: number; r: number; g: number; b: number };

// Quantifie en histogramme, puis retient les teintes les plus presentes en fusionnant les voisines.
// Deterministe : memes pixels, memes couleurs. Les pixels translucides sont ignores.
export function extraireCouleurs(pixels: Uint8ClampedArray | Uint8Array, nombre = 5): CouleurDominante[] {
	const pas = 256 / NIVEAUX;
	const cases = new Map<number, Case>();
	let total = 0;
	for (let i = 0; i + 3 < pixels.length; i += 4) {
		if (pixels[i + 3] < ALPHA_MIN) continue;
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const cle = (Math.floor(r / pas) * NIVEAUX + Math.floor(g / pas)) * NIVEAUX + Math.floor(b / pas);
		const c = cases.get(cle);
		if (c) {
			c.n++;
			c.r += r;
			c.g += g;
			c.b += b;
		} else cases.set(cle, { n: 1, r, g, b });
		total++;
	}
	if (total === 0) return [];

	const classees = [...cases.entries()].sort((a, b) => b[1].n - a[1].n || a[0] - b[0]).map(([, c]) => c);
	const retenues: { r: number; g: number; b: number; n: number }[] = [];
	for (const c of classees) {
		const moy = { r: c.r / c.n, g: c.g / c.n, b: c.b / c.n };
		let proche: (typeof retenues)[number] | undefined;
		let meilleure = DISTANCE_FUSION;
		for (const r of retenues) {
			const d = Math.hypot(r.r - moy.r, r.g - moy.g, r.b - moy.b);
			if (d < meilleure) {
				meilleure = d;
				proche = r;
			}
		}
		if (proche) proche.n += c.n;
		else retenues.push({ ...moy, n: c.n });
	}

	return retenues
		.sort((a, b) => b.n - a.n)
		.slice(0, nombre)
		.map((c) => ({ hex: versHex(c.r, c.g, c.b), part: c.n / total, ...hsl(c.r, c.g, c.b) }));
}

export type PropositionMarque = {
	accent: Hex | null; // couleur proposee pour la marque ; null si l'image est neutre (gris, noir, blanc)
	candidats: Hex[]; // autres couleurs vives, par ordre de pertinence
};

const SATURATION_MIN = 0.35;
const LUMINOSITE_MIN = 0.12;
const LUMINOSITE_MAX = 0.8;
const PART_MIN = 0.01;

// Une couleur de marque est vive (saturee) et ni quasi noire ni quasi blanche ; on prefere
// celle qui est a la fois presente et saturee. Une image neutre ne propose rien (le gris
// par defaut du moteur s'applique).
export function proposerMarque(couleurs: CouleurDominante[]): PropositionMarque {
	const vives = couleurs
		.filter((c) => c.saturation >= SATURATION_MIN && c.luminosite >= LUMINOSITE_MIN && c.luminosite <= LUMINOSITE_MAX && c.part >= PART_MIN)
		.map((c) => ({ c, score: Math.sqrt(c.part) * c.saturation }))
		.sort((a, b) => b.score - a.score || a.c.hex.localeCompare(b.c.hex));
	return { accent: vives[0]?.c.hex ?? null, candidats: vives.slice(1).map((v) => v.c.hex) };
}
