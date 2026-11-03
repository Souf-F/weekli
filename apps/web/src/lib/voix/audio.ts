// Traitement du signal produit par Kokoro : rognage des silences, assemblage des lots, export WAV.

export const FREQUENCE = 24000;

const TRAME = 2048;
const PAS = 512;
const SEUIL_DB = 60;

/**
 * Retire le silence au début et à la fin (portage de librosa.effects.trim utilisé par kokoro-onnx) :
 * une trame est silencieuse si son RMS est à plus de 60 dB sous la trame la plus forte.
 */
export function rogner(audio: Float32Array): Float32Array {
	if (audio.length === 0) return audio;
	const demi = TRAME / 2;
	const nbTrames = 1 + Math.floor(audio.length / PAS);
	const rms = new Float32Array(nbTrames);
	let max = 0;
	for (let t = 0; t < nbTrames; t++) {
		const centre = t * PAS;
		let somme = 0;
		for (let i = centre - demi; i < centre + demi; i++) {
			const v = i >= 0 && i < audio.length ? audio[i] : 0;
			somme += v * v;
		}
		rms[t] = Math.sqrt(somme / TRAME);
		if (rms[t] > max) max = rms[t];
	}
	if (max === 0) return audio.subarray(0, 0);
	const seuil = max * 10 ** (-SEUIL_DB / 20);
	let premiere = -1;
	let derniere = -1;
	for (let t = 0; t < nbTrames; t++) {
		if (rms[t] > seuil) {
			if (premiere < 0) premiere = t;
			derniere = t;
		}
	}
	return audio.subarray(premiere * PAS, Math.min(audio.length, (derniere + 1) * PAS));
}

/** Colle des morceaux en insérant après chacun le silence demandé (en secondes). */
export function assembler(morceaux: { audio: Float32Array; pause: number }[], frequence = FREQUENCE): Float32Array<ArrayBuffer> {
	const longueurs = morceaux.map((m) => m.audio.length + Math.round(m.pause * frequence));
	const sortie = new Float32Array(longueurs.reduce((a, b) => a + b, 0));
	let position = 0;
	morceaux.forEach((m, i) => {
		sortie.set(m.audio, position);
		position += longueurs[i];
	});
	return sortie;
}

/** Encode en WAV PCM 16 bits mono. */
export function versWav(audio: Float32Array, frequence = FREQUENCE): ArrayBuffer {
	const tampon = new ArrayBuffer(44 + audio.length * 2);
	const vue = new DataView(tampon);
	const texte = (position: number, valeur: string) => {
		for (let i = 0; i < valeur.length; i++) vue.setUint8(position + i, valeur.charCodeAt(i));
	};
	texte(0, "RIFF");
	vue.setUint32(4, 36 + audio.length * 2, true);
	texte(8, "WAVE");
	texte(12, "fmt ");
	vue.setUint32(16, 16, true);
	vue.setUint16(20, 1, true);
	vue.setUint16(22, 1, true);
	vue.setUint32(24, frequence, true);
	vue.setUint32(28, frequence * 2, true);
	vue.setUint16(32, 2, true);
	vue.setUint16(34, 16, true);
	texte(36, "data");
	vue.setUint32(40, audio.length * 2, true);
	for (let i = 0; i < audio.length; i++) {
		const v = Math.max(-1, Math.min(1, audio[i]));
		vue.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
	}
	return tampon;
}
