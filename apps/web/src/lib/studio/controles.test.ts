import { describe, expect, it } from "vitest";
import { creteVraieDb } from "./controles";

describe("crete vraie", () => {
	it("mesure une crete d'echantillon sans surestimer un signal lent", () => {
		const x = new Float32Array(4800).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / 48000));
		expect(creteVraieDb([x])).toBeCloseTo(-6, 0);
	});

	it("trouve la crete entre deux echantillons", () => {
		// 12 kHz a 48 kHz, phase decalee : les echantillons tombent a 0,7 alors que la crete vraie vaut 1
		const x = new Float32Array(2000).map((_, i) => Math.sin((2 * Math.PI * 12000 * i) / 48000 + Math.PI / 4));
		const echantillons = Math.max(...x.slice(1, -2).map(Math.abs));
		expect(echantillons).toBeLessThan(0.75);
		expect(creteVraieDb([x])).toBeGreaterThan(-1.5);
	});
});
