import type { ScenePub, ScriptPub } from "@weekli/core";
import { rogner } from "../../voix/audio";
import { creerVoix, type Voix } from "../../voix/client";
import { TAUX } from "./bruit";

// Voix de la pub : synthese par scene via le Worker vocal de F1, ou fichiers importes a la place.
// Dans les deux cas le resultat est un tableau mono a 48 kHz par id de scene, et la duree mesuree
// (en secondes) qui alimente calculerTimeline(script, voixMesurees).

export type SourceVoix = "serveur" | "kokoro" | "importee";

// Etat a montrer dans l'interface : quelle voix est utilisee et, en cas de secours, pourquoi
export type EtatVoix = { source: SourceVoix; secours: boolean; raison?: string };

export type VoixPreparee = {
	audio: Record<string, Float32Array>; // mono, 48 kHz, silences de bord retires
	durees: Record<string, number>; // secondes, a passer a creerMoteur({ voixMesurees })
	fils: number; // fils de calcul de Kokoro (1 si la page n'est pas isolee), 0 sinon
	synthetiseMs: number;
	etat: EtatVoix;
};

export type EtapeVoix =
	| { etape: "chargement"; role: string; recu: number; total: number; depuisCache: boolean }
	| { etape: "synthese"; scene: number; total: number };

export type OptionsVoix = {
	voix?: Voix; // instance Kokoro deja chargee (reutilisee, non terminee) ; sinon creee puis terminee
	surProgression?: (e: EtapeVoix) => void;
	surEtat?: (e: EtatVoix) => void; // appele au debut, puis si on bascule sur Kokoro
	signal?: AbortSignal;
	sansServeur?: boolean; // Kokoro d'emblee (hors ligne, ou test du secours)
	// Remplacables pour les tests
	appeler?: (texte: string, scene: string) => Promise<ArrayBuffer>;
	decoder?: (mp3: ArrayBuffer) => Promise<Float32Array>;
};

const aUneVoix = (s: ScenePub) => !s.masquee && s.voix.trim().length > 0;

// Cache de session : une scene dont le texte, la vitesse, la prononciation et la source n'ont pas change
// n'est pas resynthetisee
const cache = new Map<string, Float32Array>();
const cle = (source: SourceVoix, texte: string, script: ScriptPub) =>
	JSON.stringify([source, texte, source === "kokoro" ? [script.voix.vitesse, script.voix.prononciation] : null]);
export const viderCacheVoix = () => cache.clear();

// Passage de 24 kHz (Kokoro) ou de la frequence du fichier a 48 kHz, avec le reechantillonneur du navigateur
async function versTaux(mono: Float32Array, frequence: number): Promise<Float32Array> {
	if (frequence === TAUX) return mono;
	const tampon = new AudioBuffer({ length: mono.length, numberOfChannels: 1, sampleRate: frequence });
	tampon.copyToChannel(mono as Float32Array<ArrayBuffer>, 0);
	const ctx = new OfflineAudioContext(1, Math.ceil((mono.length * TAUX) / frequence), TAUX);
	const source = ctx.createBufferSource();
	source.buffer = tampon;
	source.connect(ctx.destination);
	source.start();
	return (await ctx.startRendering()).getChannelData(0);
}

function verifier(signal?: AbortSignal) {
	if (signal?.aborted) throw new DOMException("Voix annulée", "AbortError");
}

// Route du Worker : POST /api/voix { texte, scene } -> audio/mpeg (voix Microsoft Vivienne via edge-tts)
async function appelerServeur(texte: string, scene: string, signal?: AbortSignal): Promise<ArrayBuffer> {
	const reponse = await fetch("/api/voix", {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ texte, scene }),
		signal,
	});
	if (!reponse.ok) throw new Error(`Le serveur de voix a répondu ${reponse.status}`);
	if (!(reponse.headers.get("Content-Type") ?? "").startsWith("audio/")) throw new Error("Le serveur de voix n'a pas renvoyé d'audio");
	return reponse.arrayBuffer();
}

async function decoderMp3(donnees: ArrayBuffer): Promise<Float32Array> {
	const decode = await new OfflineAudioContext(1, 1, TAUX).decodeAudioData(donnees);
	return rogner(melangerEnMono(decode));
}

function melangerEnMono(decode: AudioBuffer): Float32Array {
	const mono = new Float32Array(decode.length);
	for (let c = 0; c < decode.numberOfChannels; c++) {
		const canal = decode.getChannelData(c);
		for (let i = 0; i < mono.length; i++) mono[i] += canal[i] / decode.numberOfChannels;
	}
	return mono;
}

// Voix principale : le serveur (Vivienne). Au premier echec (reseau, 4xx, 5xx, audio illisible), toute la pub
// bascule sur Kokoro pour garder une seule voix, et `surEtat` en prévient l'interface.
export async function synthetiserVoix(script: ScriptPub, options: OptionsVoix = {}): Promise<VoixPreparee> {
	const debut = performance.now();
	const audio: Record<string, Float32Array> = {};
	const scenes = script.scenes.filter(aUneVoix);
	let etat: EtatVoix = { source: options.sansServeur ? "kokoro" : "serveur", secours: false };
	let fils = 0;
	if (script.voix.mode === "synthese" && scenes.length) {
		options.surEtat?.(etat);
		const appeler = options.appeler ?? ((t, s) => appelerServeur(t, s, options.signal));
		const decoder = options.decoder ?? decoderMp3;
		if (etat.source === "serveur") {
			try {
				for (const [i, s] of scenes.entries()) {
					verifier(options.signal);
					const k = cle("serveur", s.voix.trim(), script);
					options.surProgression?.({ etape: "synthese", scene: i + 1, total: scenes.length });
					if (!cache.has(k)) cache.set(k, await decoder(await appeler(s.voix.trim(), s.id)));
					audio[s.id] = cache.get(k) as Float32Array;
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") throw err;
				etat = { source: "kokoro", secours: true, raison: err instanceof Error ? err.message : String(err) };
				for (const id of Object.keys(audio)) delete audio[id];
				options.surEtat?.(etat);
			}
		}
		if (etat.source === "kokoro") fils = await synthetiserKokoro(script, scenes, audio, options);
	}
	return { audio, durees: mesurer(audio), fils, synthetiseMs: performance.now() - debut, etat };
}

async function synthetiserKokoro(script: ScriptPub, scenes: ScenePub[], audio: Record<string, Float32Array>, options: OptionsVoix): Promise<number> {
	const manquantes = scenes.filter((s) => !cache.has(cle("kokoro", s.voix.trim(), script)));
	let fils = 0;
	const proprietaire = !options.voix;
	const voix = options.voix ?? creerVoix();
	try {
		if (manquantes.length) {
			const charge = await voix.charger({ surProgression: (p) => options.surProgression?.({ etape: "chargement", ...p }) });
			fils = charge.fils;
		}
		for (const [i, s] of manquantes.entries()) {
			verifier(options.signal);
			options.surProgression?.({ etape: "synthese", scene: i + 1, total: manquantes.length });
			const r = await voix.synthetiser(s.voix.trim(), { vitesse: script.voix.vitesse, prononciation: script.voix.prononciation });
			cache.set(cle("kokoro", s.voix.trim(), script), await versTaux(r.audio, r.frequence));
		}
	} finally {
		if (proprietaire) voix.terminer();
	}
	for (const s of scenes) audio[s.id] = cache.get(cle("kokoro", s.voix.trim(), script)) as Float32Array;
	return fils;
}

// Voix importee : un fichier audio par id de scene (wav, mp3, m4a, ogg selon le navigateur)
export async function importerVoix(fichiers: Readonly<Record<string, Blob>>): Promise<VoixPreparee> {
	const debut = performance.now();
	const audio: Record<string, Float32Array> = {};
	for (const [id, fichier] of Object.entries(fichiers)) {
		const ctx = new OfflineAudioContext(1, 1, TAUX);
		let decode: AudioBuffer;
		try {
			decode = await ctx.decodeAudioData(await fichier.arrayBuffer());
		} catch {
			throw new Error(`Le fichier de la scène « ${id} » n'est pas un audio lisible par ce navigateur`);
		}
		const rogne = rogner(melangerEnMono(decode));
		if (!rogne.length) throw new Error(`Le fichier de la scène « ${id} » est silencieux`);
		audio[id] = rogne;
	}
	return { audio, durees: mesurer(audio), fils: 0, synthetiseMs: performance.now() - debut, etat: { source: "importee", secours: false } };
}

const mesurer = (audio: Record<string, Float32Array>) =>
	Object.fromEntries(Object.entries(audio).map(([id, a]) => [id, a.length / TAUX]));
