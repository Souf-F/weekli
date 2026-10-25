import { IPS } from "./scene";
import { DECALAGE_VOIX } from "./synchro";
import type { Moteur } from "./moteur";

export const FREQUENCE = 48000;
const CANAUX = 2;

// Longueur exacte en echantillons : 1600 par image a 30 i/s et 48 kHz, donc audio et video de meme duree
export const echantillonsPour = (images: number) => Math.round((images * FREQUENCE) / IPS);

export type SourcesAudio = {
	voix?: Readonly<Record<string, AudioBuffer>>; // par id de scene
	fond?: AudioBuffer | null; // musique : le mixage fin (baisse sous la voix) est le travail de F9
	gainVoix?: number;
	gainFond?: number;
};

// Assemble la piste finale (stereo 48 kHz) calee sur la timeline, tronquee a la duree exacte de la video
export async function assemblerAudio(moteur: Moteur, sources: SourcesAudio): Promise<AudioBuffer> {
	const ctx = new OfflineAudioContext(CANAUX, echantillonsPour(moteur.images), FREQUENCE);
	const brancher = (buffer: AudioBuffer, depart: number, gain: number) => {
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		const g = ctx.createGain();
		g.gain.value = gain;
		source.connect(g).connect(ctx.destination);
		source.start(Math.max(depart, 0));
	};
	if (sources.fond) brancher(sources.fond, 0, sources.gainFond ?? 0.5);
	for (const s of moteur.timeline.scenes) {
		const voix = sources.voix?.[s.id];
		if (voix) brancher(voix, s.debut + DECALAGE_VOIX, sources.gainVoix ?? 1);
	}
	return ctx.startRendering();
}

// Son de test : un petit bip a chaque seconde pleine (verification de la synchro avec le minuteur) sur un fond grave
export async function genererSonTest(duree: number): Promise<AudioBuffer> {
	const ctx = new OfflineAudioContext(CANAUX, Math.ceil(duree * FREQUENCE), FREQUENCE);
	const fond = ctx.createOscillator();
	fond.frequency.value = 110;
	const gFond = ctx.createGain();
	gFond.gain.value = 0.03;
	fond.connect(gFond).connect(ctx.destination);
	fond.start(0);
	for (let s = 0; s < duree; s++) {
		const bip = ctx.createOscillator();
		bip.frequency.value = s % 10 === 0 ? 1320 : 880;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0, s);
		g.gain.linearRampToValueAtTime(0.25, s + 0.005);
		g.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
		bip.connect(g).connect(ctx.destination);
		bip.start(s);
		bip.stop(s + 0.15);
	}
	return ctx.startRendering();
}
