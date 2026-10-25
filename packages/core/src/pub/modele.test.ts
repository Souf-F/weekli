import { describe, expect, it } from "vitest";
import { LIMITES_PUB } from "./limites";
import { choisirTrame, type EntreeScriptPub, scriptPubDepuisReponses } from "./modele";
import { nettoyerScriptPub } from "./nettoyer";
import type { CaptureRef, ScenePub, ScriptPub } from "./types";

const capture = (id: string, legende?: string): CaptureRef => ({
	id,
	source: "site",
	url: `https://exemple.test/${id}`,
	format: "bureau",
	legende,
});

const JEUX: Record<string, EntreeScriptPub> = {
	restaurant: {
		nom: "Tablée",
		repo: "tablee",
		lien: "https://tablee.example",
		reponses: {
			pourQui: "Les restaurateurs indépendants qui prennent les réservations au téléphone pendant le service.",
			probleme:
				"Le téléphone sonne en plein coup de feu, les réservations se perdent sur un carnet, des tables restent vides.",
			promesse: "Les réservations arrivent toutes seules et le service reste calme.",
		},
		marque: { primaire: "#C2410C", accent: "#ea580c" },
		captures: [capture("accueil", "Accueil"), capture("salle", "Plan de salle")],
	},
	sansCapture: {
		nom: "x",
		repo: "x",
		lien: "https://x.example",
		reponses: { pourQui: "Moi", probleme: "Lent", promesse: "Rapide" },
	},
	nomTresLong: {
		nom: "Un nom de projet beaucoup trop long pour tenir dans la révélation",
		repo: "nom-long",
		lien: "https://github.com/Souf-F/nom-long",
		reponses: { pourQui: "Pour les PME", probleme: "Factures en retard", promesse: "Payé à temps" },
		captures: [capture("tableau")],
	},
	sixCaptures: {
		nom: "Scanner",
		repo: "scanner-ssl",
		lien: "https://scanner-ssl.dev",
		slogan: "Votre site, sans angle mort.",
		reponses: {
			pourQui: "Les petites agences web qui livrent des sites à leurs clients.",
			probleme: "Un certificat expire, un en-tête manque, et personne ne le voit avant le client.",
			promesse: "Chaque faille est repérée avant qu'elle ne coûte un client.",
		},
		captures: ["a", "b", "c", "d", "e", "f"].map((id) => capture(id, `Écran ${id}`)),
	},
	ponctuationLibre: {
		nom: "Jardin",
		repo: "jardin",
		lien: "https://jardin.example/",
		reponses: {
			pourQui: "les jardiniers amateurs",
			probleme: "On oublie d'arroser; les plantes meurent",
			promesse: "un rappel au bon moment",
		},
		marque: { primaire: "rouge" },
		captures: [capture("calendrier", "Calendrier"), capture("plantes"), capture("rappels", "Rappels")],
	},
};

const visibles = (s: ScriptPub) => s.scenes.filter((x) => !x.masquee);
const etapes = (s: ScriptPub) => s.scenes.filter((x): x is Extract<ScenePub, { type: "etape" }> => x.type === "etape");

describe("scriptPubDepuisReponses", () => {
	for (const [nom, entree] of Object.entries(JEUX)) {
		it(`${nom} : passe nettoyerScriptPub sans erreur et sans rien modifier`, () => {
			const script = scriptPubDepuisReponses(entree);
			const r = nettoyerScriptPub(script);
			expect(r.erreurs).toEqual([]);
			expect(r.script).toEqual(script);
			expect(script.scenes.length).toBeGreaterThanOrEqual(10);
			expect(script.scenes.length).toBeLessThanOrEqual(LIMITES_PUB.scenes.max);
			expect(visibles(script).at(-1)?.type).toBe("fin");
		});

		it(`${nom} : chaque etape porte une capture existante`, () => {
			const script = scriptPubDepuisReponses(entree);
			const ids = new Set(script.captures.map((c) => c.id));
			for (const e of etapes(script)) {
				expect(e.visuel.type).toBe("capture");
				expect(e.visuel.type === "capture" && ids.has(e.visuel.capture)).toBe(true);
			}
		});
	}

	it("tient en 50 a 65 s et 120 a 170 mots des qu'il y a des captures", () => {
		for (const nom of ["restaurant", "nomTresLong", "sixCaptures", "ponctuationLibre"]) {
			expect(nettoyerScriptPub(scriptPubDepuisReponses(JEUX[nom])).avertissements, nom).toEqual([]);
		}
	});

	it("sans capture : aucune etape, et seuls la voix et la duree sont signales trop courtes", () => {
		const script = scriptPubDepuisReponses(JEUX.sansCapture);
		expect(etapes(script)).toEqual([]);
		const { avertissements } = nettoyerScriptPub(script);
		expect(avertissements).toHaveLength(2);
		expect(avertissements.join("\n")).toMatch(/Voix totale.*\n.*Duree totale/);
	});

	it("une seule capture donne deux etapes sur deux cadrages", () => {
		const e = etapes(scriptPubDepuisReponses(JEUX.nomTresLong));
		expect(e.map((x) => x.visuel)).toEqual([
			{ type: "capture", capture: "tableau", cadrage: "haut" },
			{ type: "capture", capture: "tableau", cadrage: "bas" },
		]);
		expect(e.map((x) => x.onglet)).toEqual(["Écran 1", "Écran 2"]);
	});

	it("au plus 4 etapes, et le chorus facultatif disparait pour tenir sous 170 mots", () => {
		const script = scriptPubDepuisReponses(JEUX.sixCaptures);
		expect(etapes(script)).toHaveLength(4);
		expect(script.scenes.some((x) => x.type === "chorus")).toBe(false);
		expect(script.captures).toHaveLength(6);
	});

	it("n'invente aucune preuve : la scene preuve est livree masquee", () => {
		for (const entree of Object.values(JEUX)) {
			const preuves = scriptPubDepuisReponses(entree).scenes.filter((x) => x.type === "preuve");
			expect(preuves).toHaveLength(1);
			expect(preuves[0].masquee).toBe(true);
		}
	});

	it("reprend les reponses sans les couper au milieu d'une phrase", () => {
		const script = scriptPubDepuisReponses(JEUX.restaurant);
		const scene = (id: string) => script.scenes.find((x) => x.id === id) as Record<string, unknown>;
		expect(scene("ouverture").voix).toBe("Pour les restaurateurs indépendants, chaque journée se ressemble.");
		expect(scene("revelation").slogan).toEqual({
			texte: "Les réservations arrivent toutes seules.",
			accent: "toutes seules.",
		});
		expect(scene("resultat").voix).toBe(
			"Le résultat : les réservations arrivent toutes seules et le service reste calme.",
		);
		expect(script.reponses).toEqual(JEUX.restaurant.reponses);
	});

	it("garde le slogan donne et le lien lisible", () => {
		const script = scriptPubDepuisReponses(JEUX.sixCaptures);
		const fin = script.scenes.at(-1) as Extract<ScenePub, { type: "fin" }>;
		expect(fin.slogan).toBe("Votre site, sans angle mort.");
		expect(fin.liens).toEqual(["scanner-ssl.dev"]);
		const long = scriptPubDepuisReponses(JEUX.nomTresLong).scenes.at(-1) as Extract<ScenePub, { type: "fin" }>;
		expect(long.liens).toEqual(["github.com/Souf-F/nom-long"]);
	});

	it("borne un nom trop long sans couper un mot", () => {
		const script = scriptPubDepuisReponses(JEUX.nomTresLong);
		expect(script.projet.nom).toBe("Un nom de projet beaucoup trop long pour");
		expect(Array.from(script.projet.nom).length).toBeLessThanOrEqual(LIMITES_PUB.nom);
		expect(script.marque.monogramme).toBe("U");
		expect(script.scenes.find((x) => x.type === "appel")).toMatchObject({ bouton: "Découvrir le projet" });
	});

	it("couleurs : #rrggbb en minuscules, primaire invalide remplacee par le bleu par defaut", () => {
		expect(scriptPubDepuisReponses(JEUX.restaurant).marque).toMatchObject({
			primaire: "#c2410c",
			accent: "#ea580c",
		});
		const marque = scriptPubDepuisReponses(JEUX.ponctuationLibre).marque;
		expect(marque.primaire).toBe("#3d4bff");
		expect(marque).not.toHaveProperty("accent");
	});

	it("ecarte les captures que nettoyerScriptPub refuserait", () => {
		const script = scriptPubDepuisReponses({
			...JEUX.restaurant,
			captures: [
				capture("Majuscule"),
				{ id: "http", source: "site", url: "http://exemple.test", format: "bureau" },
				{ id: "sans-url", source: "site", format: "bureau" },
				capture("bonne"),
				capture("bonne"),
				{ id: "locale", source: "importee", format: "mobile" },
			],
		});
		expect(script.captures.map((c) => c.id)).toEqual(["bonne", "locale"]);
		expect(etapes(script).map((e) => e.visuel.type === "capture" && e.visuel.capture)).toEqual(["bonne", "locale"]);
		expect(nettoyerScriptPub(script).erreurs).toEqual([]);
	});

	it("retire tirets longs et caracteres de controle des reponses", () => {
		const tiret = String.fromCharCode(0x2014);
		const script = scriptPubDepuisReponses({
			...JEUX.restaurant,
			nom: `Tab${String.fromCharCode(0x202e)}lée`,
			reponses: {
				pourQui: `Les fleuristes ${tiret} et leurs clients`,
				probleme: "Les commandes\nse perdent",
				promesse: `Tout arrive ${tiret} enfin`,
			},
		});
		const json = JSON.stringify(script);
		expect(json).not.toContain(tiret);
		expect(json).not.toContain(String.fromCharCode(0x202e));
		expect(script.reponses.pourQui).toBe("Les fleuristes, et leurs clients");
		expect(script.reponses.probleme).toBe("Les commandes se perdent");
		expect(nettoyerScriptPub(script).erreurs).toEqual([]);
	});

	it("chaque accent est contenu dans son texte", () => {
		for (const entree of Object.values(JEUX)) {
			const json = JSON.stringify(scriptPubDepuisReponses(entree));
			for (const [, texte, accent] of json.matchAll(/"texte":"([^"]*)","accent":"([^"]*)"/g)) {
				expect(texte.endsWith(accent)).toBe(true);
			}
		}
	});
});

describe("trames narratives", () => {
	const quatre = ["a", "b", "c", "d"].map((id) => capture(id, `Écran ${id}`));
	const manifeste: EntreeScriptPub = {
		...JEUX.sixCaptures,
		reponses: {
			pourQui: "Les artisans indépendants.",
			probleme: "Leurs outils les enferment.",
			promesse: "Nous croyons que chacun mérite des outils libres.",
		},
		captures: quatre,
	};
	const demonstration: EntreeScriptPub = { ...JEUX.sixCaptures, captures: quatre };
	const types = (e: EntreeScriptPub) => scriptPubDepuisReponses(e).scenes.map((s) => s.type);

	it("choisit au moins deux trames differentes sur des reponses variees", () => {
		const choix = [JEUX.restaurant, JEUX.sansCapture, demonstration, manifeste].map(
			(e) => scriptPubDepuisReponses(e).trame,
		);
		expect(choix).toEqual([
			"probleme-qui-revient",
			"probleme-qui-revient",
			"demonstration-directe",
			"vision-manifeste",
		]);
		expect(new Set(choix).size).toBeGreaterThanOrEqual(2);
	});

	it("applique la regle documentee de choisirTrame", () => {
		expect(choisirTrame(manifeste.reponses, 0)).toBe("vision-manifeste");
		expect(choisirTrame(JEUX.restaurant.reponses, 6)).toBe("probleme-qui-revient");
		expect(choisirTrame(demonstration.reponses, 3)).toBe("probleme-qui-revient");
		expect(choisirTrame(demonstration.reponses, 4)).toBe("demonstration-directe");
	});

	it("chaque trame donne un ordre de scenes different, valide et sans avertissement", () => {
		const ordres = new Set<string>();
		for (const e of [JEUX.restaurant, demonstration, manifeste]) {
			const script = scriptPubDepuisReponses({ ...e, captures: e.captures?.length ? e.captures : quatre });
			const r = nettoyerScriptPub(script);
			expect(r.erreurs).toEqual([]);
			expect(r.script).toEqual(script);
			expect(r.avertissements, script.trame).toEqual([]);
			ordres.add(script.scenes.map((s) => s.type).join());
		}
		expect(ordres.size).toBe(3);
	});

	it("la demonstration et le manifeste sautent la tension de la trame du probleme", () => {
		for (const e of [demonstration, manifeste]) {
			const t = types(e);
			for (const x of ["repetition", "boucle"] as const) expect(t).not.toContain(x);
		}
		expect(types(demonstration).slice(0, 2)).toEqual(["ouverture", "revelation"]);
		expect(types(manifeste).slice(0, 3)).toEqual(["ouverture", "rupture", "revelation"]);
		expect(types(JEUX.restaurant)).toContain("boucle");
	});

	it("une trame forcee est respectee, sauf la demonstration sans capture", () => {
		expect(scriptPubDepuisReponses({ ...JEUX.restaurant, trame: "vision-manifeste" }).trame).toBe("vision-manifeste");
		const sans = scriptPubDepuisReponses({ ...JEUX.sansCapture, trame: "demonstration-directe" });
		expect(sans.trame).toBe("probleme-qui-revient");
		for (const trame of ["probleme-qui-revient", "vision-manifeste"] as const) {
			const s = scriptPubDepuisReponses({ ...JEUX.sansCapture, trame });
			expect(nettoyerScriptPub(s).erreurs).toEqual([]);
		}
	});

	it("n'invente aucune preuve et n'emploie ni tiret ni repere Stepwize force", () => {
		for (const e of [demonstration, manifeste]) {
			const json = JSON.stringify(scriptPubDepuisReponses(e));
			expect(json).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
			expect(json).not.toContain("Lundi");
		}
	});
});

