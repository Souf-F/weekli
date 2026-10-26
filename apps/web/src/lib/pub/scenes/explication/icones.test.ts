import { ICONES } from "@weekli/core";
import { describe, expect, it } from "vitest";
import { geometrieIcone } from "../../visuel/icones";

describe("icones des scenes d'explication", () => {
	it("dessine les 28 icones dans la grille de 24, avec un element d'accent", () => {
		expect(ICONES).toHaveLength(28);
		for (const nom of ICONES) {
			const g = geometrieIcone(nom);
			expect(g.traits.length, nom).toBeGreaterThan(0);
			expect(g.accent.length, nom).toBeGreaterThan(0);
			expect(g.longueur, nom).toBeGreaterThan(10);
			for (const [x, y] of [...g.traits.flat(), ...g.accent.flat()]) {
				expect(Number.isFinite(x) && Number.isFinite(y), nom).toBe(true);
				expect(x >= 0.5 && x <= 23.5 && y >= 0.5 && y <= 23.5, `${nom} (${x.toFixed(1)}, ${y.toFixed(1)})`).toBe(true);
			}
		}
	});
});
