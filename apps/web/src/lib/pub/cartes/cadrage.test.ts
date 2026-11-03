import { describe, expect, it } from "vitest";
import { focusDansRegion, normaliserRect, RATIO_BUREAU, RATIO_MOBILE, recadrer, rectDuCadrage } from "./cadrage";

const BUREAU = { largeur: 1280, hauteur: 800 };
const MOBILE = { largeur: 780, hauteur: 1688 };
const ratio = (r: { largeur: number; hauteur: number }) => r.largeur / r.hauteur;

describe("rectDuCadrage", () => {
	it("traduit les cadrages nommes (design.md 8.10)", () => {
		expect(rectDuCadrage("haut")).toEqual({ x: 0, y: 0, largeur: 1, hauteur: 0.55 });
		expect(rectDuCadrage("milieu")).toEqual({ x: 0, y: 0.25, largeur: 1, hauteur: 0.55 });
		expect(rectDuCadrage("bas")).toMatchObject({ y: 0.45, hauteur: 0.55 });
		expect(rectDuCadrage("complet")).toEqual({ x: 0, y: 0, largeur: 1, hauteur: 1 });
		expect(rectDuCadrage(undefined)).toEqual(rectDuCadrage("complet"));
	});

	it("borne un rectangle libre a l'image et retombe sur l'image entiere s'il est vide", () => {
		expect(rectDuCadrage({ x: 0.8, y: -1, largeur: 5, hauteur: 0.5 })).toEqual({ x: 0.8, y: 0, largeur: expect.closeTo(0.2), hauteur: 0.5 });
		expect(rectDuCadrage({ x: 0.5, y: 0.5, largeur: 0, hauteur: 0.4 })).toEqual(rectDuCadrage("complet"));
		expect(rectDuCadrage({ x: Number.NaN, y: 0, largeur: 1, hauteur: 1 })).toEqual(rectDuCadrage("complet"));
	});
});

describe("recadrer", () => {
	it("garde l'image entiere quand son rapport est deja dans les limites", () => {
		expect(recadrer(BUREAU, "complet", RATIO_BUREAU)).toEqual({ x: 0, y: 0, largeur: 1280, hauteur: 800 });
	});

	it("rogne sans etirer un cadre trop large, centre sur le cadre", () => {
		const r = recadrer(BUREAU, "haut", RATIO_BUREAU); // 1280 x 440, rapport 2,9
		expect(ratio(r)).toBeCloseTo(RATIO_BUREAU.max);
		expect(r.hauteur).toBeCloseTo(440);
		expect(r.largeur).toBeCloseTo(704);
		expect(r.x).toBeCloseTo((1280 - 704) / 2);
		expect(r.y).toBeCloseTo(0);
	});

	it("rogne en hauteur un cadre trop etroit", () => {
		const r = recadrer(BUREAU, { x: 0.4, y: 0, largeur: 0.2, hauteur: 1 }, RATIO_BUREAU); // 256 x 800
		expect(ratio(r)).toBeCloseTo(RATIO_BUREAU.min);
		expect(r.largeur).toBeCloseTo(256);
		expect(r.hauteur).toBeCloseTo(192);
	});

	it("reste toujours dans l'image et dans les limites de ratio", () => {
		for (const cadrage of ["haut", "milieu", "bas", "complet"] as const) {
			for (const [image, limites] of [
				[BUREAU, RATIO_BUREAU],
				[MOBILE, RATIO_MOBILE],
			] as const) {
				const r = recadrer(image, cadrage, limites);
				expect(r.x).toBeGreaterThanOrEqual(-1e-9);
				expect(r.y).toBeGreaterThanOrEqual(-1e-9);
				expect(r.x + r.largeur).toBeLessThanOrEqual(image.largeur + 1e-9);
				expect(r.y + r.hauteur).toBeLessThanOrEqual(image.hauteur + 1e-9);
				expect(ratio(r)).toBeGreaterThanOrEqual(limites.min - 1e-9);
				expect(ratio(r)).toBeLessThanOrEqual(limites.max + 1e-9);
			}
		}
	});

	it("decale le cadre rogne pour garder le focus visible", () => {
		const focus = { x: 0.05, y: 0.05, largeur: 0.2, hauteur: 0.2 }; // en haut a gauche
		const centre = recadrer(BUREAU, "haut", RATIO_BUREAU);
		const decale = recadrer(BUREAU, "haut", RATIO_BUREAU, focus);
		expect(decale.x).toBeLessThan(centre.x);
		expect(decale.x).toBeLessThanOrEqual(0.05 * 1280 + 1e-9);
		expect(decale.largeur).toBeCloseTo(centre.largeur);
	});

	it("ne bouge pas un cadre dont le focus est deja visible", () => {
		const focus = { x: 0.4, y: 0.1, largeur: 0.2, hauteur: 0.2 };
		expect(recadrer(BUREAU, "haut", RATIO_BUREAU, focus)).toEqual(recadrer(BUREAU, "haut", RATIO_BUREAU));
	});

	it("ne sort pas du cadre demande meme avec un focus hors cadre", () => {
		const focus = { x: 0.1, y: 0.9, largeur: 0.1, hauteur: 0.05 }; // tout en bas, hors du cadre haut
		const r = recadrer(BUREAU, "haut", RATIO_BUREAU, focus);
		expect(r.y + r.hauteur).toBeLessThanOrEqual(0.55 * 800 + 1e-9);
	});
});

describe("focusDansRegion", () => {
	const region = { x: 0, y: 0, largeur: 1280, hauteur: 400 };

	it("exprime le focus dans le repere de la region", () => {
		const f = focusDansRegion(BUREAU, region, { x: 0.25, y: 0.25, largeur: 0.5, hauteur: 0.25 });
		expect(f).toEqual({ x: 0.25, y: 0.5, largeur: 0.5, hauteur: 0.5 });
	});

	it("coupe un focus a cheval sur la region", () => {
		const f = focusDansRegion(BUREAU, region, { x: 0, y: 0.4, largeur: 1, hauteur: 0.2 }); // y de 320 a 480
		expect(f?.y).toBeCloseTo(0.8);
		expect(f?.hauteur).toBeCloseTo(0.2);
	});

	it("renvoie null hors champ ou sans focus", () => {
		expect(focusDansRegion(BUREAU, region, { x: 0, y: 0.7, largeur: 1, hauteur: 0.2 })).toBeNull();
		expect(focusDansRegion(BUREAU, region, undefined)).toBeNull();
	});
});

describe("normaliserRect", () => {
	it("rejette les rectangles quasi vides", () => {
		expect(normaliserRect({ x: 0, y: 0, largeur: 0.005, hauteur: 0.5 })).toBeNull();
		expect(normaliserRect({ x: 1, y: 0, largeur: 0.5, hauteur: 0.5 })).toBeNull();
	});
});
