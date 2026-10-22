import { describe, expect, it } from "vitest";
import { ajouterBrouillons, creerBrouillons, LIMITES, MAX_BROUILLONS, nettoyerPost } from "./brouillons";

describe("nettoyerPost", () => {
	it("refuse ce qui n'est pas un post", () => {
		expect(nettoyerPost(null)).toBeNull();
		expect(nettoyerPost("texte")).toBeNull();
		expect(nettoyerPost({ titre: "sans texte" })).toBeNull();
		expect(nettoyerPost({ texte: "   " })).toBeNull();
	});

	it("tronque les champs trop longs et ignore les types inattendus", () => {
		const p = nettoyerPost({ titre: 42, texte: "x".repeat(LIMITES.texte + 500), source: ["a"] })!;
		expect(p.titre).toBe("");
		expect(p.source).toBe("");
		expect(p.texte).toHaveLength(LIMITES.texte);
	});

	it("retire les caracteres de controle mais garde les retours a la ligne", () => {
		expect(nettoyerPost({ texte: "a\u0000b\nc\u0007" })!.texte).toBe("ab\nc");
	});
});

describe("ajouterBrouillons", () => {
	it("met les nouveaux en premier et plafonne", () => {
		const anciens = creerBrouillons(
			Array.from({ length: MAX_BROUILLONS }, (_, i) => ({ titre: `${i}`, format: "", source: "", texte: "t" })),
		);
		const nouveaux = creerBrouillons([{ titre: "neuf", format: "", source: "", texte: "t" }]);
		const res = ajouterBrouillons(anciens, nouveaux);
		expect(res).toHaveLength(MAX_BROUILLONS);
		expect(res[0].titre).toBe("neuf");
		expect(res[0].publie).toBe(false);
	});
});
