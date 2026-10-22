// Audio genere par le code : musique libre de droits a 100 % et effets de transition.
// Aucune dependance : synthese additive simple, ecrite directement en WAV 16 bits stereo.
import { writeFileSync } from "node:fs";

const TAUX = 44100;

function ecrireWav(chemin, gauche, droite) {
	const n = gauche.length;
	const tampon = Buffer.alloc(44 + n * 4);
	tampon.write("RIFF", 0);
	tampon.writeUInt32LE(36 + n * 4, 4);
	tampon.write("WAVEfmt ", 8);
	tampon.writeUInt32LE(16, 16);
	tampon.writeUInt16LE(1, 20);
	tampon.writeUInt16LE(2, 22);
	tampon.writeUInt32LE(TAUX, 24);
	tampon.writeUInt32LE(TAUX * 4, 28);
	tampon.writeUInt16LE(4, 32);
	tampon.writeUInt16LE(16, 34);
	tampon.write("data", 36);
	tampon.writeUInt32LE(n * 4, 40);
	let crete = 1e-9;
	for (let i = 0; i < n; i++) crete = Math.max(crete, Math.abs(gauche[i]), Math.abs(droite[i]));
	const gain = 0.89 / crete; // normalisation a -1 dBFS
	for (let i = 0; i < n; i++) {
		tampon.writeInt16LE(Math.round(Math.max(-1, Math.min(1, gauche[i] * gain)) * 32767), 44 + i * 4);
		tampon.writeInt16LE(Math.round(Math.max(-1, Math.min(1, droite[i] * gain)) * 32767), 46 + i * 4);
	}
	writeFileSync(chemin, tampon);
}

const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Bruit pseudo-aleatoire reproductible : la meme video donne toujours la meme musique
function bruit(graine = 1) {
	let s = graine;
	return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * 2 - 1;
}

const PROGRESSIONS = {
	// La mineur, Fa, Do, Sol : progression pop classique, entrainante sans etre envahissante
	energique: { bpm: 112, accords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], basse: [45, 41, 48, 43] },
	// Re mineur 9, Si bemol, Fa, Do : plus pose, pour la narration longue
	calme: { bpm: 84, accords: [[62, 65, 69, 72], [58, 62, 65, 69], [53, 57, 60, 65], [60, 64, 67, 71]], basse: [38, 34, 41, 36] },
};

export function genererMusique(chemin, duree, ambiance = "energique") {
	const { bpm, accords, basse } = PROGRESSIONS[ambiance];
	const n = Math.ceil((duree + 1) * TAUX);
	const g = new Float32Array(n);
	const d = new Float32Array(n);
	const temps = 60 / bpm;
	const mesure = temps * 4;
	const alea = bruit(7);
	const energique = ambiance === "energique";
	const introMesures = 2;
	const finBatterie = duree - mesure * 1.5;

	for (let i = 0; i < n; i++) {
		const t = i / TAUX;
		const m = Math.floor(t / mesure);
		const accord = accords[m % accords.length];
		const dansMesure = t - m * mesure;
		const dansTemps = t % temps;
		const batterie = m >= introMesures && t < finBatterie;
		// Sidechain : les nappes respirent apres chaque grosse caisse
		const pompe = batterie && energique ? 1 - 0.55 * Math.exp(-dansTemps * 9) : 1;

		// Nappe : notes de l'accord, legerement desaccordees a gauche et a droite
		let nappeG = 0;
		let nappeD = 0;
		const attaque = Math.min(1, dansMesure / 0.4);
		for (const note of accord) {
			const f = freq(note);
			nappeG += Math.sin(2 * Math.PI * f * 0.997 * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
			nappeD += Math.sin(2 * Math.PI * f * 1.003 * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
		}
		nappeG *= 0.045 * attaque * pompe;
		nappeD *= 0.045 * attaque * pompe;

		// Arpege en doubles croches
		const pas = energique ? temps / 4 : temps / 2;
		const indexPas = Math.floor(t / pas);
		const dansPas = t - indexPas * pas;
		const noteArp = accord[indexPas % accord.length] + 12 * (indexPas % 8 < 4 ? 0 : 1);
		const arp = Math.sin(2 * Math.PI * freq(noteArp) * t) * Math.exp(-dansPas * (energique ? 14 : 6)) * (energique ? 0.07 : 0.05);

		// Basse sur les temps forts
		const noteBasse = freq(basse[m % basse.length]);
		const dansDemi = t % (temps * 2);
		const basseS = m >= introMesures ? Math.tanh(1.6 * Math.sin(2 * Math.PI * noteBasse * t)) * Math.exp(-dansDemi * 2.2) * 0.13 * pompe : 0;

		let perc = 0;
		if (batterie && energique) {
			// Grosse caisse : sinus qui plonge de 150 a 45 Hz
			const fk = 45 + 105 * Math.exp(-dansTemps * 30);
			perc += Math.sin(2 * Math.PI * fk * dansTemps) * Math.exp(-dansTemps * 9) * 0.5;
			// Charleston sur les contretemps
			const dansCroche = t % (temps / 2);
			if (Math.floor(t / (temps / 2)) % 2 === 1) perc += alea() * Math.exp(-dansCroche * 45) * 0.06;
			// Claquement sur les temps 2 et 4
			const numTemps = Math.floor(t / temps) % 4;
			if (numTemps === 1 || numTemps === 3) perc += alea() * Math.exp(-dansTemps * 16) * 0.12;
		} else if (batterie) {
			const dansNoire = t % temps;
			perc += alea() * Math.exp(-dansNoire * 30) * 0.03;
		}

		const fondu = Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (duree - t) / 2.5));
		g[i] = (nappeG + arp * 0.8 + basseS + perc) * fondu;
		d[i] = (nappeD + arp * 1.2 + basseS + perc) * fondu;
	}
	ecrireWav(chemin, g, d);
}

// Souffle de transition : bruit filtre dont la frequence monte puis redescend, qui traverse la stereo
export function genererTransition(chemin) {
	const n = Math.round(0.9 * TAUX);
	const g = new Float32Array(n);
	const d = new Float32Array(n);
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
	ecrireWav(chemin, g, d);
}

// Montee de tension : bruit filtre qui s'ouvre et monte en hauteur sur 1,8 s, coupee net avant l'impact
export function genererMontee(chemin) {
	const n = Math.round(1.8 * TAUX);
	const g = new Float32Array(n);
	const d = new Float32Array(n);
	const alea = bruit(5);
	let filtre = 0;
	let phase = 0;
	for (let i = 0; i < n; i++) {
		const t = i / n;
		filtre += (0.01 + 0.5 * t * t) * (alea() - filtre);
		phase += (2 * Math.PI * (180 + 900 * t * t)) / TAUX;
		const ton = Math.sin(phase) * 0.25 * t;
		const enveloppe = Math.pow(t, 1.6) * (t > 0.97 ? (1 - t) / 0.03 : 1);
		g[i] = (filtre + ton) * enveloppe;
		d[i] = (filtre * 0.9 + ton) * enveloppe;
	}
	ecrireWav(chemin, g, d);
}

// Impact : grosse caisse grave qui plonge, claquement et queue de reverberation
export function genererImpact(chemin) {
	const n = Math.round(2.4 * TAUX);
	const g = new Float32Array(n);
	const d = new Float32Array(n);
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
	ecrireWav(chemin, g, d);
}
