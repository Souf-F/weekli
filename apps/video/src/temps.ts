import type { Script, Segment } from "./types";
import { IPS, MARGE_AUDIO, TRANSITION } from "./theme";

// Duree d'un segment en images : la phrase, une respiration, et la transition qui la chevauche
export const imagesSegment = (s: Segment) => Math.ceil(((s.duree ?? 3) + MARGE_AUDIO) * IPS) + TRANSITION;

// Debut de chaque segment sur la ligne de temps globale (les transitions se chevauchent)
export function debuts(script: Script): number[] {
	const res: number[] = [];
	let t = 0;
	for (const s of script.segments) {
		res.push(t);
		t += imagesSegment(s) - TRANSITION;
	}
	return res;
}

export const dureeTotale = (script: Script) =>
	script.segments.reduce((t, s) => t + imagesSegment(s), 0) - TRANSITION * Math.max(script.segments.length - 1, 0);

export const dimensions = (script: Script) =>
	script.format === "paysage" ? { width: 1920, height: 1080 } : { width: 1080, height: 1350 };
