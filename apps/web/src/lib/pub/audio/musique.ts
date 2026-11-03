import { bruit, hz, type Stereo, stereoVide, TAUX } from "./bruit";

// Musique generee par le code (ADR-09) : portage de apps/video/scripts/audio.mjs. Synthese additive sans
// dependance ni fichier audio, donc libre de droits. Reproductible : meme duree et meme ambiance, meme son.

export type Ambiance = "energique" | "calme";

const PROGRESSIONS = {
	// La mineur, Fa, Do, Sol : progression pop classique, entrainante sans etre envahissante
	energique: { bpm: 112, accords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], basse: [45, 41, 48, 43] },
	// Re mineur 9, Si bemol, Fa, Do : plus pose, pour la narration longue
	calme: { bpm: 84, accords: [[62, 65, 69, 72], [58, 62, 65, 69], [53, 57, 60, 65], [60, 64, 67, 71]], basse: [38, 34, 41, 36] },
} as const;

export function genererMusique(duree: number, ambiance: Ambiance): Stereo {
	const { bpm, accords, basse } = PROGRESSIONS[ambiance];
	const n = Math.ceil(duree * TAUX);
	const [g, d] = stereoVide(n);
	const temps = 60 / bpm;
	const mesure = temps * 4;
	const alea = bruit(7);
	const energique = ambiance === "energique";
	const introMesures = 2;
	// La batterie s'arrete avant la fin pour laisser respirer la chute (une mesure et demie)
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
			const f = hz(note);
			nappeG += Math.sin(2 * Math.PI * f * 0.997 * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
			nappeD += Math.sin(2 * Math.PI * f * 1.003 * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
		}
		nappeG *= 0.045 * attaque * pompe;
		nappeD *= 0.045 * attaque * pompe;

		// Arpege en doubles croches (croches en ambiance calme)
		const pas = energique ? temps / 4 : temps / 2;
		const indexPas = Math.floor(t / pas);
		const dansPas = t - indexPas * pas;
		const noteArp = accord[indexPas % accord.length] + 12 * (indexPas % 8 < 4 ? 0 : 1);
		const arp = Math.sin(2 * Math.PI * hz(noteArp) * t) * Math.exp(-dansPas * (energique ? 14 : 6)) * (energique ? 0.07 : 0.05);

		// Basse sur les temps forts
		const noteBasse = hz(basse[m % basse.length]);
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
			perc += alea() * Math.exp(-dansTemps * 30) * 0.03;
		}

		const fondu = Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (duree - t) / 2.5));
		g[i] = (nappeG + arp * 0.8 + basseS + perc) * fondu;
		d[i] = (nappeD + arp * 1.2 + basseS + perc) * fondu;
	}
	return [g, d];
}
