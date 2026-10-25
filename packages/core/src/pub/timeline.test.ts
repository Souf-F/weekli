import { describe, expect, it } from "vitest";
import { EXEMPLE } from "./exemple.fixture";
import { DECALAGE_VOIX, DUREES_SCENE, DUREES_TRANSITION } from "./limites";
import { nettoyerScriptPub } from "./nettoyer";
import { calculerTimeline, dureeScene, dureeVoixEstimee, instantTimeline } from "./timeline";
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
