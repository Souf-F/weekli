import { describe, expect, it } from "vitest";
import { contraste, paletteDepuisMarque } from "./palette";
import type { Hex } from "./types";

const HEX = /^#[0-9a-f]{6}$/;
const MARQUES: [string, Hex][] = [
	["gris", "#808080"],
	["gris clair", "#d0d0d0"],
	["jaune pale", "#fff7a8"],
	["bleu nuit", "#0b1050"],
	["bleu vif", "#3d4bff"],
	["rouge", "#e5484d"],
	["vert", "#16a34a"],
	["orange brule", "#c2410c"],
	["noir", "#000000"],
	["blanc", "#ffffff"],
	["violet", "#7c3aed"],
	["jaune vif", "#facc15"],
];

describe("contraste", () => {
	it("calcule le rapport WCAG", () => {
		expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
		expect(contraste("#ffffff", "#000000")).toBeCloseTo(21, 5);
		expect(contraste("#777777", "#777777")).toBe(1);
		expect(contraste("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
	});
});

describe("paletteDepuisMarque", () => {
	it.each(MARQUES)("garantit les contrastes pour %s", (_nom, primaire) => {
		const p = paletteDepuisMarque({ primaire });
		for (const [role, valeur] of Object.entries(p)) if (role !== "rayons") expect(valeur, role).toMatch(HEX);
		expect(contraste(p.encre, p.clair)).toBeGreaterThanOrEqual(12);
		expect(contraste(p.encreDouce, p.clair)).toBeGreaterThanOrEqual(4.5);
		expect(contraste(p.accentClair, p.clair)).toBeGreaterThanOrEqual(4.5);
		expect(contraste(p.accentSombre, p.sombre)).toBeGreaterThanOrEqual(4.5);
		expect(contraste(p.alerteSombre, p.sombre)).toBeGreaterThanOrEqual(4.5);
		expect(contraste(p.alerteClair, p.clair)).toBeGreaterThanOrEqual(3);
		expect(contraste(p.blanc, p.sombre)).toBeGreaterThanOrEqual(12);
		expect(contraste(p.encre, p.surface)).toBeGreaterThanOrEqual(12);
	});

	it.each(MARQUES)("garde un fond sombre et un fond clair pour %s", (_nom, primaire) => {
		const p = paletteDepuisMarque({ primaire });
		expect(contraste(p.sombre, "#000000")).toBeLessThan(2);
		expect(contraste(p.clair, "#ffffff")).toBeLessThan(1.15);
		expect(contraste(p.sombreHalo, p.blanc)).toBeGreaterThanOrEqual(7);
	});

	it("garantit aussi les contrastes avec un accent et une alerte choisis", () => {
		for (const accent of ["#fff7a8", "#0b1050", "#808080", "#00ff00"] as Hex[]) {
			for (const alerte of ["#ffff00", "#330000"] as Hex[]) {
				const p = paletteDepuisMarque({ primaire: "#3d4bff", accent, alerte });
				expect(contraste(p.accentClair, p.clair)).toBeGreaterThanOrEqual(4.5);
				expect(contraste(p.accentSombre, p.sombre)).toBeGreaterThanOrEqual(4.5);
				expect(contraste(p.alerteSombre, p.sombre)).toBeGreaterThanOrEqual(4.5);
				expect(contraste(p.alerteClair, p.clair)).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it("reproduit l'exemple de reference de design.md 8.4 pour #3d4bff", () => {
		const p = paletteDepuisMarque({ primaire: "#3d4bff" });
		expect(p.accentClair).toBe("#3d4bff");
		expect(contraste(p.accentClair, p.clair)).toBeCloseTo(5.3, 0);
		expect(p.alerteSombre).toBe("#e5484d");
		expect(p.alerteClair).toBe("#e5484d");
		expect(contraste(p.alerteSombre, p.sombre)).toBeCloseTo(4.5, 0);
		expect(contraste(p.alerteClair, p.clair)).toBeCloseTo(3.6, 0);
	});

	it("garde la teinte de la marque sur les fonds", () => {
		const bleu = paletteDepuisMarque({ primaire: "#3d4bff" });
		const [r, , b] = [1, 3, 5].map((i) => Number.parseInt(bleu.sombre.slice(i, i + 2), 16));
		expect(b).toBeGreaterThan(r);
		expect(bleu.sombre).not.toBe(paletteDepuisMarque({ primaire: "#c2410c" }).sombre);
	});

	it("marque grise : l'accent par defaut est le bleu de secours ou la couleur fournie", () => {
		expect(paletteDepuisMarque({ primaire: "#808080" }).accentClair).toBe("#3d4bff");
		const capture = paletteDepuisMarque({ primaire: "#808080" }, "#16a34a");
		expect(capture.accentClair).not.toBe("#3d4bff");
		expect(contraste(capture.accentClair, capture.clair)).toBeGreaterThanOrEqual(4.5);
		// un accent explicite l'emporte, et une marque saturee ignore la couleur de capture
		expect(paletteDepuisMarque({ primaire: "#808080", accent: "#c2410c" }).accentClair).toBe("#c2410c");
		expect(paletteDepuisMarque({ primaire: "#16a34a" }, "#ff0000")).toEqual(
			paletteDepuisMarque({ primaire: "#16a34a" }),
		);
	});

	it("ne touche pas a un accent deja assez contraste", () => {
		expect(paletteDepuisMarque({ primaire: "#3d4bff", accent: "#0b1050" }).accentClair).toBe("#0b1050");
	});

	it("rayons : accentSombre a 18 % d'opacite", () => {
		const p = paletteDepuisMarque({ primaire: "#3d4bff" });
		const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(p.accentSombre.slice(i, i + 2), 16));
		expect(p.rayons).toBe(`rgba(${r}, ${g}, ${b}, 0.18)`);
		expect(p.blanc).toBe("#ffffff");
		expect(p.surface).toBe("#ffffff");
	});
});
