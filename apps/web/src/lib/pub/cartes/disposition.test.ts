import { describe, expect, it } from "vitest";
import { choisirVignette, disposerCarte, domaineDe, formatDe } from "./disposition";
import { easeOutExpo, mouvementCarte } from "./mouvement";
import { detecterTypeImage } from "./type-image";

const ZONE = { x: 940, y: 140, largeur: 860, hauteur: 800 };

describe("disposerCarte", () => {
	it("bureau : largeur entre 760 et 880 px, rapport entre 4:3 et 16:10, barre de 40 px", () => {
		const d = disposerCarte("bureau", { largeur: 1280, hauteur: 800 }, "complet", undefined, { ...ZONE, largeur: 1200 });
		expect(d.largeur).toBeGreaterThanOrEqual(760);
		expect(d.largeur).toBeLessThanOrEqual(880);
		const r = d.ecran.largeur / d.ecran.hauteur;
		expect(r).toBeGreaterThanOrEqual(4 / 3 - 1e-9);
		expect(r).toBeLessThanOrEqual(1.6 + 1e-9);
		expect(d.hauteur - d.ecran.hauteur).toBeCloseTo(40);
		expect(d.ecran.y).toBeCloseTo(-d.hauteur / 2 + 40);
	});

	it("laisse la marge du zoom maximal (1,12) dans la zone", () => {
		const d = disposerCarte("bureau", { largeur: 1280, hauteur: 800 }, "complet", undefined, ZONE);
		expect(d.largeur * 1.12).toBeLessThanOrEqual(ZONE.largeur + 1e-9);
		expect(d.hauteur * 1.12).toBeLessThanOrEqual(ZONE.hauteur + 1e-9);
	});

	it("reduit la carte quand la zone est trop basse, proportions gardees", () => {
		const grande = disposerCarte("bureau", { largeur: 1280, hauteur: 800 }, "complet", undefined, { ...ZONE, hauteur: 2000 });
		const basse = disposerCarte("bureau", { largeur: 1280, hauteur: 800 }, "complet", undefined, { ...ZONE, hauteur: 400 });
		expect(basse.hauteur * 1.12).toBeLessThanOrEqual(400 + 1e-9);
		expect(basse.largeur / basse.hauteur).toBeCloseTo(grande.largeur / grande.hauteur);
	});

	it("mobile : 340 px, bord de 10 px, ecran en 9:19,5 pour une capture complete", () => {
		const d = disposerCarte("mobile", { largeur: 780, hauteur: 1688 }, "complet", undefined, { ...ZONE, hauteur: 1000 });
		expect(d.largeur).toBe(340);
		expect(d.ecran.largeur).toBe(320);
		expect(d.ecran.largeur / d.ecran.hauteur).toBeCloseTo(780 / 1688, 2);
		expect(d.rayonEcran).toBe(38);
	});

	it("image absente : ecran vide aux proportions du format, sans focus", () => {
		const d = disposerCarte("bureau", null, "haut", { x: 0, y: 0, largeur: 0.5, hauteur: 0.5 }, ZONE);
		expect(d.focus).toBeNull();
		expect(d.ecran.largeur / d.ecran.hauteur).toBeGreaterThan(1.3);
	});

	it("place le focus dans le repere de l'ecran", () => {
		const d = disposerCarte("bureau", { largeur: 1280, hauteur: 800 }, "complet", { x: 0.5, y: 0.5, largeur: 0.25, hauteur: 0.25 }, ZONE);
		expect(d.focus).toEqual({ x: 0.5, y: 0.5, largeur: 0.25, hauteur: 0.25 });
	});
});

describe("formatDe, domaineDe, choisirVignette", () => {
	it("le format du script fait foi, sinon la forme de l'image", () => {
		expect(formatDe({ largeur: 780, hauteur: 1688 })).toBe("mobile");
		expect(formatDe({ largeur: 1280, hauteur: 800 })).toBe("bureau");
		expect(formatDe(null)).toBe("bureau");
		expect(formatDe({ largeur: 780, hauteur: 1688 }, { id: "a", source: "site", format: "bureau" })).toBe("bureau");
	});

	it("domaine sans www, ou legende pour une image importee", () => {
		expect(domaineDe({ id: "a", source: "site", format: "bureau", url: "https://www.exemple.fr/page?x=1" })).toBe("exemple.fr");
		expect(domaineDe({ id: "a", source: "importee", format: "bureau", legende: "Tableau" })).toBe("Tableau");
		expect(domaineDe({ id: "a", source: "site", format: "bureau", url: "pas une url" })).toBe("");
		expect(domaineDe(undefined)).toBe("");
	});

	const refs = ["a", "b", "c"].map((id) => ({ id, source: "importee" as const, format: "bureau" as const }));

	it("prend la capture suivante, differente de la principale et chargee", () => {
		expect(choisirVignette(refs, "a", () => true)).toBe("b");
		expect(choisirVignette(refs, "c", () => true)).toBe("a");
		expect(choisirVignette(refs, "a", (id) => id === "c")).toBe("c");
		expect(choisirVignette(refs, "a", (id) => id === "a")).toBeNull();
		expect(choisirVignette([refs[0]], "a", () => true)).toBeNull();
	});
});

describe("mouvementCarte", () => {
	it("entree : 60 px plus bas, echelle 0,94, invisible, puis en place apres 500 ms", () => {
		const debut = mouvementCarte(0, 0, 0, false);
		expect(debut).toMatchObject({ opacite: 0, montee: 60 });
		expect(debut.echelle).toBeCloseTo(0.94);
		const fin = mouvementCarte(0.2, 0.5, 0, false);
		expect(fin.opacite).toBe(1);
		expect(fin.montee).toBe(0);
	});

	it("la vignette entre avec 150 ms de retard", () => {
		expect(mouvementCarte(0.1, 0.15, 0.15, false).opacite).toBe(0);
		expect(mouvementCarte(0.1, 0.3, 0.15, false).opacite).toBeGreaterThan(0);
	});

	it("Ken Burns : 1 vers 1,05 sans focus", () => {
		expect(mouvementCarte(1, 5, 0, false).echelle).toBeCloseTo(1.05);
		expect(mouvementCarte(0.5, 5, 0, false).echelle).toBeCloseTo(1.025);
	});

	it("focus : rien avant t 0,45, puis zoom de 1,05 vers 1,12", () => {
		expect(mouvementCarte(0.45, 5, 0, true)).toMatchObject({ focus: 0 });
		expect(mouvementCarte(0.45, 5, 0, true).echelle).toBeCloseTo(1.05);
		const fin = mouvementCarte(1, 5, 0, true);
		expect(fin.focus).toBe(1);
		expect(fin.echelle).toBeCloseTo(1.12);
		expect(fin.glissement).toBe(1);
	});

	it("est monotone sur la scene", () => {
		let prec = 0;
		for (let t = 0; t <= 1; t += 0.05) {
			const e = mouvementCarte(t, t * 4.5, 0, true).echelle;
			expect(e).toBeGreaterThanOrEqual(prec - 1e-9);
			prec = e;
		}
	});

	it("easeOutExpo borne ses entrees", () => {
		expect(easeOutExpo(-1)).toBe(0);
		expect(easeOutExpo(2)).toBe(1);
		expect(easeOutExpo(0.5)).toBeGreaterThan(0.9);
	});
});

describe("detecterTypeImage", () => {
	const octets = (...b: number[]) => new Uint8Array(b);
	const texte = (s: string) => new TextEncoder().encode(s);

	it("reconnait PNG, JPEG, WebP et SVG par leur contenu", () => {
		expect(detecterTypeImage(octets(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
		expect(detecterTypeImage(octets(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
		expect(detecterTypeImage(new Uint8Array([...texte("RIFF"), 0, 0, 0, 0, ...texte("WEBP")]))).toBe("image/webp");
		expect(detecterTypeImage(texte('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe("image/svg+xml");
		expect(detecterTypeImage(texte("  <svg viewBox='0 0 1 1'></svg>"))).toBe("image/svg+xml");
	});

	it("refuse le reste, y compris du HTML renomme", () => {
		expect(detecterTypeImage(texte("<html><svg></svg></html>"))).toBeNull();
		expect(detecterTypeImage(texte("GIF89a"))).toBeNull();
		expect(detecterTypeImage(new Uint8Array(0))).toBeNull();
	});
});
