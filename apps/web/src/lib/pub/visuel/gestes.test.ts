import type { Geste } from "@weekli/core";
import { describe, expect, it } from "vitest";
import { choisirApparition, miseEnValeur, optionAccent, rebondAccent } from "./gestes";

const jeu = (...g: Geste[]) => new Set<Geste>(g);
const RUPTURE = ["frappe", "lettres", "mot"] as const;
const APPEL = ["lettres", "impact", "frappe", "mot"] as const;

describe("choisirApparition", () => {
	it("sans gestes dans le script, joue le procede par defaut de la scene", () => {
		expect(choisirApparition(null, RUPTURE)).toBe("frappe");
		expect(choisirApparition(null, APPEL)).toBe("lettres");
		expect(choisirApparition(null, ["glisse", "frappe", "mot"])).toBe("glisse");
	});

	it("prend le premier procede autorise par les gestes choisis", () => {
		expect(choisirApparition(jeu("frappe", "accent"), RUPTURE)).toBe("frappe");
		expect(choisirApparition(jeu("lettres", "accent"), RUPTURE)).toBe("lettres");
		expect(choisirApparition(jeu("impact", "frappe"), APPEL)).toBe("impact");
	});

	it("replie en mot par mot quand aucun procede n'est autorise (8.16)", () => {
		expect(choisirApparition(jeu("accent", "soulignement", "surlignage"), RUPTURE)).toBe("mot");
		expect(choisirApparition(jeu("accent", "soulignement"), APPEL)).toBe("mot");
		expect(choisirApparition(jeu(), ["glisse", "frappe", "mot"])).toBe("mot");
	});

	it("autorise la glissade avec lettres ou impact seulement", () => {
		expect(choisirApparition(jeu("impact"), ["glisse", "mot"])).toBe("glisse");
		expect(choisirApparition(jeu("lettres"), ["glisse", "mot"])).toBe("glisse");
		expect(choisirApparition(jeu("frappe"), ["glisse", "mot"])).toBe("mot");
	});

	it("accepte un defaut distinct de l'ordre de preference", () => {
		expect(choisirApparition(null, ["frappe", "mot"], "mot")).toBe("mot");
		expect(choisirApparition(jeu("frappe"), ["frappe", "mot"], "mot")).toBe("frappe");
	});

	it("rend deux jeux de gestes differents distincts sur la meme scene", () => {
		const sobre = choisirApparition(jeu("accent", "soulignement", "flou"), RUPTURE);
		const nerveux = choisirApparition(jeu("impact", "glitch", "lettres"), RUPTURE);
		expect(sobre).not.toBe(nerveux);
	});
});

describe("accent", () => {
	it("rebondit selon le choix, sinon selon le defaut de la scene", () => {
		expect(rebondAccent(jeu("accent"))).toBe(true);
		expect(rebondAccent(jeu("impact"))).toBe(false);
		expect(rebondAccent(null)).toBe(true);
		expect(rebondAccent(null, false)).toBe(false);
	});

	it("pose la couleur sans rebond (-1) quand le geste est absent", () => {
		expect(optionAccent(jeu("frappe"))).toBe(-1);
		expect(optionAccent(jeu("accent"))).toBeUndefined();
	});
});

describe("miseEnValeur", () => {
	it("active tout sans gestes, et seulement les gestes choisis sinon", () => {
		expect(miseEnValeur(null)).toEqual({ surlignage: true, soulignement: true, impact: true });
		expect(miseEnValeur(jeu("soulignement", "accent"))).toEqual({ surlignage: false, soulignement: true, impact: false });
	});
});
