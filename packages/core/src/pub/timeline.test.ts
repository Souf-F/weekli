import { describe, expect, it } from "vitest";
import { EXEMPLE } from "./exemple.fixture";
import { DECALAGE_VOIX, DUREE_GESTES, DUREES_SCENE, DUREES_TRANSITION, PAUSE_LECTURE } from "./limites";
import { nettoyerScriptPub } from "./nettoyer";
import { butScene, calculerTimeline, dureeScene, dureeVoixEstimee, instantTimeline, plancherScene } from "./timeline";
import type { ScenePub, ScriptPub } from "./types";

const base = (): ScriptPub => structuredClone(nettoyerScriptPub(EXEMPLE).script as ScriptPub);
const sceneDe = (s: ScriptPub, id: string) => s.scenes.find((x) => x.id === id) as ScenePub;
const somme = (n: number[]) => n.reduce((a, b) => a + b, 0);

describe("calculerTimeline", () => {
	it("allonge la scene pour que sa voix, decalee, finisse avant le chevauchement suivant", () => {
		const script = base();
		const i = script.scenes.findIndex((x) => x.id === "revelation");
		script.scenes[i + 1].transition = "pixels";
		const tl = calculerTimeline(script);
		tl.scenes.forEach((s, k) => {
			const suivante = tl.scenes[k + 1];
			if (!suivante) return;
			const voix = dureeVoixEstimee(sceneDe(script, s.id).voix, script.voix.vitesse);
			expect(s.debut + DECALAGE_VOIX + voix).toBeLessThanOrEqual(suivante.debut + 1e-9);
		});
		// cas limite : voix qui remplit la scene, suivie d'un chevauchement de 0,6 s
		const serre = base();
		const r = serre.scenes.findIndex((x) => x.id === "revelation");
		serre.scenes[r].voix = Array(18).fill("mot").join(" ");
		serre.scenes[r + 1].transition = "pixels";
		const t = calculerTimeline(serre);
		const rev = t.scenes.find((x) => x.id === "revelation");
		const apres = t.scenes[t.scenes.indexOf(rev as never) + 1];
		const v = dureeVoixEstimee(serre.scenes[r].voix, 1);
		expect((rev?.debut ?? 0) + DECALAGE_VOIX + v).toBeLessThanOrEqual(apres.debut + 1e-9);
	});

	it("place chaque scene a la fin de la precedente moins sa transition", () => {
		const tl = calculerTimeline(base());
		expect(tl.scenes).toHaveLength(12);
		expect(tl.scenes[0]).toMatchObject({ debut: 0, chevauchement: 0 });
		tl.scenes.slice(1).forEach((s, i) => {
			const avant = tl.scenes[i];
			expect(s.chevauchement).toBe(DUREES_TRANSITION[s.transition]);
			expect(s.debut).toBeCloseTo(avant.fin - s.chevauchement, 10);
			expect(s.fin).toBeCloseTo(s.debut + s.duree, 10);
		});
	});

	it("la duree totale vaut la somme des durees moins les chevauchements", () => {
		const tl = calculerTimeline(base());
		const total = somme(tl.scenes.map((s) => s.duree)) - somme(tl.scenes.map((s) => s.chevauchement));
		expect(tl.duree).toBeCloseTo(total, 10);
		expect(tl.duree).toBe(tl.scenes.at(-1)?.fin);
	});

	it("utilise les transitions par defaut de design.md 8.8", () => {
		const tl = calculerTimeline(base());
		const t = Object.fromEntries(tl.scenes.map((s) => [s.id, s.transition]));
		expect(t).toMatchObject({
			repetition: "coupe",
			boucle: "glitch",
			chorus: "flou",
			rupture: "glitch",
			revelation: "pixels",
			"etape-reserver": "flou",
			"etape-confirmer": "coupe",
			"etape-servir": "coupe",
			resultat: "flou",
			appel: "glitch",
			fin: "flou",
		});
	});

	it("respecte une transition explicite et les durees de 0 a 0,6 s", () => {
		const s = base();
		sceneDe(s, "rupture").transition = "pixels";
		sceneDe(s, "boucle").transition = "coupe";
		const tl = calculerTimeline(s);
		const rupture = tl.scenes.find((x) => x.id === "rupture");
		const boucle = tl.scenes.find((x) => x.id === "boucle");
		expect(rupture).toMatchObject({ transition: "pixels", chevauchement: 0.6 });
		expect(boucle).toMatchObject({ transition: "coupe", chevauchement: 0 });
		expect(boucle?.debut).toBe(tl.scenes[1].fin);
		for (const x of tl.scenes) expect(x.chevauchement).toBeLessThanOrEqual(0.6);
	});

	it("la premiere scene ne chevauche rien, quelle que soit sa transition", () => {
		const s = base();
		s.scenes[0].transition = "pixels";
		expect(calculerTimeline(s).scenes[0]).toMatchObject({ debut: 0, chevauchement: 0 });
	});

	it("numerote les etapes et ignore les scenes masquees", () => {
		const s = base();
		sceneDe(s, "etape-confirmer").masquee = true;
		const tl = calculerTimeline(s);
		expect(tl.scenes).toHaveLength(11);
		expect(tl.scenes.some((x) => x.id === "etape-confirmer")).toBe(false);
		expect(tl.scenes.filter((x) => x.etape).map((x) => [x.id, x.etape])).toEqual([
			["etape-reserver", { numero: 1, total: 2 }],
			["etape-servir", { numero: 2, total: 2 }],
		]);
		// la premiere etape visible prend la transition de premiere etape
		const retire = base();
		sceneDe(retire, "etape-reserver").masquee = true;
		expect(calculerTimeline(retire).scenes.find((x) => x.id === "etape-confirmer")?.transition).toBe("flou");
		expect(calculerTimeline(s).scenes.find((x) => x.id === "etape-reserver")?.index).toBe(6);
	});

	it("est deterministe", () => {
		expect(calculerTimeline(base())).toEqual(calculerTimeline(base()));
	});
});

describe("duree d'une scene", () => {
	it("suit la voix plus 0,35 s, bornee par type", () => {
		const s = base();
		const rupture = sceneDe(s, "rupture");
		const { min, max } = DUREES_SCENE.rupture;
		expect(dureeScene(rupture, s, 3)).toBeCloseTo(3.35);
		expect(dureeScene(rupture, s, 0.5)).toBe(min);
		expect(dureeScene(rupture, s, 30)).toBe(max);
	});

	it("estime la voix a 170 mots par minute, ajustee par la vitesse", () => {
		expect(dureeVoixEstimee("un deux trois quatre cinq six", 1)).toBeCloseTo((6 * 60) / 170);
		expect(dureeVoixEstimee("un deux trois quatre cinq six", 1.2)).toBeCloseTo((6 * 60) / (170 * 1.2));
		expect(dureeVoixEstimee("", 1)).toBe(0);
	});

	it("sans voix, utilise duree du script ou le defaut du type", () => {
		const s = base();
		const ouverture = sceneDe(s, "ouverture");
		ouverture.voix = "";
		expect(dureeScene(ouverture, s)).toBe(DUREES_SCENE.ouverture.defaut);
		ouverture.duree = 3;
		expect(dureeScene(ouverture, s)).toBe(3);
		ouverture.duree = 99;
		expect(dureeScene(ouverture, s)).toBe(DUREES_SCENE.ouverture.max);
	});

	it("ignore le texte de la voix quand le mode est aucune", () => {
		const s = base();
		s.voix.mode = "aucune";
		expect(dureeScene(sceneDe(s, "boucle"), s)).toBe(DUREES_SCENE.boucle.defaut);
	});

	it("prefere les durees mesurees aux estimations", () => {
		const s = base();
		const estime = calculerTimeline(s);
		const mesure = calculerTimeline(s, { "etape-servir": 5.5 });
		expect(mesure.scenes.find((x) => x.id === "etape-servir")?.duree).toBeCloseTo(6.15);
		expect(mesure.duree).not.toBeCloseTo(estime.duree);
		expect(calculerTimeline(s, { absent: 9 }).duree).toBe(estime.duree);
	});
});

describe("instantTimeline", () => {
	const tl = calculerTimeline(base());

	it("renvoie null sans scene", () => {
		expect(instantTimeline({ scenes: [], duree: 0 }, 1)).toBeNull();
	});

	it("au milieu d'une scene, pas de scene precedente", () => {
		const s = tl.scenes[3];
		const i = instantTimeline(tl, s.debut + s.duree / 2);
		expect(i?.scene.id).toBe(s.id);
		expect(i?.t).toBeCloseTo(0.5);
		expect(i?.precedente).toBeNull();
	});

	it("pendant un chevauchement, renvoie la precedente et la progression", () => {
		const s = tl.scenes.find((x) => x.id === "revelation");
		if (!s) throw new Error("revelation absente");
		expect(s.chevauchement).toBe(0.6);
		const i = instantTimeline(tl, s.debut + 0.3);
		expect(i?.scene.id).toBe("revelation");
		expect(i?.precedente?.scene.id).toBe("rupture");
		expect(i?.precedente?.progres).toBeCloseTo(0.5);
		expect(i?.precedente?.t).toBeGreaterThan(0.8);
		expect(i?.precedente?.t).toBeLessThan(1);
		// juste apres : la transition est finie
		expect(instantTimeline(tl, s.debut + 0.61)?.precedente).toBeNull();
	});

	it("une coupe n'a jamais de scene precedente", () => {
		const s = tl.scenes[1];
		expect(s.transition).toBe("coupe");
		expect(instantTimeline(tl, s.debut)?.precedente).toBeNull();
		expect(instantTimeline(tl, s.debut)?.scene.id).toBe(s.id);
	});

	it("borne avant le debut et apres la fin", () => {
		expect(instantTimeline(tl, -5)).toMatchObject({ scene: { id: "ouverture" }, t: 0 });
		expect(instantTimeline(tl, tl.duree + 10)).toMatchObject({ scene: { id: "fin" }, t: 1 });
		expect(instantTimeline(tl, tl.duree)?.t).toBe(1);
	});
});

describe("scenes d'explication et captures breves", () => {
	it("applique les durees et transitions par defaut des nouveaux types", () => {
		const s = base();
		const modele = { voix: "", titre: { texte: "Un titre." } };
		s.scenes.splice(
			7,
			0,
			{ ...modele, id: "t", type: "transformation", entree: { icone: "document", libelle: "A" }, operateur: "B", sortie: { icone: "coche", libelle: "C" } },
			{ ...modele, id: "f", type: "flux", noeuds: [] },
			{ ...modele, id: "a", type: "avantapres", paires: [] },
		);
		const tl = calculerTimeline(s);
		const par = Object.fromEntries(tl.scenes.map((x) => [x.id, x]));
		expect(par.t).toMatchObject({ transition: "flou", duree: DUREES_SCENE.transformation.defaut });
		expect(par.f).toMatchObject({ transition: "coupe", duree: DUREES_SCENE.flux.defaut });
		expect(par.a).toMatchObject({ transition: "glitch", duree: DUREES_SCENE.avantapres.defaut });
		expect(tl.scenes.filter((x) => x.etape)).toHaveLength(3);
	});

	it("une etape portee par une capture dure 2,5 s au plus, une etape en liste garde ses bornes", () => {
		const s = base();
		s.voix.mode = "aucune";
		expect(dureeScene(sceneDe(s, "etape-reserver"), s)).toBe(2.5);
		expect(dureeScene(sceneDe(s, "etape-confirmer"), s)).toBe(DUREES_SCENE.etape.defaut);
		const longue = sceneDe(s, "etape-reserver");
		longue.duree = 6;
		expect(dureeScene(longue, s)).toBe(2.5);
		longue.duree = 0.5;
		expect(dureeScene(longue, s)).toBe(1.8);
	});
});

describe("pause de lecture selon le but", () => {
	const sansVoix = () => {
		const s = base();
		s.voix.mode = "aucune";
		return s;
	};

	it("garde la scene au moins gestes plus pause, dans ses bornes, pour les trois buts", () => {
		const s = sansVoix();
		const rupture = sceneDe(s, "rupture") as ScenePub;
		rupture.duree = 0;
		const bornes = DUREES_SCENE.rupture;
		for (const but of ["lire", "comprendre", "montrer"] as const) {
			rupture.but = but;
			const attendu = Math.min(Math.max(DUREE_GESTES.rupture + PAUSE_LECTURE[but], bornes.min), bornes.max);
			expect(plancherScene(rupture)).toBeCloseTo(attendu);
			expect(dureeScene(rupture, s)).toBeGreaterThanOrEqual(attendu - 1e-9);
		}
	});

	it("prolonge une scene lire courte jusqu'a gestes plus 1,2 s", () => {
		const s = sansVoix();
		const ouverture = sceneDe(s, "ouverture");
		ouverture.duree = 1;
		ouverture.but = "lire";
		expect(dureeScene(ouverture, s)).toBeCloseTo(DUREE_GESTES.ouverture + PAUSE_LECTURE.lire);
		ouverture.but = "montrer";
		expect(dureeScene(ouverture, s)).toBe(DUREES_SCENE.ouverture.min);
	});

	it("applique le but par defaut du type, et montrer a une etape portee par une capture", () => {
		const s = base();
		expect(butScene({ ...sceneDe(s, "ouverture"), but: undefined } as ScenePub)).toBe("lire");
		expect(butScene({ ...sceneDe(s, "ouverture"), but: "montrer" } as ScenePub)).toBe("montrer");
		const capture = s.scenes.find((x) => x.type === "etape" && x.visuel.type === "capture");
		if (capture) expect(butScene({ ...capture, but: "lire" })).toBe("montrer");
	});
});

describe("gestes choisis et transitions", () => {
	it("remplace par une coupe toute transition absente de gestes, sans changer les autres", () => {
		const s = base();
		s.gestes = ["impact", "glitch", "lettres"];
		const tl = calculerTimeline(s);
		expect(tl.scenes.every((x) => x.transition === "coupe" || x.transition === "glitch")).toBe(true);
		expect(tl.scenes.some((x) => x.transition === "glitch")).toBe(true);
		s.gestes = ["accent", "soulignement", "flou"];
		const autre = calculerTimeline(s);
		expect(autre.scenes.every((x) => x.transition === "coupe" || x.transition === "flou")).toBe(true);
		expect(autre.duree).not.toBeCloseTo(tl.duree, 3);
	});

	it("garde les defauts du catalogue sans gestes", () => {
		const s = base();
		delete s.gestes;
		expect(calculerTimeline(s).scenes.some((x) => x.transition === "pixels")).toBe(true);
	});
});
