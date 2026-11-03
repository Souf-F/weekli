import { describe, expect, it } from "vitest";
import { extraireCouleurs, proposerMarque } from "./couleurs";

// Image synthetique de `n` pixels RGBA repartis selon des parts
function pixels(parts: [[number, number, number, number?], number][]): Uint8ClampedArray {
	const total = parts.reduce((s, [, n]) => s + n, 0);
	const data = new Uint8ClampedArray(total * 4);
	let i = 0;
	for (const [[r, g, b, a = 255], n] of parts) {
		for (let k = 0; k < n; k++, i += 4) data.set([r, g, b, a], i);
	}
	return data;
}

describe("extraireCouleurs", () => {
	it("classe les couleurs par part decroissante", () => {
		const c = extraireCouleurs(pixels([[[255, 255, 255], 600], [[232, 89, 12], 300], [[20, 20, 20], 100]]));
		expect(c.map((x) => x.hex)).toEqual(["#ffffff", "#e8590c", "#141414"]);
		expect(c[0].part).toBeCloseTo(0.6);
		expect(c[1].part).toBeCloseTo(0.3);
		expect(c.reduce((s, x) => s + x.part, 0)).toBeCloseTo(1);
	});

	it("fusionne les teintes voisines et garde la moyenne exacte", () => {
		const c = extraireCouleurs(pixels([[[200, 40, 40], 50], [[204, 44, 44], 50], [[0, 0, 255], 100]]));
		expect(c).toHaveLength(2);
		const rouge = c.find((x) => x.hex.startsWith("#c"));
		expect(rouge?.hex).toBe("#ca2a2a");
		expect(rouge?.part).toBeCloseTo(0.5);
	});

	it("ignore les pixels transparents (logo sur fond transparent)", () => {
		const c = extraireCouleurs(pixels([[[0, 0, 0, 0], 900], [[10, 157, 107, 255], 100]]));
		expect(c).toHaveLength(1);
		expect(c[0].hex).toBe("#0a9d6b");
		expect(c[0].part).toBe(1);
	});

	it("renvoie une liste vide pour une image entierement transparente ou vide", () => {
		expect(extraireCouleurs(pixels([[[1, 2, 3, 0], 10]]))).toEqual([]);
		expect(extraireCouleurs(new Uint8ClampedArray(0))).toEqual([]);
	});

	it("respecte le nombre demande", () => {
		const c = extraireCouleurs(pixels([[[255, 0, 0], 5], [[0, 255, 0], 4], [[0, 0, 255], 3], [[255, 255, 0], 2]]), 2);
		expect(c.map((x) => x.hex)).toEqual(["#ff0000", "#00ff00"]);
	});

	it("est deterministe", () => {
		const donnees = pixels([[[255, 0, 0], 5], [[0, 255, 0], 5]]);
		expect(extraireCouleurs(donnees)).toEqual(extraireCouleurs(donnees));
	});
});

describe("proposerMarque", () => {
	it("prefere la couleur vive a un fond neutre dominant", () => {
		const c = extraireCouleurs(pixels([[[255, 250, 245], 800], [[232, 89, 12], 150], [[30, 30, 30], 50]]));
		expect(proposerMarque(c).accent).toBe("#e8590c");
	});

	it("ecarte les pastels trop clairs et les quasi noirs", () => {
		const c = extraireCouleurs(pixels([[[243, 217, 198], 700], [[10, 6, 4], 200], [[232, 89, 12], 100]]));
		expect(proposerMarque(c).accent).toBe("#e8590c");
	});

	it("ne propose rien pour une image neutre", () => {
		const c = extraireCouleurs(pixels([[[255, 255, 255], 500], [[128, 128, 128], 300], [[0, 0, 0], 200]]));
		expect(proposerMarque(c)).toEqual({ accent: null, candidats: [] });
	});

	it("liste les autres couleurs vives en candidates", () => {
		const c = extraireCouleurs(pixels([[[27, 110, 243], 500], [[232, 89, 12], 300], [[255, 255, 255], 200]]));
		const p = proposerMarque(c);
		expect(p.accent).toBe("#1b6ef3");
		expect(p.candidats).toEqual(["#e8590c"]);
	});

	it("ignore une couleur vive presque absente", () => {
		const c = extraireCouleurs(pixels([[[255, 255, 255], 995], [[232, 89, 12], 5]]));
		expect(proposerMarque(c).accent).toBeNull();
	});
});
