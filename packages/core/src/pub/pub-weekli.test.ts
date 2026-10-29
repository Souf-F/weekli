import { describe, expect, it } from "vitest";
import brut from "../../../../apps/web/dev/pub-weekli.json";
import { nettoyerScriptPub } from "./nettoyer";
import { calculerTimeline } from "./timeline";

// La premiere vraie pub (apps/web/dev/pub-weekli.json) sert de garde-fou : captures rares, scenes d'explication,
// chaque argument une seule fois
describe("pub de Weekli", () => {
	const r = nettoyerScriptPub(brut);

	it("passe nettoyerScriptPub sans erreur ni avertissement, y compris sans repetition", () => {
		expect(r.erreurs).toEqual([]);
		expect(r.avertissements).toEqual([]);
		expect(r.script?.scenes).toEqual(brut.scenes);
	});

	it("garde la duree de 50 a 65 s et la fin du film", () => {
		const duree = calculerTimeline(r.script!).duree;
		expect(duree).toBeGreaterThanOrEqual(50);
		expect(duree).toBeLessThanOrEqual(65);
		expect(r.script?.scenes.at(-1)?.type).toBe("fin");
	});

	it("n'a qu'une capture, brève, et trois scenes d'explication en motion design", () => {
		const types = r.script!.scenes.map((s) => s.type);
		const captures = r.script!.scenes.filter((s) => s.type === "etape" && s.visuel.type === "capture");
		expect(captures).toHaveLength(1);
		expect(captures[0].but).toBe("montrer");
		for (const t of ["transformation", "flux", "avantapres"]) expect(types).toContain(t);
	});

	it("ne dit la gratuite qu'une fois", () => {
		const scenes = JSON.stringify(r.script!.scenes.map((s) => [s.id, JSON.stringify(s)]));
		const ou = r.script!.scenes.filter((s) => /gratuit/i.test(JSON.stringify(s))).map((s) => s.id);
		expect(ou, scenes).toEqual(["preuve"]);
	});
});
