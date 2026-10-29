import { cretes, depuisDb, rms, type Stereo, TAUX, versDb } from "./bruit";
import { sonieIntegree } from "./loudness";

// Mixage de la pub (ADR-09) : voix, musique et effets additionnes, la musique baisse sous la voix,
// puis la piste est amenee a la sonie cible avec un limiteur de crete. Tout est calcule en Float32 pur,
// sans AudioContext : le resultat est identique d'un navigateur a l'autre et testable sous Node.

export const CIBLE_LUFS = -16;
// Crete d'echantillon plafonnee a -2 dBFS : la crete vraie (inter-echantillons) reste sous -1,5 dBTP (design.md 8.16)
export const PLAFOND_DBFS = -2;
export const BAISSE_MUSIQUE_DB = 9;
export const ATTAQUE_S = 0.08;
export const RELACHEMENT_S = 0.3;
// Niveaux de depart avant normalisation finale (dB, relatifs entre eux seulement)
const NIVEAU_VOIX_RMS_DBFS = -20;
const NIVEAU_MUSIQUE_RMS_DBFS = -19;

export type VoixPlacee = { debut: number; audio: Float32Array; fin?: number }; // secondes ; `fin` tronque la voix
export type EffetPlace = { debut: number; son: Stereo; gainDb: number }; // debut peut etre negatif : on coupe l'amorce

export type EntreeMixage = {
	longueur: number; // echantillons
	voix: VoixPlacee[];
	musique: Stereo | null;
	effets: EffetPlace[];
};

export type MesuresMixage = {
	lufsAvant: number;
	gainDb: number;
	lufs: number; // mesure sur la piste finale, avant encodage
	creteDbfs: number;
	baisseMax: number; // dB de baisse de la musique effectivement atteints
};

// Gain d'une voix : valeur efficace ramenee au niveau commun, calculee sur les passages parles seulement
function gainVoix(audio: Float32Array): number {
	const crete = cretes([audio]);
	if (crete === 0) return 0;
	const seuil = crete * 0.03;
	let somme = 0;
	let n = 0;
	for (let i = 0; i < audio.length; i++)
		if (Math.abs(audio[i]) > seuil) {
			somme += audio[i] * audio[i];
			n++;
		}
	const efficace = n ? Math.sqrt(somme / n) : crete;
	return Math.min(depuisDb(NIVEAU_VOIX_RMS_DBFS) / efficace, 0.95 / crete);
}

// Courbe de gain de la musique : cible -9 dB pendant les voix, anticipee de l'attaque (la musique est deja
// baissee quand la voix commence), lissee par un filtre a un pole (attaque 80 ms, relachement 300 ms)
export function courbeBaisse(longueur: number, voix: readonly { debut: number; fin: number }[]): Float32Array {
	const cible = new Uint8Array(longueur);
	const avance = Math.round(ATTAQUE_S * TAUX);
	for (const v of voix) {
		const a = Math.max(0, Math.round(v.debut * TAUX) - avance);
		const b = Math.min(longueur, Math.round(v.fin * TAUX));
		cible.fill(1, a, Math.max(a, b));
	}
	const bas = depuisDb(-BAISSE_MUSIQUE_DB);
	const ka = 1 - Math.exp(-1 / (ATTAQUE_S * TAUX));
	const kr = 1 - Math.exp(-1 / (RELACHEMENT_S * TAUX));
	const gain = new Float32Array(longueur);
	let g = 1;
	for (let i = 0; i < longueur; i++) {
		const vers = cible[i] ? bas : 1;
		g += (vers - g) * (vers < g ? ka : kr);
		gain[i] = g;
	}
	return gain;
}

// Limiteur de crete anticipe (5 ms) : le gain redescend avant la crete et remonte apres, sans ecretage
export function limiter(canaux: Stereo, plafond: number): void {
	const n = canaux[0].length;
	const demi = Math.round(0.005 * TAUX);
	const exigence = new Float32Array(n).fill(1);
	for (let i = 0; i < n; i++) {
		const c = Math.max(Math.abs(canaux[0][i]), Math.abs(canaux[1][i]));
		if (c > plafond) exigence[i] = plafond / c;
	}
	// minimum glissant sur +-demi, puis moyenne glissante sur +-demi/2 : la reduction couvre toujours la crete
	const tenu = new Float32Array(n).fill(1);
	for (let i = 0; i < n; i++)
		if (exigence[i] < 1) for (let j = Math.max(0, i - demi); j <= Math.min(n - 1, i + demi); j++) tenu[j] = Math.min(tenu[j], exigence[i]);
	const lisse = new Float32Array(n);
	const r = Math.max(1, Math.floor(demi / 2));
	let somme = 0;
	for (let i = 0; i <= Math.min(n - 1, r); i++) somme += tenu[i];
	for (let i = 0; i < n; i++) {
		lisse[i] = somme / (Math.min(n - 1, i + r) - Math.max(0, i - r) + 1);
		if (i + r + 1 < n) somme += tenu[i + r + 1];
		if (i - r >= 0) somme -= tenu[i - r];
	}
	for (let i = 0; i < n; i++) {
		canaux[0][i] *= lisse[i];
		canaux[1][i] *= lisse[i];
	}
}

const fonduSurVoix = Math.round(0.006 * TAUX);

export function mixer(entree: EntreeMixage): { canaux: Stereo; mesures: MesuresMixage } {
	const { longueur } = entree;
	const g = new Float32Array(longueur);
	const d = new Float32Array(longueur);

	// Musique, baissee sous les voix
	let baisseMax = 0;
	if (entree.musique) {
		const [mg, md] = entree.musique;
		const niveau = depuisDb(NIVEAU_MUSIQUE_RMS_DBFS) / Math.max(rms([mg, md]), 1e-9);
		const intervalles = entree.voix.map((v) => ({ debut: v.debut, fin: v.fin ?? v.debut + v.audio.length / TAUX }));
		const courbe = courbeBaisse(longueur, intervalles);
		let min = 1;
		for (let i = 0; i < longueur; i++) {
			const gain = niveau * courbe[i];
			if (i < mg.length) {
				g[i] += mg[i] * gain;
				d[i] += md[i] * gain;
			}
			if (courbe[i] < min) min = courbe[i];
		}
		baisseMax = -versDb(min);
	}

	// Voix, centrees, avec un fondu de 6 ms aux extremites pour eviter les claquements
	for (const v of entree.voix) {
		const gain = gainVoix(v.audio);
		const depart = Math.round(v.debut * TAUX);
		const limite = v.fin === undefined ? Number.POSITIVE_INFINITY : Math.round(v.fin * TAUX) - depart;
		const n = Math.min(v.audio.length, limite);
		for (let i = 0; i < n; i++) {
			const p = depart + i;
			if (p < 0 || p >= longueur) continue;
			const fondu = Math.min(1, i / fonduSurVoix, (n - i) / fonduSurVoix);
			const s = v.audio[i] * gain * fondu;
			g[p] += s;
			d[p] += s;
		}
	}

	// Effets
	for (const e of entree.effets) {
		const gain = depuisDb(e.gainDb);
		const depart = Math.round(e.debut * TAUX);
		const n = e.son[0].length;
		for (let i = Math.max(0, -depart); i < n; i++) {
			const p = depart + i;
			if (p >= longueur) break;
			g[p] += e.son[0][i] * gain;
			d[p] += e.son[1][i] * gain;
		}
	}

	// Sonie cible : le limiteur retire un peu d'energie, on reajuste le gain jusqu'a tomber a 0,1 LU
	const canaux: Stereo = [g, d];
	const lufsAvant = sonieIntegree(canaux);
	let gainDb = CIBLE_LUFS - lufsAvant;
	let final: Stereo = canaux;
	let lufs = lufsAvant;
	if (Number.isFinite(lufsAvant)) {
		for (let essai = 0; essai < 4; essai++) {
			const k = depuisDb(gainDb);
			final = [Float32Array.from(g, (v) => v * k), Float32Array.from(d, (v) => v * k)];
			limiter(final, depuisDb(PLAFOND_DBFS));
			lufs = sonieIntegree(final);
			const ecart = CIBLE_LUFS - lufs;
			if (Math.abs(ecart) < 0.1) break;
			gainDb += ecart;
		}
	}
	return { canaux: final, mesures: { lufsAvant, gainDb, lufs, creteDbfs: versDb(cretes(final)), baisseMax } };
}
