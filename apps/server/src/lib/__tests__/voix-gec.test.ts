import { describe, expect, it } from "vitest";
import { jetonGec } from "../voix-gec";

// Valeurs de reference produites par edge-tts (drm.generate_sec_ms_gec_v2) pour le meme instant
describe("jetonGec", () => {
	it("reproduit le jeton v2 d'edge-tts", () => {
		expect(jetonGec(1760000000)).toBe(
			"6D50DDDB91812C33-DD68EFB01898B0750C9797D51A5FF93471DFDAE6888A1039D532CBDCCE54545D",
		);
		expect(jetonGec(1789000123)).toBe(
			"63DEFE91AD9FDACC-D4920F2673D134C3A79C63A155396BAC3F0BCCC008F7A8FB88A3D65ED4998B9A",
		);
	});

	it("reste identique dans une fenetre de 5 minutes", () => {
		expect(jetonGec(1760000000)).toBe(jetonGec(1760000000 + 1));
		expect(jetonGec(1760000000)).not.toBe(jetonGec(1760000000 + 300));
	});
});
