import type { CaptureRef } from "@weekli/core";
import { describe, expect, it } from "vitest";
import { type EtatAssistant, exigeCapture, legendeDepuisUrl, lienPub, nomProjet, scriptDeDepart } from "./depart";

const repo = { repo: "mon-projet_v2", description: "", site: "", url: "https://github.com/demo/mon-projet_v2", maj: "2026-10-01T00:00:00Z" };
const reponses = {
	pourQui: "Les restaurateurs qui prennent les réservations au téléphone.",
	probleme: "Un projet de plus pour les équipes qui comptent.",
	promesse: "Tout devient plus simple.",
};
const etat = (captures: CaptureRef[] = []): EtatAssistant => ({ repo, reponses, captures, primaire: null });
const capture: CaptureRef = { id: "capture-1", source: "importee", format: "bureau", legende: "Accueil" };

describe("script de depart du studio", () => {
	it("nomme le projet et choisit le lien affiche", () => {
		expect(nomProjet("mon-projet_v2")).toBe("Mon projet v2");
		expect(lienPub({ ...repo, site: "https://projet.example" })).toBe("https://projet.example");
		expect(lienPub({ ...repo, site: `https://projet.example/${"a".repeat(130)}` })).toBe(repo.url);
		expect(lienPub(repo)).toBe(repo.url);
	});

	it("legende une capture d'apres sa page", () => {
		expect(legendeDepuisUrl("https://a.example/")).toBe("Accueil");
		expect(legendeDepuisUrl("https://a.example/tarifs-pro")).toBe("Tarifs pro");
	});

	it("produit un script valide, avec ou sans capture", () => {
		for (const captures of [[], [capture]]) {
			const s = scriptDeDepart(etat(captures));
			expect(s.projet.repo).toBe("mon-projet_v2");
			expect(s.captures).toHaveLength(captures.length);
			expect(s.scenes.length).toBeGreaterThanOrEqual(8);
		}
	});

	it("n'exige une capture que si le script serait trop court", () => {
		expect(exigeCapture(etat([capture]))).toBe(false);
		expect(typeof exigeCapture(etat())).toBe("boolean");
	});
});
