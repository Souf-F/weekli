import { dureeTotale, type Storyboard } from "@weekli/core";
import {
	BufferTarget,
	CanvasSource,
	canEncodeVideo,
	Mp4OutputFormat,
	Output,
	QUALITY_HIGH,
	WebMOutputFormat,
} from "mediabunny";
import { dessinerScene, HAUTEUR, LARGEUR } from "./scenes";

// Lecture et export d'un storyboard. Tout se passe dans le navigateur : aucun serveur video.

const IPS = 30;

// Dessine l'image correspondant a un instant donne de la video
export function dessinerInstant(ctx: CanvasRenderingContext2D, story: Storyboard, temps: number) {
	let debut = 0;
	for (const scene of story.scenes) {
		if (temps < debut + scene.duree) {
			dessinerScene(ctx, scene, (temps - debut) / scene.duree, temps);
			return;
		}
		debut += scene.duree;
	}
	const derniere = story.scenes.at(-1);
	if (derniere) dessinerScene(ctx, derniere, 0.89, temps);
}

export function preparerCanvas(canvas: HTMLCanvasElement) {
	canvas.width = LARGEUR;
	canvas.height = HAUTEUR;
	return canvas.getContext("2d")!;
}

// Lecture en boucle pour l'apercu ; renvoie une fonction d'arret
export function lire(canvas: HTMLCanvasElement, story: Storyboard, surTemps?: (t: number) => void) {
	const ctx = preparerCanvas(canvas);
	const total = dureeTotale(story);
	const depart = performance.now();
	let image = 0;
	const boucle = (maintenant: number) => {
		const t = ((maintenant - depart) / 1000) % Math.max(total, 0.1);
		dessinerInstant(ctx, story, t);
		surTemps?.(t);
		image = requestAnimationFrame(boucle);
	};
	image = requestAnimationFrame(boucle);
	return () => cancelAnimationFrame(image);
}

// Encodage image par image avec WebCodecs (horodatage exact, independant de la vitesse de la machine),
// puis multiplexage en MP4 (H.264) ou, a defaut, en WebM (VP9).
export async function formatExport(): Promise<{ codec: "avc" | "vp9"; extension: "mp4" | "webm" } | null> {
	const options = { width: LARGEUR, height: HAUTEUR };
	if (await canEncodeVideo("avc", options)) return { codec: "avc", extension: "mp4" };
	if (await canEncodeVideo("vp9", options)) return { codec: "vp9", extension: "webm" };
	return null;
}

export async function exporter(story: Storyboard, surProgression: (p: number) => void, signal?: AbortSignal) {
	await document.fonts.ready;
	const format = await formatExport();
	if (!format) throw new Error("Ce navigateur ne sait pas encoder de vidéo (WebCodecs indisponible).");

	const canvas = document.createElement("canvas");
	const ctx = preparerCanvas(canvas);
	const total = dureeTotale(story);
	const images = Math.ceil(total * IPS);

	const sortie = new Output({
		format: format.extension === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
		target: new BufferTarget(),
	});
	const source = new CanvasSource(canvas, { codec: format.codec, bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
	sortie.addVideoTrack(source, { frameRate: IPS });
	await sortie.start();

	try {
		for (let i = 0; i < images; i++) {
			if (signal?.aborted) throw new DOMException("Export annulé", "AbortError");
			dessinerInstant(ctx, story, i / IPS);
			await source.add(i / IPS, 1 / IPS);
			if (i % 10 === 0) {
				surProgression(i / images);
				await new Promise((ok) => setTimeout(ok)); // laisse respirer l'interface
			}
		}
		await sortie.finalize();
	} catch (err) {
		await sortie.cancel();
		throw err;
	}
	surProgression(1);

	const tampon = (sortie.target as BufferTarget).buffer!;
	return {
		video: new Blob([tampon], { type: format.extension === "mp4" ? "video/mp4" : "video/webm" }),
		extension: format.extension,
	};
}
