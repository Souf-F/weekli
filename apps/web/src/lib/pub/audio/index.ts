import type { Moteur } from "../moteur";
import { echantillonsPour, FREQUENCE } from "../audio";
import { DECALAGE_VOIX } from "../synchro";
import { type Stereo, TAUX } from "./bruit";
import { genererClic, genererImpact, genererMontee, genererSouffle, type TypeEffet } from "./effets";
import { type EffetPlace, mixer, type MesuresMixage, type VoixPlacee } from "./mixage";
import { genererMusique } from "./musique";
import { planifierEffets } from "./plan";
import type { VoixPreparee } from "./voix";

export { genererMusique, type Ambiance } from "./musique";
export { planifierEffets, type EvenementSon } from "./plan";
export { sonieIntegree } from "./loudness";
export { importerVoix, synthetiserVoix, viderCacheVoix, type EtapeVoix, type EtatVoix, type SourceVoix, type OptionsVoix, type VoixPreparee } from "./voix";
export { CIBLE_LUFS, type MesuresMixage } from "./mixage";

// Gains des effets par rapport au niveau de depart de la voix (-20 dBFS efficace) : le souffle reste
// sous la voix, l'impact passe devant la musique sans couvrir la parole
const GAIN_EFFET_DB: Record<TypeEffet, number> = { souffle: -8, montee: -6, impact: -2, clic: -6 };

export type OptionsComposition = {
	voix?: Pick<VoixPreparee, "audio"> | null;
	musique?: boolean; // faux : ni musique ni effets (verification de la voix seule)
	effets?: boolean;
};

export type ResultatAudio = { audio: AudioBuffer; mesures: MesuresMixage; avertissements: string[] };

function sons(): Record<Exclude<TypeEffet, "souffle">, Stereo> {
	return { montee: genererMontee(), impact: genererImpact(), clic: genererClic() };
}

// Compose la piste finale de la pub, calee sur la timeline du moteur : voix placees a debut + DECALAGE_VOIX,
// musique a la duree exacte, effets, baisse de la musique sous la voix, normalisation a -16 LUFS.
// Le moteur doit avoir ete cree avec les durees de voix mesurees (creerMoteur({ voixMesurees })).
export async function composerAudio(moteur: Moteur, options: OptionsComposition = {}): Promise<ResultatAudio> {
	const { script, timeline } = moteur;
	const longueur = echantillonsPour(moteur.images);
	const avertissements: string[] = [];

	const voix: VoixPlacee[] = [];
	const durees: Record<string, number> = {};
	for (const s of timeline.scenes) {
		const audio = options.voix?.audio[s.id];
		if (!audio) continue;
		durees[s.id] = audio.length / TAUX;
		const suivante = timeline.scenes[timeline.scenes.indexOf(s) + 1];
		const fin = s.debut + DECALAGE_VOIX + durees[s.id];
		if (fin > s.fin + 1e-6) avertissements.push(`La voix de la scène ${s.id} dépasse la scène de ${(fin - s.fin).toFixed(2)} s : elle est coupée à la fin de la scène`);
		else if (suivante && fin > suivante.debut + DECALAGE_VOIX + 0.15) {
			avertissements.push(`La voix de la scène ${s.id} chevauche la suivante de ${(fin - suivante.debut - DECALAGE_VOIX).toFixed(2)} s`);
		}
		voix.push({ debut: s.debut + DECALAGE_VOIX, audio, fin: Math.min(fin, s.fin) });
	}

	const ambiance = script.musique;
	const musique: Stereo | null = options.musique === false || ambiance === "aucune" ? null : genererMusique(longueur / FREQUENCE, ambiance);

	const effets: EffetPlace[] = [];
	if (options.effets !== false && options.musique !== false) {
		const bibliotheque = sons();
		for (const e of planifierEffets(script, timeline, durees)) {
			const son = e.type === "souffle" ? genererSouffle(e.duree ?? 0.9) : bibliotheque[e.type];
			effets.push({ debut: e.debut, son, gainDb: GAIN_EFFET_DB[e.type] });
		}
	}

	const { canaux, mesures } = mixer({ longueur, voix, musique, effets });
	const audio = new AudioBuffer({ length: longueur, numberOfChannels: 2, sampleRate: FREQUENCE });
	audio.copyToChannel(canaux[0] as Float32Array<ArrayBuffer>, 0);
	audio.copyToChannel(canaux[1] as Float32Array<ArrayBuffer>, 1);
	return { audio, mesures, avertissements };
}
