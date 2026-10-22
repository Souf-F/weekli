import { describe, expect, it } from "vitest";
import { dureeTotale, LIMITES_VIDEO, nettoyerStoryboard, storyboardDepuisPost } from "./storyboard";

describe("nettoyerStoryboard", () => {
	it("ignore les scenes inconnues ou vides et borne les durees", () => {
		const s = nettoyerStoryboard({
			scenes: [
				{ type: "titre", titre: "Bonjour", duree: 99 },
				{ type: "script", code: "alert(1)" },
				{ type: "liste", titre: "x", elements: [] },
				{ type: "citation", texte: "Une phrase", duree: -3 },
				null,
			],
		});
		expect(s.scenes.map((x) => x.type)).toEqual(["titre", "citation"]);
		expect(s.scenes[0].duree).toBe(LIMITES_VIDEO.dureeMax);
		expect(s.scenes[1].duree).toBe(LIMITES_VIDEO.dureeMin);
	});

	it("tronque les textes et plafonne le nombre de scenes", () => {
		const s = nettoyerStoryboard({
			scenes: Array.from({ length: 20 }, () => ({ type: "citation", texte: "x".repeat(500), duree: 3 })),
		});
		expect(s.scenes).toHaveLength(LIMITES_VIDEO.scenes);
		expect((s.scenes[0] as { texte: string }).texte.length).toBeLessThanOrEqual(120);
	});

	it("resiste a une entree absurde", () => {
		expect(nettoyerStoryboard(null).scenes).toEqual([]);
		expect(nettoyerStoryboard("texte").scenes).toEqual([]);
		expect(nettoyerStoryboard({ scenes: "pas un tableau" }).scenes).toEqual([]);
	});
});

describe("storyboardDepuisPost", () => {
	it("produit titre, liste, citation et fin a partir d'un post", () => {
		const s = storyboardDepuisPost({
			titre: "Trois lecons sur crt.sh",
			format: "lecons",
			source: "scanner-ssl",
			texte:
				"Cette semaine j'ai fouille les certificats.\n\n1. Les certificats racontent tout.\n2. Les sous-domaines oublies sont partout.\n\nLa meilleure securite commence par l'inventaire.\n\n#infosec #osint",
		});
		expect(s.scenes.map((x) => x.type)).toEqual(["titre", "liste", "citation", "fin"]);
		expect(s.scenes[3]).toMatchObject({ titre: "scanner-ssl", lien: "#infosec #osint" });
		expect(dureeTotale(s)).toBeGreaterThan(10);
	});
});
