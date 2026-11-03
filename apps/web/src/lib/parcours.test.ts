import { describe, expect, it } from "vitest";
import { ajouterReponse, besoinCommits, composerNotes, demandeClaude, demandeDonnees, messageValidation, reglagesVides } from "./parcours";

describe("parcours du tableau", () => {
	it("ne charge les commits que pour les types qui en ont besoin", () => {
		expect(besoinCommits("presentation")).toBe(false);
		expect(besoinCommits("tuto")).toBe(false);
		expect(besoinCommits("coulisses")).toBe(true);
		expect(besoinCommits("lecon")).toBe(true);
		expect(besoinCommits("semaine")).toBe(true);
	});

	it("valide les reglages de chaque type", () => {
		const r = reglagesVides();
		expect(messageValidation("presentation", r)).toBe("");
		expect(messageValidation("tuto", { ...r, fichiers: [] })).not.toBe("");
		expect(messageValidation("tuto", { ...r, fichiers: ["a.ts"] })).toBe("");
		expect(messageValidation("coulisses", r)).not.toBe("");
		expect(messageValidation("coulisses", { ...r, commits: ["abc1234"] })).toBe("");
		expect(messageValidation("lecon", r)).not.toBe("");
		expect(messageValidation("lecon", { ...r, probleme: "Un bug" })).toBe("");
		expect(messageValidation("lecon", { ...r, commits: ["abc1234"] })).toBe("");
	});

	it("construit la demande envoyee a l'API", () => {
		const r = { ...reglagesVides(), fichiers: ["a.ts", "b.ts"], commits: ["abc1234"] };
		expect(demandeDonnees("presentation", "x", r)).toEqual({ type: "presentation", repo: "x" });
		expect(demandeDonnees("tuto", "x", r)).toEqual({ type: "tuto", repo: "x", fichiers: ["a.ts", "b.ts"] });
		expect(demandeDonnees("coulisses", "x", r)).toEqual({ type: "coulisses", repo: "x", commits: ["abc1234"] });
		expect(demandeDonnees("lecon", "x", reglagesVides())).toEqual({ type: "lecon", repo: "x" });
	});

	it("rassemble les notes de l'utilisateur et la reponse a une question", () => {
		const notes = composerNotes("presentation", { ...reglagesVides(), pourquoi: " Pour gagner du temps ", demarche: "" });
		expect(notes).toBe("Pourquoi je l'ai fait : Pour gagner du temps");
		expect(ajouterReponse(notes, "Pour qui ?", "Les studios")).toContain("Réponse : Les studios");
		expect(composerNotes("semaine", reglagesVides())).toBe("");
	});

	it("ecrit la demande a copier dans Claude", () => {
		expect(demandeClaude("tuto", ["scanner-ssl"])).toContain("« Mini tuto » sur mon repo scanner-ssl");
		expect(demandeClaude("semaine", [])).toContain("tous mes repos");
	});
});
