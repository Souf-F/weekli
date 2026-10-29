import { ACCENT_GRIS_DEFAUT, ALERTE_DEFAUT } from "./limites";
import type { Hex, ScriptPub } from "./types";

// Palette derivee de la marque, calculee en OKLCH avec contrastes WCAG garantis (design.md 8.4)

export type Palette = {
	sombre: Hex;
	sombreHalo: Hex;
	clair: Hex;
	encre: Hex;
	encreDouce: Hex;
	accentClair: Hex;
	accentSombre: Hex;
	alerteSombre: Hex;
	alerteClair: Hex;
	blanc: Hex;
	rayons: string; // rgba(), accentSombre a 18 %
	surface: Hex;
};

type Oklch = { l: number; c: number; h: number };

const BLANC = "#ffffff";
const PAS = 0.02;
const GRIS = 0.03; // chroma en dessous de laquelle la marque est consideree grise

const lineaire = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
const gamma = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);

function rgb(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
	const [r, g, b] = rgb(hex).map((x) => lineaire(x / 255));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Rapport de contraste WCAG entre deux couleurs #rrggbb
export function contraste(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
	return (x + 0.05) / (y + 0.05);
}

function hexVersOklch(hex: string): Oklch {
	const [r, g, b] = rgb(hex).map((x) => lineaire(x / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function oklchVersLineaire({ l, c, h }: Oklch): [number, number, number] {
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);
	const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
		-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
		-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
	];
}

const dansLeGamut = (rgbLin: number[]) => rgbLin.every((u) => u >= -1e-6 && u <= 1 + 1e-6);

// Convertit en #rrggbb ; hors gamut sRGB, la chroma est reduite (la luminosite et la teinte sont gardees)
function versHex(couleur: Oklch): Hex {
	let { c } = couleur;
	if (!dansLeGamut(oklchVersLineaire(couleur))) {
		let [bas, haut] = [0, c];
		for (let i = 0; i < 24; i++) {
			const milieu = (bas + haut) / 2;
			if (dansLeGamut(oklchVersLineaire({ ...couleur, c: milieu }))) bas = milieu;
			else haut = milieu;
		}
		c = bas;
	}
	const canaux = oklchVersLineaire({ ...couleur, c }).map((u) =>
		Math.round(Math.min(Math.max(gamma(Math.min(Math.max(u, 0), 1)), 0), 1) * 255),
	);
	return `#${canaux.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// Deplace la luminosite par pas de 0,02 dans le sens donne jusqu'au contraste demande (le contraste
// est mesure sur la couleur finale arrondie en 8 bits). S'arrete au noir ou au blanc.
function ajuster(base: Oklch, fond: string, ratio: number, sens: 1 | -1): Hex {
	for (let l = base.l; ; l += sens * PAS) {
		const lc = Math.min(Math.max(l, 0), 1);
		const hex = versHex({ ...base, l: lc });
		if (contraste(hex, fond) >= ratio || lc === 0 || lc === 1) return hex;
	}
}

export function paletteDepuisMarque(
	marque: Pick<ScriptPub["marque"], "primaire" | "accent" | "alerte">,
	accentParDefaut?: Hex,
): Palette {
	const { c, h } = hexVersOklch(marque.primaire);
	const teinte = (l: number, plafond: number): Oklch => ({ l, c: Math.min(c, plafond), h });

	const sombre = versHex(teinte(0.2, 0.14));
	const clair = versHex(teinte(0.975, 0.012));
	const baseAccent = hexVersOklch(
		marque.accent ?? (c < GRIS ? (accentParDefaut ?? ACCENT_GRIS_DEFAUT) : marque.primaire),
	);
	const alerte = hexVersOklch(marque.alerte ?? ALERTE_DEFAUT);
	const accentSombre = ajuster(baseAccent, sombre, 4.5, 1);

	return {
		sombre,
		sombreHalo: versHex(teinte(0.34, 0.2)),
		clair,
		encre: ajuster(teinte(0.2, 0.06), clair, 12, -1),
		encreDouce: ajuster(teinte(0.48, 0.04), clair, 4.5, -1),
		accentClair: ajuster(baseAccent, clair, 4.5, -1),
		accentSombre,
		alerteSombre: ajuster(alerte, sombre, 4.5, 1),
		alerteClair: ajuster(alerte, clair, 3, -1),
		blanc: BLANC,
		rayons: `rgba(${rgb(accentSombre).join(", ")}, 0.18)`,
		surface: BLANC,
	};
}
