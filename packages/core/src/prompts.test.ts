import { describe, expect, it } from "vitest";
import { lirePosts, systemeGeneration } from "./prompts";

describe("lirePosts", () => {
	it("decoupe la sortie du modele en posts", () => {
		const sortie = `### Le scanner SSL
Format : retour d'experience
Source : scanner-ssl

Cette semaine, mon scanner a appris a reperer les sous-domaines oublies.

#cybersecurite #javascript
### Trois lecons
Format : lecons
Source : weekli

1. Commencer petit.`;
		const posts = lirePosts(sortie);
		expect(posts).toHaveLength(2);
		expect(posts[0]).toMatchObject({ titre: "Le scanner SSL", format: "retour d'experience", source: "scanner-ssl" });
		expect(posts[0].texte).toContain("#cybersecurite");
		expect(posts[1].texte).toBe("1. Commencer petit.");
	});

	it("supporte une sortie partielle pendant le streaming", () => {
		expect(lirePosts("### Debut d'un tit")).toEqual([{ titre: "Debut d'un tit", format: "", source: "", texte: "" }]);
		expect(lirePosts("")).toEqual([]);
	});
});

describe("systemeGeneration", () => {
	it("integre les options et les exemples de style", () => {
		const s = systemeGeneration({ ton: "tuto", langue: "en", nombre: 2, style: "Mon ancien post" });
		expect(s).toContain("2 post(s)");
		expect(s).toContain("in English");
		expect(s).toContain("mini-tutoriel");
		expect(s).toContain("Mon ancien post");
	});
});
