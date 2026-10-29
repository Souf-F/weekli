import { type Geste, type Palette, paletteDepuisMarque, type ScriptPub } from "@weekli/core";
import type { ContexteRendu } from "./scene";

// Polices a charger avant tout dessin (architecture.md 7.8). `famille` : "600 48px Nom"
export async function chargerPolices(specs: string[]): Promise<void> {
	await Promise.all(specs.map((spec) => document.fonts.load(spec)));
	await document.fonts.ready;
}

export function palettePourScript(script: ScriptPub, accentParDefaut?: `#${string}`): Palette {
	return paletteDepuisMarque(script.marque, accentParDefaut);
}

// Un geste est joue s'il est choisi, ou si le script n'en choisit aucun (defauts du catalogue)
export const gestePresent = (contexte: Pick<ContexteRendu, "gestes">, geste: Geste) => !contexte.gestes || contexte.gestes.has(geste);

// Le flou passe par ctx.filter ; Safari ne le gere pas (repli : pas de flou)
function filtreDisponible(): boolean {
	const toile = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
	const ctx = toile.getContext("2d");
	return !!ctx && "filter" in ctx;
}

export function creerContexte(
	script: ScriptPub,
	options: { images?: Map<string, ImageBitmap>; accentParDefaut?: `#${string}` } = {},
): ContexteRendu {
	return {
		palette: palettePourScript(script, options.accentParDefaut),
		images: options.images ?? new Map(),
		filtre: filtreDisponible(),
		gestes: script.gestes ? new Set(script.gestes) : null,
	};
}
