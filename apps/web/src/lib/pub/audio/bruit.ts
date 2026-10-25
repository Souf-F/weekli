import { FREQUENCE } from "../audio";

export type Stereo = [Float32Array, Float32Array];

export const TAUX = FREQUENCE;
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const versDb = (lin: number) => 20 * Math.log10(Math.max(lin, 1e-12));
export const depuisDb = (db: number) => 10 ** (db / 20);

// Bruit pseudo-aleatoire reproductible (congruentiel lineaire) : le meme script donne toujours le meme son
export function bruit(graine = 1): () => number {
	let s = graine;
	return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * 2 - 1;
}

export const stereoVide = (n: number): Stereo => [new Float32Array(n), new Float32Array(n)];

export function cretes(canaux: readonly Float32Array[]): number {
	let max = 0;
	for (const c of canaux) for (let i = 0; i < c.length; i++) max = Math.max(max, Math.abs(c[i]));
	return max;
}

// Valeur efficace sur l'ensemble des canaux
export function rms(canaux: readonly Float32Array[]): number {
	let somme = 0;
	let n = 0;
	for (const c of canaux) {
		for (let i = 0; i < c.length; i++) somme += c[i] * c[i];
		n += c.length;
	}
	return n ? Math.sqrt(somme / n) : 0;
}

// Ramene la crete d'un son a un niveau donne (dBFS)
export function calerCrete(son: Stereo, db: number): Stereo {
	const gain = depuisDb(db) / Math.max(cretes(son), 1e-9);
	for (const c of son) for (let i = 0; i < c.length; i++) c[i] *= gain;
	return son;
}
