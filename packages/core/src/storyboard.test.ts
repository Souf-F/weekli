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

	it("n'utilise ni un lien ni une phrase d'annonce comme citation", () => {
		const s = storyboardDepuisPost({
			titre: "Titre",
			format: "",
			source: "weekli",
			texte:
				"Accroche du post.\n\nCe que j'ai appris cette semaine :\nhttps://github.com/Souf-F/weekli\nUne phrase forte et assez longue pour une citation.",
		});
		const citation = s.scenes.find((x) => x.type === "citation") as { texte: string } | undefined;
		expect(citation?.texte).toBe("Une phrase forte et assez longue pour une citation.");
	});

	it("garde seulement le nom du projet pour la scene de fin", () => {
		const s = storyboardDepuisPost({ titre: "T", format: "", source: "weekli · 88baace, bd48684", texte: "Accroche." });
		expect(s.scenes.at(-1)).toMatchObject({ type: "fin", titre: "weekli" });
	});

	it("tronque les textes trop longs sans couper un mot", () => {
		const s = nettoyerStoryboard({
			scenes: [
				{
					type: "liste",
					titre: "x",
					elements: [
						"Un flux OAuth herite d'un modele, remplace par les fonctions maintenues de la bibliotheque officielle",
					],
					duree: 4,
				},
			],
		});
		const el = (s.scenes[0] as { elements: string[] }).elements[0];
		expect(el.length).toBeLessThanOrEqual(80);
		expect(el.endsWith("…")).toBe(true);
		expect(el).not.toMatch(/\sbi…$/);
	});
});
