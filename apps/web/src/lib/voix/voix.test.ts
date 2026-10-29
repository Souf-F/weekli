// Tests du pipeline texte vers identifiants, avec le vrai espeak-ng (le portage Emscripten tourne sous Node).
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { assembler, FREQUENCE, rogner, versWav } from "./audio";
import { creerPhonemiseur, reconstituerPaquet, type Phonemiseur } from "./espeak";
import { plagesEspeak } from "./outils/preparer-modeles.mjs";
import { decouperEnLots, nettoyerSortieEspeak, pauseApres, phonemiser, versIdentifiants } from "./phonemes";
import { appliquerPrononciation, DICTIONNAIRE } from "./prononciation";

const TEXTE_BANC =
	"Lundi matin. Tu as codé toute la semaine. Et sur LinkedIn ? Rien. Encore. Et si ton travail parlait enfin pour toi ? " +
	"Voici Weekli. Il lit ton activité GitHub, écrit tes posts dans ton style, et monte la pub de ton projet. " +
	"Ton code de la semaine, raconté. Essaie Weekli, c'est gratuit.";

let espeak: Phonemiseur;
let complet: Phonemiseur;

beforeAll(async () => {
	// Même chargement que dans le navigateur : paquet réduit au français et à l'anglais, reconstitué.
	const racine = dirname(createRequire(import.meta.url).resolve("@echogarden/espeak-ng-emscripten/package.json"));
	const paquet = await readFile(join(racine, "espeak-ng.data"));
	const { plages, tailleComplete } = plagesEspeak(await readFile(join(racine, "espeak-ng.js"), "utf8"));
	const compact = Buffer.concat(plages.map(([debut, longueur]) => paquet.subarray(debut, debut + longueur)));
	espeak = await creerPhonemiseur(reconstituerPaquet(compact, tailleComplete, plages));
	complet = await creerPhonemiseur(paquet.buffer.slice(paquet.byteOffset, paquet.byteOffset + paquet.length));
});

const versPhonemes = (texte: string) => phonemiser(appliquerPrononciation(texte), (s) => espeak.phonemiser(s));

describe("prononciation", () => {
	it("réécrit les mots entiers sans tenir compte de la casse", () => {
		expect(appliquerPrononciation("weekli sur GITHUB, pas githubber")).toBe("Ouikli sur Guite-Heub, pas githubber");
		expect(appliquerPrononciation("Une pull request")).toBe("Une poule-riquouest");
	});

	it("laisse le projet compléter ou remplacer une entrée", () => {
		expect(appliquerPrononciation("Weekli et Kokoro", { Kokoro: "Kocoro", Weekli: "Wikli" })).toBe("Wikli et Kocoro");
	});

	it("chaque entrée est lue en français par espeak-ng (aucun passage à l'anglais)", () => {
		for (const [mot, ecrit] of Object.entries(DICTIONNAIRE)) {
			expect(espeak.phonemiser(ecrit), mot).not.toMatch(/\(en\)/);
		}
	});
});

describe("phonèmes", () => {
	it("le paquet espeak-ng réduit donne exactement les phonèmes du paquet complet", () => {
		for (const texte of [TEXTE_BANC, "Weekli", "Une pull request sur GitHub, MCP et API."]) {
			expect(espeak.phonemiser(texte)).toBe(complet.phonemiser(texte));
		}
	});

	it("nettoie la sortie d'espeak-ng", () => {
		expect(nettoyerSortieEspeak("(en)_w_ˈiː_k_l_i_(fr) | ʁ_i_ˈɛ̃")).toBe("wˈiːkli ʁiˈɛ̃");
	});

	it("garde la ponctuation et les noms propres corrigés sur le texte du banc", () => {
		const phonemes = versPhonemes(TEXTE_BANC);
		expect(phonemes.startsWith("lœ̃dˈi matˈɛ̃. ty a kodˈe tut la səmˈɛn. e syʁ lˈinkedˈin ? ʁiˈɛ̃. ɑ̃kˈɔʁ.")).toBe(true);
		expect(phonemes).toContain("vwasˌi wiklˈi.");
		expect(phonemes).toContain("ɡˈitˈœb,");
		expect(phonemes.endsWith("ɡʁatyˈi.")).toBe(true);
		expect(phonemes).not.toMatch(/[_|()]/);
		expect(versIdentifiants(phonemes)).toHaveLength([...phonemes].length);
	});

	it("ne coupe pas un texte court et coupe un long texte en fin de phrase, en lots équilibrés", () => {
		const court = versPhonemes(TEXTE_BANC);
		expect(decouperEnLots(court)).toEqual([court]);
		const long = Array.from({ length: 6 }, () => court).join(" ");
		const lots = decouperEnLots(long);
		expect(lots.length).toBeGreaterThan(1);
		for (const lot of lots) {
			expect([...lot].length).toBeLessThanOrEqual(510);
			expect(lot.endsWith(".")).toBe(true);
		}
		expect(lots.join(" ")).toBe(long);
	});

	it("choisit la pause selon la ponctuation finale", () => {
		expect(pauseApres("ʁiˈɛ̃.")).toBe(0.25);
		expect(pauseApres("ʁakɔ̃tˈe,")).toBe(0.1);
		expect(pauseApres("ʁakɔ̃tˈe")).toBe(0);
	});
});

describe("audio", () => {
	it("rogne le silence autour du signal", () => {
		const signal = new Float32Array(FREQUENCE);
		for (let i = 8000; i < 16000; i++) signal[i] = Math.sin(i / 10) * 0.5;
		const rogne = rogner(signal);
		expect(rogne.length).toBeLessThan(signal.length);
		expect(rogne.length).toBeGreaterThanOrEqual(8000);
	});

	it("assemble avec les pauses et encode un WAV valide", () => {
		const audio = assembler([
			{ audio: new Float32Array(100).fill(0.5), pause: 0.01 },
			{ audio: new Float32Array(50).fill(-0.5), pause: 0 },
		]);
		expect(audio.length).toBe(100 + 240 + 50);
		const wav = new DataView(versWav(audio));
		expect(wav.byteLength).toBe(44 + audio.length * 2);
		expect(wav.getUint32(24, true)).toBe(FREQUENCE);
		expect(wav.getInt16(44, true)).toBe(Math.round(0.5 * 0x7fff - 0.5));
	});
});
