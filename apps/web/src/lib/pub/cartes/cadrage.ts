import type { Cadrage, Rect } from "@weekli/core";

// Recadrage des captures (design.md 8.10). Logique pure : aucune dependance au DOM.
// Tous les rectangles `Rect` sont en fractions (0 a 1) de l'image entiere, `RectPx` en pixels de l'image.

export type RectPx = { x: number; y: number; largeur: number; hauteur: number };
export type Dimensions = { largeur: number; hauteur: number };
export type LimitesRatio = { min: number; max: number }; // largeur / hauteur

// La carte bureau s'adapte entre 4:3 et 16:10 ; l'ecran du telephone entre 9:19,5 et 3:4
export const RATIO_BUREAU: LimitesRatio = { min: 4 / 3, max: 16 / 10 };
export const RATIO_MOBILE: LimitesRatio = { min: 9 / 19.5, max: 3 / 4 };

const ZONES: Record<"haut" | "milieu" | "bas" | "complet", Rect> = {
	haut: { x: 0, y: 0, largeur: 1, hauteur: 0.55 },
	milieu: { x: 0, y: 0.25, largeur: 1, hauteur: 0.55 },
	bas: { x: 0, y: 0.45, largeur: 1, hauteur: 0.55 },
	complet: { x: 0, y: 0, largeur: 1, hauteur: 1 },
};

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Ramene un rectangle en fractions dans l'image ; null s'il est vide ou invalide
export function normaliserRect(r: Rect): Rect | null {
	const valeurs = [r.x, r.y, r.largeur, r.hauteur];
	if (!valeurs.every(Number.isFinite)) return null;
	const x = borner(r.x, 0, 1);
	const y = borner(r.y, 0, 1);
	const largeur = borner(r.largeur, 0, 1 - x);
	const hauteur = borner(r.hauteur, 0, 1 - y);
	return largeur > 0.01 && hauteur > 0.01 ? { x, y, largeur, hauteur } : null;
}

// Cadrage nomme ou libre vers un rectangle en fractions ; l'image entiere par defaut
export function rectDuCadrage(cadrage: Cadrage | undefined): Rect {
	if (!cadrage) return ZONES.complet;
	if (typeof cadrage === "string") return ZONES[cadrage] ?? ZONES.complet;
	return normaliserRect(cadrage) ?? ZONES.complet;
}

export const versPixels = (r: Rect, image: Dimensions): RectPx => ({
	x: r.x * image.largeur,
	y: r.y * image.hauteur,
	largeur: r.largeur * image.largeur,
	hauteur: r.hauteur * image.hauteur,
});

// Decale une fenetre [debut, debut + taille] le moins possible pour qu'elle contienne [cible, cible + tailleCible]
// (ou la centre dessus si la cible est plus grande), sans sortir de [min, min + etendue]
function glisserVers(debut: number, taille: number, cible: number, tailleCible: number, min: number, etendue: number): number {
	let d = debut;
	if (tailleCible >= taille) d = cible + tailleCible / 2 - taille / 2;
	else if (cible < d) d = cible;
	else if (cible + tailleCible > d + taille) d = cible + tailleCible - taille;
	return borner(d, min, min + etendue - taille);
}

// Region source a dessiner : le cadre demande, ramene dans les limites de ratio de la carte.
// Un cadre trop large ou trop haut est rogne (jamais etire), en restant centre sur le cadre ou,
// si un focus est donne, decale juste assez pour que le focus reste visible.
export function recadrer(image: Dimensions, cadrage: Cadrage | undefined, limites: LimitesRatio, focus?: Rect): RectPx {
	const cadre = versPixels(rectDuCadrage(cadrage), image);
	const ratio = cadre.largeur / cadre.hauteur;
	let { x, y, largeur, hauteur } = cadre;
	if (ratio > limites.max) largeur = hauteur * limites.max;
	else if (ratio < limites.min) hauteur = largeur / limites.min;
	x = cadre.x + (cadre.largeur - largeur) / 2;
	y = cadre.y + (cadre.hauteur - hauteur) / 2;

	const f = focus && normaliserRect(focus);
	if (f) {
		const fp = versPixels(f, image);
		x = glisserVers(x, largeur, fp.x, fp.largeur, cadre.x, cadre.largeur);
		y = glisserVers(y, hauteur, fp.y, fp.hauteur, cadre.y, cadre.hauteur);
	}
	return { x, y, largeur, hauteur };
}

// Focus exprime dans le repere de la region affichee (0 a 1), borne a cette region ; null s'il est hors champ
export function focusDansRegion(image: Dimensions, region: RectPx, focus: Rect | undefined): Rect | null {
	const f = focus && normaliserRect(focus);
	if (!f) return null;
	const p = versPixels(f, image);
	const x0 = Math.max(p.x, region.x);
	const y0 = Math.max(p.y, region.y);
	const x1 = Math.min(p.x + p.largeur, region.x + region.largeur);
	const y1 = Math.min(p.y + p.hauteur, region.y + region.hauteur);
	if (x1 - x0 < 1 || y1 - y0 < 1) return null;
	return {
		x: (x0 - region.x) / region.largeur,
		y: (y0 - region.y) / region.hauteur,
		largeur: (x1 - x0) / region.largeur,
		hauteur: (y1 - y0) / region.hauteur,
	};
}
