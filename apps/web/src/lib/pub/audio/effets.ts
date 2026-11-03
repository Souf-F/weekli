import { bruit, calerCrete, type Stereo, stereoVide, TAUX } from "./bruit";

// Effets sonores generes par le code (ADR-09). Chaque generateur rend un son stereo a 48 kHz, normalise
// a une crete fixe (dBFS) : le niveau relatif a la voix se regle dans le mixage, pas ici.

export type TypeEffet = "souffle" | "montee" | "impact" | "clic";

// Souffle de transition : bruit filtre dont la frequence monte puis redescend, et qui traverse la stereo
export function genererSouffle(duree: number): Stereo {
	const n = Math.round(duree * TAUX);
	const [g, d] = stereoVide(n);
	const alea = bruit(3);
	let filtre = 0;
	for (let i = 0; i < n; i++) {
		const t = i / n;
		const coupure = 0.02 + 0.35 * Math.sin(Math.PI * t);
		filtre += coupure * (alea() - filtre);
		const enveloppe = Math.sin(Math.PI * Math.min(1, t * 1.4)) ** 2;
		g[i] = filtre * enveloppe * (1 - t);
		d[i] = filtre * enveloppe * t;
	}
	return calerCrete([g, d], -22);
}

export const DUREE_MONTEE = 1.8;
export const DUREE_IMPACT = 2.4;

// Montee de tension : bruit filtre qui s'ouvre et monte en hauteur, coupee net juste avant l'impact
export function genererMontee(): Stereo {
	const n = Math.round(DUREE_MONTEE * TAUX);
	const [g, d] = stereoVide(n);
	const alea = bruit(5);
	let filtre = 0;
	let phase = 0;
	for (let i = 0; i < n; i++) {
		const t = i / n;
		filtre += (0.01 + 0.5 * t * t) * (alea() - filtre);
		phase += (2 * Math.PI * (180 + 900 * t * t)) / TAUX;
		const ton = Math.sin(phase) * 0.25 * t;
		const enveloppe = t ** 1.6 * (t > 0.97 ? (1 - t) / 0.03 : 1);
		g[i] = (filtre + ton) * enveloppe;
		d[i] = (filtre * 0.9 + ton) * enveloppe;
	}
	return calerCrete([g, d], -20);
}

// Impact : grosse caisse grave qui plonge, claquement et queue de reverberation
export function genererImpact(): Stereo {
	const n = Math.round(DUREE_IMPACT * TAUX);
	const [g, d] = stereoVide(n);
	const alea = bruit(9);
	let queueG = 0;
	let queueD = 0;
	for (let i = 0; i < n; i++) {
		const t = i / TAUX;
		const f = 32 + 110 * Math.exp(-t * 18);
		const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.6);
		const claque = alea() * Math.exp(-t * 40) * 0.6;
		queueG += 0.04 * (alea() - queueG);
		queueD += 0.04 * (alea() - queueD);
		const reverb = Math.exp(-t * 1.6) * 0.35;
		g[i] = Math.tanh(1.8 * sub) + claque + queueG * reverb;
		d[i] = Math.tanh(1.8 * sub) + claque + queueD * reverb;
	}
	return calerCrete([g, d], -9);
}

// Clic discret quand un mot cle est surligne : une impulsion courte et mate, legerement decalee a droite
export function genererClic(): Stereo {
	const n = Math.round(0.09 * TAUX);
	const [g, d] = stereoVide(n);
	for (let i = 0; i < n; i++) {
		const t = i / TAUX;
		const v = (Math.sin(2 * Math.PI * 1900 * t) * 0.7 + Math.sin(2 * Math.PI * 3100 * t) * 0.3) * Math.exp(-t * 110);
		g[i] = v * 0.9;
		d[i] = v;
	}
	return calerCrete([g, d], -26);
}
