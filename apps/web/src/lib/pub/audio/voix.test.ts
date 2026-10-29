import type { ScriptPub } from "@weekli/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scriptDeTest } from "../banc/script-test";
import { TAUX } from "./bruit";
import { type EtatVoix, synthetiserVoix, viderCacheVoix } from "./voix";

const script = (): ScriptPub => {
	const base = scriptDeTest(30);
	return {
		...base,
		voix: { mode: "synthese", vitesse: 1, prononciation: {} },
		scenes: base.scenes.slice(0, 3).map((s, i) => ({ ...s, voix: `Phrase numéro ${i}.` })),
	};
};

// Route /api/voix simulee : renvoie 1 s d'audio par scene, ou echoue sur demande
const decoder = async () => new Float32Array(TAUX);
const route = (echec?: (scene: string) => Error | null) =>
	vi.fn(async (_texte: string, scene: string) => {
		const e = echec?.(scene);
		if (e) throw e;
		return new ArrayBuffer(8);
	});

beforeEach(viderCacheVoix);

describe("voix de la pub", () => {
	it("demande chaque scene au serveur, avec son texte et son id", async () => {
		const appeler = route();
		const etats: EtatVoix[] = [];
		const r = await synthetiserVoix(script(), { appeler, decoder, surEtat: (e) => etats.push(e) });
		expect(appeler.mock.calls).toEqual([["Phrase numéro 0.", "s1"], ["Phrase numéro 1.", "s2"], ["Phrase numéro 2.", "s3"]]);
		expect(r.etat).toEqual({ source: "serveur", secours: false });
		expect(etats).toEqual([{ source: "serveur", secours: false }]);
		expect(r.durees).toEqual({ s1: 1, s2: 1, s3: 1 });
	});

	it("ne redemande pas une scene deja obtenue", async () => {
		const appeler = route();
		await synthetiserVoix(script(), { appeler, decoder });
		await synthetiserVoix(script(), { appeler, decoder });
		expect(appeler).toHaveBeenCalledTimes(3);
	});

	it("bascule sur Kokoro des le premier echec et previent l'interface", async () => {
		const appeler = route((scene) => (scene === "s2" ? new Error("Le serveur de voix a répondu 502") : null));
		const kokoro = {
			charger: vi.fn(async () => ({ fils: 4, mesures: {} as never })),
			synthetiser: vi.fn(async () => ({ audio: new Float32Array(TAUX * 2) as Float32Array<ArrayBuffer>, frequence: TAUX, phonemes: "", mesures: {} as never })),
			terminer: vi.fn(),
		};
		const etats: EtatVoix[] = [];
		const r = await synthetiserVoix(script(), { appeler, decoder, voix: kokoro, surEtat: (e) => etats.push(e) });
		expect(r.etat).toEqual({ source: "kokoro", secours: true, raison: "Le serveur de voix a répondu 502" });
		expect(etats.map((e) => e.source)).toEqual(["serveur", "kokoro"]);
		expect(kokoro.synthetiser).toHaveBeenCalledTimes(3); // toute la pub en Kokoro : une seule voix
		expect(r.fils).toBe(4);
		expect(r.durees.s1).toBe(2);
		expect(kokoro.terminer).not.toHaveBeenCalled(); // l'instance fournie n'est pas fermee
	});

	it("saute le serveur avec sansServeur", async () => {
		const appeler = route();
		const kokoro = {
			charger: async () => ({ fils: 1, mesures: {} as never }),
			synthetiser: async () => ({ audio: new Float32Array(TAUX) as Float32Array<ArrayBuffer>, frequence: TAUX, phonemes: "", mesures: {} as never }),
			terminer: () => {},
		};
		const r = await synthetiserVoix(script(), { appeler, decoder, voix: kokoro, sansServeur: true });
		expect(appeler).not.toHaveBeenCalled();
		expect(r.etat.source).toBe("kokoro");
	});

	it("ne fait rien sans voix (mode aucune)", async () => {
		const appeler = route();
		const s = script();
		s.voix.mode = "aucune";
		const r = await synthetiserVoix(s, { appeler, decoder });
		expect(appeler).not.toHaveBeenCalled();
		expect(r.durees).toEqual({});
	});

	it("propage l'annulation sans basculer sur Kokoro", async () => {
		const controle = new AbortController();
		controle.abort();
		await expect(synthetiserVoix(script(), { appeler: route(), decoder, signal: controle.signal })).rejects.toMatchObject({ name: "AbortError" });
	});
});
