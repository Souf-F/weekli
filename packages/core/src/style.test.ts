import { describe, expect, it } from "vitest";
import { LIMITES_STYLE, nettoyerStyle, styleVide, texteStyle } from "./style";

describe("nettoyerStyle", () => {
	it("ignore ce qui n'est pas un objet ou n'a pas de champ texte", () => {
		expect(nettoyerStyle(null)).toEqual({});
		expect(nettoyerStyle("texte")).toEqual({});
		expect(nettoyerStyle({ exemples: 42, profil: ["a"] })).toEqual({});
	});

	it("ne renvoie que les champs fournis et ignore les champs inconnus", () => {
		expect(nettoyerStyle({ profil: "court", maj: "x", admin: true })).toEqual({ profil: "court" });
	});

	it("tronque aux limites du contrat", () => {
		const s = nettoyerStyle({ exemples: "x".repeat(9000), profil: "y".repeat(3000) });
		expect(s.exemples).toHaveLength(LIMITES_STYLE.exemples);
		expect(s.profil).toHaveLength(LIMITES_STYLE.profil);
	});

	it("retire les caracteres de controle, garde les retours a la ligne et rogne les bords", () => {
		expect(nettoyerStyle({ exemples: "  a\u0000b\nc\u0007\t\u007F  " })).toEqual({ exemples: "ab\nc" });
	});

	it("garde une chaine vide pour effacer un champ", () => {
		expect(nettoyerStyle({ profil: "   " })).toEqual({ profil: "" });
	});
});

describe("texteStyle", () => {
	it("est vide sans style", () => {
		expect(texteStyle({ exemples: "", profil: "" })).toBe("");
		expect(styleVide({ exemples: "", profil: "" })).toBe(true);
	});

	it("place le profil avant les exemples", () => {
		const t = texteStyle({ exemples: "Mon post", profil: "Phrases courtes" });
		expect(t.indexOf("Phrases courtes")).toBeLessThan(t.indexOf("Mon post"));
	});

	it("n'ecrit pas la section absente", () => {
		expect(texteStyle({ exemples: "", profil: "Phrases courtes" })).not.toContain("Exemples");
		expect(texteStyle({ exemples: "Mon post", profil: "" })).not.toContain("Profil");
	});
});
