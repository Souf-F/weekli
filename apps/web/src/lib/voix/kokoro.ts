// Moteur Kokoro (onnxruntime-web) : texte français vers signal 24 kHz. S'exécute dans le Worker vocal.
import * as ort from "onnxruntime-web/wasm";
import urlWasm from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { assembler, FREQUENCE, rogner } from "./audio";
import type { Phonemiseur } from "./espeak";
import { decouperEnLots, pauseApres, phonemiser, versIdentifiants } from "./phonemes";
import { appliquerPrononciation } from "./prononciation";

// Version processeur seule d'onnxruntime-web (14 Mo de WASM). WebGPU est écarté après mesure :
// le modèle int8 y est plus lent qu'en WASM et son binaire (26,8 Mo) dépasse la limite de 25 Mio des assets.
// Plafond de 4 fils : au-delà, les cœurs d'efficacité ralentissent la synthèse (mesuré sur Apple M1).
const FILS_MAX = 4;
const DIMENSION_STYLE = 256;

export interface OptionsSynthese {
	/** 1 = débit d'origine ; kokoro-onnx accepte de 0,5 à 2. */
	vitesse?: number;
	/** Entrées de prononciation propres au projet, prioritaires sur le dictionnaire de Weekli. */
	prononciation?: Record<string, string>;
}

export interface ResultatSynthese {
	audio: Float32Array<ArrayBuffer>;
	frequence: number;
	phonemes: string;
	mesures: { phonemisation: number; inference: number[] };
}

export class MoteurKokoro {
	private readonly session: ort.InferenceSession;
	private readonly voix: Float32Array;
	private readonly espeak: Phonemiseur;
	/** Nombre de fils de calcul : 1 sans isolation cross-origin (pas de SharedArrayBuffer). */
	readonly fils: number;

	private constructor(session: ort.InferenceSession, voix: Float32Array, espeak: Phonemiseur, fils: number) {
		this.session = session;
		this.voix = voix;
		this.espeak = espeak;
		this.fils = fils;
	}

	static async creer(modele: Uint8Array, voix: ArrayBuffer, espeak: Phonemiseur): Promise<MoteurKokoro> {
		// Le WASM est servi par Weekli (aucun CDN) ; le multithread exige l'isolation cross-origin (COOP + COEP).
		const fils = self.crossOriginIsolated ? Math.min(FILS_MAX, navigator.hardwareConcurrency || 1) : 1;
		ort.env.wasm.wasmPaths = { wasm: urlWasm };
		ort.env.wasm.numThreads = fils;
		ort.env.wasm.proxy = false;
		const session = await ort.InferenceSession.create(modele, {
			executionProviders: ["wasm"],
			graphOptimizationLevel: "all",
		});
		return new MoteurKokoro(session, new Float32Array(voix), espeak, fils);
	}

	/** Une ligne de style par longueur de lot : n symboles utilisent la ligne n - 1. */
	private style(longueur: number): Float32Array<ArrayBuffer> {
		const lignes = this.voix.length / DIMENSION_STYLE;
		const ligne = Math.min(longueur, lignes) - 1;
		return this.voix.slice(ligne * DIMENSION_STYLE, (ligne + 1) * DIMENSION_STYLE);
	}

	private async inferer(ids: number[], vitesse: number): Promise<Float32Array> {
		const entree = BigInt64Array.from([0, ...ids, 0], (id) => BigInt(id));
		const sorties = await this.session.run({
			input_ids: new ort.Tensor("int64", entree, [1, entree.length]),
			style: new ort.Tensor("float32", this.style(ids.length), [1, DIMENSION_STYLE]),
			speed: new ort.Tensor("float32", Float32Array.of(vitesse), [1]),
		});
		const audio = sorties.waveform.data as Float32Array;
		for (const tenseur of Object.values(sorties)) tenseur.dispose();
		return audio;
	}

	async synthetiser(texte: string, options: OptionsSynthese = {}): Promise<ResultatSynthese> {
		const vitesse = Math.min(2, Math.max(0.5, options.vitesse ?? 1));
		const debut = performance.now();
		const phonemes = phonemiser(appliquerPrononciation(texte, options.prononciation), (s) => this.espeak.phonemiser(s));
		const lots = decouperEnLots(phonemes);
		if (!lots.length) throw new Error("Rien à dire : le texte ne contient aucun mot prononçable");
		const phonemisation = performance.now() - debut;
		const inference: number[] = [];
		const morceaux: { audio: Float32Array; pause: number }[] = [];
		for (const [i, lot] of lots.entries()) {
			const t0 = performance.now();
			const audio = rogner(await this.inferer(versIdentifiants(lot), vitesse));
			inference.push(performance.now() - t0);
			morceaux.push({ audio, pause: i < lots.length - 1 ? pauseApres(lot) : 0 });
		}
		return { audio: assembler(morceaux), frequence: FREQUENCE, phonemes, mesures: { phonemisation, inference } };
	}
}
