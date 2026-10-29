import { describe, expect, it } from "vitest";
import { MAX_COMMITS_POST, MAX_FICHIERS_TUTO, validerDemandePost } from "./demande";

describe("validerDemandePost", () => {
	it("refuse un type ou un repo invalide", () => {
		expect(validerDemandePost({ type: "autre", repo: "a" }).erreur).toBe("Type de post invalide");
		expect(validerDemandePost(null).erreur).toBe("Type de post invalide");
		for (const repo of [undefined, "", "a/b", "..", "a b", 3]) {
			expect(validerDemandePost({ type: "presentation", repo }).erreur).toBe("Nom de repo invalide");
		}
	});

	it("presentation ignore les commits et les fichiers", () => {
		const r = validerDemandePost({ type: "presentation", repo: "weekli", commits: ["abc1234"], fichiers: ["a"] });
		expect(r.demande).toEqual({ type: "presentation", repo: "weekli" });
	});

	it("coulisses exige 1 a 10 commits uniques", () => {
		expect(validerDemandePost({ type: "coulisses", repo: "w" }).erreur).toBe("Choisis au moins un commit");
		expect(validerDemandePost({ type: "coulisses", repo: "w", commits: ["zzz"] }).erreur).toMatch(/Commits invalides/);
		const trop = Array.from({ length: MAX_COMMITS_POST + 1 }, (_, i) => `abcdef${i}`);
		expect(validerDemandePost({ type: "coulisses", repo: "w", commits: trop }).erreur).toMatch(/Commits invalides/);
		expect(validerDemandePost({ type: "coulisses", repo: "w", commits: ["abcdef1", "abcdef1", "ABCDEF2"] }).demande?.commits).toEqual([
			"abcdef1",
			"ABCDEF2",
		]);
	});

	it("lecon accepte zero commit", () => {
		expect(validerDemandePost({ type: "lecon", repo: "w" }).demande).toEqual({ type: "lecon", repo: "w", commits: [] });
	});

	it("tuto borne et verifie les fichiers", () => {
		expect(validerDemandePost({ type: "tuto", repo: "w" }).demande).toEqual({ type: "tuto", repo: "w" });
		expect(validerDemandePost({ type: "tuto", repo: "w", fichiers: ["/etc/passwd"] }).erreur).toMatch(/Fichiers invalides/);
		expect(validerDemandePost({ type: "tuto", repo: "w", fichiers: ["../x"] }).erreur).toMatch(/Fichiers invalides/);
		const trop = Array.from({ length: MAX_FICHIERS_TUTO + 1 }, (_, i) => `f${i}.ts`);
		expect(validerDemandePost({ type: "tuto", repo: "w", fichiers: trop }).erreur).toMatch(/Fichiers invalides/);
		expect(validerDemandePost({ type: "tuto", repo: "w", fichiers: ["src/a.ts"] }).demande?.fichiers).toEqual(["src/a.ts"]);
	});

	it("semaine n'a pas de repo et borne la periode", () => {
		expect(validerDemandePost({ type: "semaine" }).demande).toEqual({ type: "semaine", jours: 7 });
		expect(validerDemandePost({ type: "semaine", jours: 30 }).demande?.jours).toBe(30);
		for (const jours of [0, 31, 1.5, "7"]) expect(validerDemandePost({ type: "semaine", jours }).erreur).toMatch(/Periode/);
	});
});
