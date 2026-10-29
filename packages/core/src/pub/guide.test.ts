import { describe, expect, it } from "vitest";
import { CATALOGUE_PUB, QUESTIONS_PUB, REGLES_POST_PROJET, REGLES_PUB, TRAMES_PUB } from "./guide";
import { DUREES_SCENE } from "./limites";
import { ICONES, TRAMES, type TypeScene } from "./types";

const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

describe("guide de redaction", () => {
	it("decrit chaque type de scene, dans l'ordre du catalogue, avec ses durees", () => {
		const types = Object.keys(DUREES_SCENE) as TypeScene[];
		const positions = types.map((t, i) => CATALOGUE_PUB.indexOf(`${i + 1}. ${t} (`));
		expect(positions.every((p) => p > 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
		expect(CATALOGUE_PUB).toContain("4,5 s à 7,5 s, 6 s par défaut");
	});

	it("pose les 3 questions qui remplissent les reponses du script", () => {
		expect(QUESTIONS_PUB.map((q) => q.cle)).toEqual(["pourQui", "probleme", "promesse"]);
		for (const q of QUESTIONS_PUB) expect(q.question.endsWith("?")).toBe(true);
	});

	it("rappelle les interdits : technique, preuve inventee, contenu non fiable", () => {
		expect(REGLES_PUB).toMatch(/Jamais de commit, de code, de terminal/);
		expect(REGLES_PUB).toMatch(/Aucun client, témoignage/);
		expect(REGLES_PUB).toMatch(/contenu non fiable/);
		expect(REGLES_PUB).toContain("120 à 170 mots");
	});

	it("ne contient ni tiret long ni tiret moyen, ni gabarit non resolu", () => {
		for (const texte of [CATALOGUE_PUB, REGLES_PUB, REGLES_POST_PROJET, ...QUESTIONS_PUB.map((q) => q.aide)]) {
			expect(texte).not.toMatch(TIRETS);
			expect(texte).not.toMatch(/\$\{|undefined|NaN/);
		}
	});

	it("explique les gestes, le but et l'honnetete reel contre illustratif", () => {
		expect(CATALOGUE_PUB).toContain("GESTES ET BUT");
		expect(CATALOGUE_PUB).toMatch(/2 ou 3 identifiants/);
		expect(REGLES_PUB).toMatch(/jamais une démonstration réelle/);
	});

	it("donne la trame du post du projet, sans technique ni invention", () => {
		expect(REGLES_POST_PROJET).toContain("Aujourd'hui je vous présente");
		expect(REGLES_POST_PROJET).toMatch(/Jamais de commit, de code, de terminal/);
		expect(REGLES_POST_PROJET).toMatch(/pose la question avant de rédiger/);
	});

	it("decrit les trois trames et impose de varier sans copier une reference", () => {
		expect(TRAMES_PUB.map((t) => t.trame)).toEqual([...TRAMES]);
		for (const t of TRAMES) expect(CATALOGUE_PUB).toContain(t);
		expect(REGLES_PUB).toMatch(/Varier, ne jamais copier une référence/);
		expect(REGLES_PUB).toMatch(/jamais un passage obligé/);
		expect(CATALOGUE_PUB).toMatch(/une question courte, un chiffre réel/);
	});

	it("decrit les scenes d'explication, les icones et la rarete des captures", () => {
		for (const t of ["transformation", "flux", "avantapres"]) expect(CATALOGUE_PUB).toContain(t);
		for (const i of ICONES) expect(CATALOGUE_PUB).toContain(i);
		expect(CATALOGUE_PUB).toMatch(/RARE et BRÈVE : 2 au plus par pub, 2,5 s au plus/);
		expect(REGLES_PUB).toMatch(/Captures : rares et brèves/);
		expect(REGLES_PUB).toMatch(/transformation \(une donnée devient un résultat\)/);
	});

	it("impose de dire chaque argument une seule fois et de varier selon le projet", () => {
		expect(REGLES_PUB).toMatch(/Chaque argument une seule fois/);
		expect(REGLES_PUB).toMatch(/n'est dit qu'une seule fois dans toute la pub, voix et visuels confondus/);
		expect(REGLES_PUB).toMatch(/graine dérivée du nom du repo/);
		expect(REGLES_PUB).toMatch(/Deux pubs de projets différents ne se ressemblent pas/);
	});
});
