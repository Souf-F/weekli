import {
	AudioBufferSource,
	BufferTarget,
	CanvasSource,
	canEncodeAudio,
	canEncodeVideo,
	Mp4OutputFormat,
	Output,
	WebMOutputFormat,
} from "mediabunny";
import { FREQUENCE } from "./audio";
import type { Moteur } from "./moteur";
import { HAUTEUR, IPS, LARGEUR } from "./scene";

export type FormatExport =
	| { conteneur: "mp4"; video: "avc"; audio: "aac"; extension: "mp4"; mime: "video/mp4" }
	| { conteneur: "webm"; video: "vp9" | "vp8"; audio: "opus"; extension: "webm"; mime: "video/webm" };

const DEBIT_VIDEO = 8_000_000; // design.md 8.3
const DEBIT_AUDIO = 192_000;
// Delai d'amorce de l'encodeur AAC LC (2112 echantillons, mesure sous macOS) : sans correction, le son arrive
// environ 44 ms apres l'image. On date le premier paquet en negatif ; mediabunny ecrit alors une liste
// d'edition qui rogne l'amorce a la lecture. Opus (WebM) est deja compense par le conteneur.
const AMORCE_AAC = 2112 / FREQUENCE;

// MP4 (H.264 + AAC) si le navigateur sait encoder les deux, sinon WebM (VP9 ou VP8 + Opus), sinon null
export async function choisirFormat(avecAudio: boolean): Promise<FormatExport | null> {
	const v = { width: LARGEUR, height: HAUTEUR, bitrate: DEBIT_VIDEO };
	const a = { numberOfChannels: 2, sampleRate: FREQUENCE, bitrate: DEBIT_AUDIO };
	const audioAac = !avecAudio || (await canEncodeAudio("aac", a));
	if (audioAac && (await canEncodeVideo("avc", v)))
		return { conteneur: "mp4", video: "avc", audio: "aac", extension: "mp4", mime: "video/mp4" };
	const audioOpus = !avecAudio || (await canEncodeAudio("opus", a));
	if (!audioOpus) return null;
	for (const video of ["vp9", "vp8"] as const)
		if (await canEncodeVideo(video, v))
			return { conteneur: "webm", video, audio: "opus", extension: "webm", mime: "video/webm" };
	return null;
}

export type StatsExport = {
	images: number;
	dureeSecondes: number; // duree attendue de la video : images / IPS
	tempsTotalMs: number;
	dessinMoyenMs: number;
	dessinP95Ms: number;
	dessinMaxMs: number;
	octets: number;
};

export type ResultatExport = { fichier: Blob; format: FormatExport; stats: StatsExport };
export type Progression = { image: number; total: number };

// Cede la main a l'interface sans le plancher d'une seconde que les navigateurs imposent aux setTimeout
// des onglets en arriere-plan (un export de 60 s y durerait plusieurs minutes)
const respirer = () =>
	new Promise<void>((ok) => {
		const canal = new MessageChannel();
		canal.port1.onmessage = () => {
			canal.port1.close();
			ok();
		};
		canal.port2.postMessage(null);
	});

// Fenetre d'audio d'une seconde, decoupee dans la piste complete (memes echantillons que l'apercu)
function tranche(audio: AudioBuffer, debut: number, longueur: number): AudioBuffer {
	const morceau = new AudioBuffer({ length: longueur, numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate });
	for (let c = 0; c < audio.numberOfChannels; c++)
		morceau.copyToChannel(audio.getChannelData(c).subarray(debut, debut + longueur), c);
	return morceau;
}

// Export image par image (pas en temps reel) : l'horodatage vient du numero d'image, donc la duree
// vaut exactement images / IPS quelle que soit la vitesse de la machine. Annulable via `signal`.
export async function exporter(
	moteur: Moteur,
	audio: AudioBuffer | null,
	surProgression?: (p: Progression) => void,
	signal?: AbortSignal,
): Promise<ResultatExport> {
	const format = await choisirFormat(!!audio);
	if (!format) throw new Error("Ce navigateur ne sait pas encoder de vidéo (WebCodecs indisponible). Essayez Chrome ou Edge.");
	const debutTotal = performance.now();

	const toile = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(LARGEUR, HAUTEUR) : Object.assign(document.createElement("canvas"), { width: LARGEUR, height: HAUTEUR });
	const ctx = toile.getContext("2d") as CanvasRenderingContext2D;

	const sortie = new Output({
		format: format.conteneur === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
		target: new BufferTarget(),
	});
	const sourceVideo = new CanvasSource(toile, { codec: format.video, bitrate: DEBIT_VIDEO, keyFrameInterval: 2 });
	sortie.addVideoTrack(sourceVideo, { frameRate: IPS });
	let sourceAudio: AudioBufferSource | null = null;
	if (audio) {
		sourceAudio = new AudioBufferSource({ codec: format.audio, bitrate: DEBIT_AUDIO }, { startTimestamp: format.audio === "aac" ? -AMORCE_AAC : 0 });
		sortie.addAudioTrack(sourceAudio);
	}
	await sortie.start();

	const total = moteur.images;
	const mesures: number[] = [];
	const parImage = FREQUENCE / IPS; // 1600 echantillons
	let envoye = 0;
	try {
		for (let i = 0; i < total; i++) {
			if (signal?.aborted) throw new DOMException("Export annulé", "AbortError");
			const t0 = performance.now();
			moteur.dessiner(ctx, i / IPS, 1);
			mesures.push(performance.now() - t0);
			await sourceVideo.add(i / IPS, 1 / IPS);
			// l'audio avance par secondes entieres, a la meme cadence que l'image
			if (audio && sourceAudio && ((i + 1) % IPS === 0 || i === total - 1)) {
				const fin = Math.min((i + 1) * parImage, audio.length);
				await sourceAudio.add(tranche(audio, envoye, fin - envoye));
				envoye = fin;
			}
			if (i % 10 === 0) {
				surProgression?.({ image: i, total });
				await respirer();
			}
		}
		await sortie.finalize();
	} catch (err) {
		await sortie.cancel();
		throw err;
	}
	surProgression?.({ image: total, total });

	const tampon = (sortie.target as BufferTarget).buffer as ArrayBuffer;
	const tries = [...mesures].sort((a, b) => a - b);
	return {
		fichier: new Blob([tampon], { type: format.mime }),
		format,
		stats: {
			images: total,
			dureeSecondes: total / IPS,
			tempsTotalMs: performance.now() - debutTotal,
			dessinMoyenMs: mesures.reduce((a, b) => a + b, 0) / mesures.length,
			dessinP95Ms: tries[Math.floor(tries.length * 0.95)],
			dessinMaxMs: tries[tries.length - 1],
			octets: tampon.byteLength,
		},
	};
}
