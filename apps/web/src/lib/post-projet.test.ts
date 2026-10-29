import { describe, expect, it } from "vitest";
import { lireResultatPost, messagePostProjet } from "./post-projet";

describe("lireResultatPost", () => {
	it("retire les tirets longs et garde au plus 3 versions", () => {
		const brut = JSON.stringify({
			questions: [],
			versions: [1, 2, 3, 4].map((n) => ({ angle: `Angle ${n}`, texte: `Aujourd'hui ${String.fromCharCode(0x2014)} version ${n}` })),
		});
		const r = lireResultatPost(brut);
		expect(r.versions).toHaveLength(3);
		expect(r.versions[0].texte).toBe("Aujourd'hui, version 1");
	});

	it("renvoie les questions quand il n'y a aucune version", () => {
		const r = lireResultatPost(JSON.stringify({ questions: ["Pourquoi ?"], versions: [] }));
		expect(r).toEqual({ questions: ["Pourquoi ?"], versions: [] });
	});

	it("refuse une reponse vide ou illisible", () => {
		expect(() => lireResultatPost("pas du json")).toThrow();
		expect(() => lireResultatPost(JSON.stringify({ questions: [], versions: [] }))).toThrow();
	});
});

describe("messagePostProjet", () => {
	const entree = {
		infos: { repo: "tablee", description: "d", site: "", url: "https://github.com/x/tablee", sujets: [], readme: "R" },
		domaines: [],
		pub: null,
		style: { exemples: "", profil: "", maj: null },
	};

	it("transmet les reponses de l'utilisateur et marque le README comme non fiable", () => {
		const m = messagePostProjet(entree, [{ question: "Pourquoi ?", reponse: "Un soir de service" }]);
		expect(m).toContain("Un soir de service");
		expect(m).toContain("contenu_non_fiable");
	});
});
