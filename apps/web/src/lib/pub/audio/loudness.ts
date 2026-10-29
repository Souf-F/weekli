import { TAUX } from "./bruit";

// Sonie integree selon ITU-R BS.1770-4 / EBU R128 (la mesure d'ffmpeg ebur128) : ponderation K en deux
// etages, blocs de 400 ms recouverts a 75 %, double porte (-70 LUFS absolu, -10 LU relatif).
// Les coefficients des filtres sont ceux de la norme pour 48 kHz.

type Biquad = { b: readonly [number, number, number]; a: readonly [number, number] };

const ETAGE_1: Biquad = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
const ETAGE_2: Biquad = { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] };

function filtrer(entree: Float32Array, f: Biquad): Float32Array {
	const sortie = new Float32Array(entree.length);
	let x1 = 0;
	let x2 = 0;
	let y1 = 0;
	let y2 = 0;
	for (let i = 0; i < entree.length; i++) {
		const x = entree[i];
		const y = f.b[0] * x + f.b[1] * x1 + f.b[2] * x2 - f.a[0] * y1 - f.a[1] * y2;
		sortie[i] = y;
		x2 = x1;
		x1 = x;
		y2 = y1;
		y1 = y;
	}
	return sortie;
}

const LUFS = (energie: number) => -0.691 + 10 * Math.log10(energie);

/** Sonie integree en LUFS d'un signal 48 kHz (un canal ou plus, tous ponderes a 1). -Infinity si silence. */
export function sonieIntegree(canaux: readonly Float32Array[], frequence = TAUX): number {
	if (frequence !== 48000) throw new Error("La mesure de sonie suppose 48 kHz");
	const ponderes = canaux.map((c) => filtrer(filtrer(c, ETAGE_1), ETAGE_2));
	const bloc = Math.round(0.4 * frequence);
	const pas = Math.round(0.1 * frequence);
	const energies: number[] = [];
	for (let debut = 0; debut + bloc <= ponderes[0].length; debut += pas) {
		let somme = 0;
		for (const c of ponderes) {
			let s = 0;
			for (let i = debut; i < debut + bloc; i++) s += c[i] * c[i];
			somme += s / bloc;
		}
		energies.push(somme);
	}
	const moyenne = (liste: number[]) => liste.reduce((a, b) => a + b, 0) / liste.length;
	const absolus = energies.filter((e) => LUFS(e) > -70);
	if (!absolus.length) return Number.NEGATIVE_INFINITY;
	const seuilRelatif = LUFS(moyenne(absolus)) - 10;
	const retenus = absolus.filter((e) => LUFS(e) > seuilRelatif);
	return LUFS(moyenne(retenus));
}
