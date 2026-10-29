import { calculerTimeline, type ScriptPub } from "@weekli/core";
import { describe, expect, it } from "vitest";
import { scriptDeTest } from "../banc/script-test";
import { DECALAGE_VOIX } from "../synchro";
import { cretes, TAUX, versDb } from "./bruit";
import { genererClic, genererImpact, genererMontee, genererSouffle } from "./effets";
import { sonieIntegree } from "./loudness";
import { CIBLE_LUFS, courbeBaisse, mixer } from "./mixage";
import { genererMusique } from "./musique";
import { planifierEffets } from "./plan";

const sinus = (frequence: number, secondes: number, amplitude: number) =>
	Float32Array.from({ length: Math.round(secondes * TAUX) }, (_, i) => amplitude * Math.sin((2 * Math.PI * frequence * i) / TAUX));

// Voix factice : bruit rose-ish module en syllabes de 200 ms, assez irregulier pour ressembler a de la parole
function voixFactice(secondes: number): Float32Array {
	let s = 11;
	const alea = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * 2 - 1;
	let filtre = 0;
	return Float32Array.from({ length: Math.round(secondes * TAUX) }, (_, i) => {
		filtre += 0.12 * (alea() - filtre);
		return filtre * 2.2 * Math.max(0, Math.sin((2 * Math.PI * i) / (0.2 * TAUX))) ** 0.5;
	});
}

describe("sonie", () => {
	it("mesure un sinus de 997 Hz pleine echelle sur deux canaux a 0 LUFS (norme BS.1770)", () => {
		const c = sinus(997, 5, 1);
		expect(sonieIntegree([c, c])).toBeCloseTo(0, 1);
	});
	it("baisse de 1 LU quand le niveau baisse de 1 dB", () => {
		const a = sonieIntegree([sinus(997, 5, 0.5)]);
		const b = sonieIntegree([sinus(997, 5, 0.5 * 10 ** (-1 / 20))]);
		expect(a - b).toBeCloseTo(1, 2);
	});
	it("ignore le silence", () => {
		expect(sonieIntegree([new Float32Array(TAUX * 2)])).toBe(Number.NEGATIVE_INFINITY);
	});
});

describe("baisse de la musique sous la voix", () => {
	const courbe = courbeBaisse(TAUX * 4, [{ debut: 1, fin: 2 }]);
	it("descend de 9 dB pendant la voix et revient a 0 dB apres", () => {
		expect(versDb(courbe[Math.round(1.9 * TAUX)])).toBeLessThan(-8.9);
		expect(versDb(courbe[Math.round(1.9 * TAUX)])).toBeGreaterThan(-9.1);
		expect(versDb(courbe[Math.round(3.9 * TAUX)])).toBeGreaterThan(-0.1);
	});
	it("est deja baissee quand la voix commence (anticipation de l'attaque)", () => {
		expect(versDb(courbe[Math.round(1 * TAUX)])).toBeLessThan(-3);
		expect(versDb(courbe[Math.round(0.5 * TAUX)])).toBeCloseTo(0, 5);
	});
	it("relache plus lentement qu'elle n'attaque", () => {
		const apresAttaque = -versDb(courbe[Math.round(0.92 * TAUX) + 1]); // 80 ms apres le depart anticipe
		const apresRelache = -versDb(courbe[Math.round(2.08 * TAUX)]); // 80 ms apres la fin
		expect(apresRelache).toBeGreaterThan(apresAttaque); // la baisse persiste plus longtemps qu'elle ne s'etablit
	});
});

describe("generateurs", () => {
	it("la musique a la duree exacte, deux canaux decorreles, reproductible", () => {
		const [g, d] = genererMusique(8, "energique");
		expect(g.length).toBe(8 * TAUX);
		expect(g).not.toEqual(d);
		expect(genererMusique(8, "energique")[0]).toEqual(g);
		expect(cretes([g, d])).toBeGreaterThan(0.05);
		expect(g.every(Number.isFinite)).toBe(true);
	});
	it("l'ambiance calme n'a pas de batterie (moins de crete que l'energique)", () => {
		expect(cretes(genererMusique(12, "calme"))).toBeLessThan(cretes(genererMusique(12, "energique")));
	});
	it("les effets sont finis, non silencieux et a crete controlee", () => {
		for (const son of [genererSouffle(0.9), genererMontee(), genererImpact(), genererClic()]) {
			expect(son[0].length).toBe(son[1].length);
			const c = cretes(son);
			expect(c).toBeGreaterThan(0.01);
			expect(c).toBeLessThan(0.9);
			expect(son[0].every(Number.isFinite)).toBe(true);
		}
	});
});

describe("mixage", () => {
	const duree = 12;
	const longueur = duree * TAUX;
	const entree = () => ({
		longueur,
		voix: [
			{ debut: 1 + DECALAGE_VOIX, audio: voixFactice(3) },
			{ debut: 6 + DECALAGE_VOIX, audio: voixFactice(2.5) },
		],
		musique: genererMusique(duree, "energique"),
		effets: [{ debut: 4.5, son: genererImpact(), gainDb: -2 }],
	});

	it("atteint -16 LUFS a 0,1 LU pres avec une crete sous -2 dBFS", () => {
		const { canaux, mesures } = mixer(entree());
		expect(Math.abs(mesures.lufs - CIBLE_LUFS)).toBeLessThan(0.1);
		expect(Math.abs(sonieIntegree(canaux) - CIBLE_LUFS)).toBeLessThan(0.1);
		expect(mesures.creteDbfs).toBeLessThanOrEqual(-1.95);
		expect(mesures.baisseMax).toBeGreaterThan(8.5);
	});
	it("place la voix a l'echantillon pres et laisse le debut silencieux sans musique", () => {
		const sansMusique = { ...entree(), musique: null, effets: [] };
		const { canaux } = mixer(sansMusique);
		const premier = canaux[0].findIndex((v) => Math.abs(v) > 1e-4);
		expect(premier).toBeGreaterThanOrEqual(Math.round((1 + DECALAGE_VOIX) * TAUX));
		expect(premier).toBeLessThan(Math.round((1 + DECALAGE_VOIX + 0.1) * TAUX));
	});
	it("la longueur de sortie est celle demandee", () => {
		expect(mixer(entree()).canaux[0].length).toBe(longueur);
	});
	it("coupe une voix a `fin`", () => {
		const e = { ...entree(), musique: null, effets: [], voix: [{ debut: 0, audio: voixFactice(3), fin: 1 }] };
		const { canaux } = mixer(e);
		expect(cretes([canaux[0].subarray(Math.round(1.05 * TAUX))])).toBe(0);
	});
	it("un mixage sans aucun son ne plante pas", () => {
		const { mesures } = mixer({ longueur: TAUX, voix: [], musique: null, effets: [] });
		expect(mesures.lufs).toBe(Number.NEGATIVE_INFINITY);
	});
});

describe("plan des effets", () => {
	const script: ScriptPub = { ...scriptDeTest(40), voix: { mode: "synthese", vitesse: 1, prononciation: {} }, musique: "energique" };
	const timeline = calculerTimeline(script);
	const plan = planifierEffets(script, timeline);
	it("met un souffle sur chaque transition avec chevauchement, aucun sur les coupes", () => {
		const avecChev = timeline.scenes.filter((s) => s.chevauchement > 0).length;
		expect(plan.filter((e) => e.type === "souffle")).toHaveLength(avecChev);
	});
	it("fait monter puis tomber l'impact sur la revelation, la montee finissant a l'impact", () => {
		const rev = timeline.scenes.find((s) => s.type === "revelation");
		const montee = plan.find((e) => e.type === "montee");
		const impact = plan.find((e) => e.type === "impact");
		expect(rev && montee && impact).toBeTruthy();
		expect((impact?.debut ?? 0) - (montee?.debut ?? 0)).toBeCloseTo(1.8, 5);
		expect(impact?.debut).toBeGreaterThanOrEqual(rev?.debut ?? 0);
		expect(plan.filter((e) => e.type === "impact")).toHaveLength(1);
	});
	it("pose un clic par mot surligne, apres le debut de sa scene et avant sa fin", () => {
		const avecAccent: ScriptPub = {
			...script,
			scenes: [{ id: "a", type: "rupture", voix: "Et si quelqu'un s'en occupait vraiment ?", texte: { texte: "Et si quelqu'un s'en occupait ?", accent: "s'en occupait ?" } }],
		};
		const tl = calculerTimeline(avecAccent, { a: 3 });
		const clics = planifierEffets(avecAccent, tl, { a: 3 }).filter((e) => e.type === "clic");
		expect(clics).toHaveLength(1);
		expect(clics[0].debut).toBeGreaterThan(DECALAGE_VOIX);
		expect(clics[0].debut).toBeLessThan(tl.scenes[0].fin);
	});
	it("est trié par instant", () => {
		expect(plan.map((e) => e.debut)).toEqual([...plan.map((e) => e.debut)].sort((a, b) => a - b));
	});
});
