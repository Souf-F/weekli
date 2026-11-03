import { type ScriptPub, scriptPubDepuisReponses } from "@weekli/core";
import { describe, expect, it } from "vitest";
import { champsScene } from "./champs";
import { diagnostiquer } from "./diagnostic";
import { basculerGeste, basculerMasquee, deplacerScene, dupliquerScene, ecrireChemin, idLibre, modifierScene, nomFichier } from "./edition";

const base = (): ScriptPub =>
	scriptPubDepuisReponses({
		nom: "Tablée",
		repo: "tablee",
		lien: "https://tablee.example",
		reponses: {
			pourQui: "Les restaurateurs qui prennent les réservations au téléphone.",
			probleme: "Le téléphone sonne en plein service, les réservations se perdent.",
			promesse: "Les réservations arrivent toutes seules, le service reste calme.",
		},
		marque: { primaire: "#2f5d50" },
	});

describe("edition du script", () => {
	it("ecrit un chemin sans muter l'original", () => {
		const s = base();
		const avant = structuredClone(s);
		const i = s.scenes.findIndex((x) => x.type === "rupture");
		const suite = modifierScene(s, i, ["texte", "texte"], "Un autre texte");
		expect(s).toEqual(avant);
		expect((suite.scenes[i] as { texte: { texte: string } }).texte.texte).toBe("Un autre texte");
		expect(ecrireChemin({ a: { b: 1, c: 2 } }, ["a", "c"], undefined)).toEqual({ a: { b: 1 } });
	});

	it("monte, descend, masque et duplique avec un id libre", () => {
		const s = base();
		const [a, b] = s.scenes;
		expect(deplacerScene(s, 0, 1).scenes.slice(0, 2).map((x) => x.id)).toEqual([b.id, a.id]);
		expect(deplacerScene(s, 0, -1)).toBe(s);
		expect(basculerMasquee(s, 1).scenes[1].masquee).toBe(true);
		if (s.scenes.length < 14) {
			const d = dupliquerScene(s, 1);
			expect(d.scenes).toHaveLength(s.scenes.length + 1);
			expect(new Set(d.scenes.map((x) => x.id)).size).toBe(d.scenes.length);
		}
		expect(idLibre(s, "etape-9")).toMatch(/^etape-\d+$/);
	});

	it("garde 2 a 3 gestes ou aucun", () => {
		let s: ScriptPub = { ...base(), gestes: undefined };
		for (const g of ["accent", "impact", "flou", "rayons"] as const) s = basculerGeste(s, g);
		expect(s.gestes).toEqual(["accent", "impact", "flou"]);
		s = basculerGeste(basculerGeste(basculerGeste(s, "accent"), "impact"), "flou");
		expect(s.gestes).toBeUndefined();
	});

	it("donne des champs pour chaque scene du script de depart", () => {
		const s = base();
		for (const sc of s.scenes) expect(champsScene(sc, s).length).toBeGreaterThan(0);
	});

	it("nomme un fichier sans accent ni espace", () => {
		expect(nomFichier("Pub « Tablée » 2026")).toBe("pub-tablee-2026");
		expect(nomFichier("")).toBe("pub");
	});

	it("garde le script editable quand une regle de structure est enfreinte", () => {
		const s = base();
		const sans = { ...s, scenes: s.scenes.filter((x) => x.type !== "revelation") };
		const d = diagnostiquer(sans);
		expect(d.script).toBeNull();
		expect(d.erreurs.length).toBeGreaterThan(0);
		expect(diagnostiquer(s).script).not.toBeNull();
	});
});
