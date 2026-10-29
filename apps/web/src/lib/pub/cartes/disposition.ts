import type { Cadrage, CaptureRef, Rect } from "@weekli/core";
import { type Dimensions, focusDansRegion, type LimitesRatio, RATIO_BUREAU, RATIO_MOBILE, type RectPx, recadrer } from "./cadrage";

// Dimensions des cartes dans le repere logique 1920 x 1080 (design.md 8.10). Fonctions pures.

export type FormatCarte = "bureau" | "mobile";
export type Zone = { x: number; y: number; largeur: number; hauteur: number };

export const BARRE_NAVIGATEUR = 40;
export const RAYON_BUREAU = 20;
export const LARGEUR_BUREAU = { min: 760, max: 880 };
export const LARGEUR_MOBILE = 340;
export const BORD_MOBILE = 10;
export const RAYON_MOBILE = 48;
export const INCLINAISON_MOBILE = (-4 * Math.PI) / 180;
export const LARGEUR_VIGNETTE = { bureau: 360, mobile: 170 };

export type Disposition = {
	format: FormatCarte;
	largeur: number; // carte entiere
	hauteur: number;
	ecran: { x: number; y: number; largeur: number; hauteur: number }; // zone de l'image, repere centre sur la carte
	region: RectPx; // region source de l'image
	focus: Rect | null; // focus dans le repere de la region (0 a 1)
	rayonEcran: number;
};

// Les captures de telephone sont plus hautes que larges ; sinon le format declare par le script fait foi
export function formatDe(image: Dimensions | null, ref?: CaptureRef): FormatCarte {
	if (ref) return ref.format;
	return image && image.hauteur > image.largeur * 1.1 ? "mobile" : "bureau";
}

export function domaineDe(ref?: CaptureRef): string {
	if (!ref) return "";
	if (ref.url) {
		try {
			return new URL(ref.url).hostname.replace(/^www\./, "");
		} catch {
			return "";
		}
	}
	return ref.legende ?? "";
}

// Deuxieme capture affichee en vignette : la suivante du script, differente de la principale et deja chargee
export function choisirVignette(captures: CaptureRef[], principale: string, disponibles: (id: string) => boolean): string | null {
	const i = captures.findIndex((c) => c.id === principale);
	const ordre = i < 0 ? captures : [...captures.slice(i + 1), ...captures.slice(0, i)];
	return ordre.find((c) => c.id !== principale && disponibles(c.id))?.id ?? null;
}

// Marge gardee pour le zoom maximal (Ken Burns puis focus, 1,12) : la carte ne deborde pas de la zone
const MARGE_ZOOM = 1.12;

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Image absente : un ecran vide au rapport moyen de la carte (squelette dessine par `dessin.ts`)
const IMAGE_VIDE: Record<FormatCarte, Dimensions> = { bureau: { largeur: 1280, hauteur: 853 }, mobile: { largeur: 780, hauteur: 1688 } };

export function disposerCarte(
	format: FormatCarte,
	image: Dimensions | null,
	cadrage: Cadrage | undefined,
	focus: Rect | undefined,
	zone: Zone,
	largeurVoulue?: number,
): Disposition {
	const dims = image ?? IMAGE_VIDE[format];
	const limites: LimitesRatio = format === "bureau" ? RATIO_BUREAU : RATIO_MOBILE;
	const region = recadrer(dims, image ? cadrage : "complet", limites, focus);
	const ratio = region.largeur / region.hauteur;
	const barre = format === "bureau" ? BARRE_NAVIGATEUR : 0;
	const bord = format === "bureau" ? 0 : BORD_MOBILE;

	const dispo = { largeur: zone.largeur / MARGE_ZOOM, hauteur: zone.hauteur / MARGE_ZOOM };
	let largeur = largeurVoulue ?? (format === "bureau" ? borner(dispo.largeur, LARGEUR_BUREAU.min, LARGEUR_BUREAU.max) : LARGEUR_MOBILE);
	let hauteur = barre + 2 * bord + (largeur - 2 * bord) / ratio;
	if (hauteur > dispo.hauteur) {
		// la carte tient dans la zone : on reduit en gardant les proportions
		largeur *= dispo.hauteur / hauteur;
		hauteur = dispo.hauteur;
	}
	const ecranL = largeur - 2 * bord;
	return {
		format,
		largeur,
		hauteur,
		ecran: { x: -largeur / 2 + bord, y: -hauteur / 2 + barre + bord, largeur: ecranL, hauteur: hauteur - barre - 2 * bord },
		region,
		focus: image ? focusDansRegion(dims, region, focus) : null,
		rayonEcran: format === "bureau" ? 0 : RAYON_MOBILE - BORD_MOBILE,
	};
}
