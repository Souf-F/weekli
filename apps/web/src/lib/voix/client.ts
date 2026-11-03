// Côté page : pilote le Worker vocal. Point d'entrée de la voix pour le studio (tâche F9).
import type { Progression } from "./fichiers";
import type { OptionsSynthese } from "./kokoro";
import type { DemandeVoix, MesuresChargement, MesuresSynthese, ReponseVoix } from "./protocole";

export type { Progression } from "./fichiers";
export type { OptionsSynthese } from "./kokoro";
export type { MesuresChargement, MesuresSynthese } from "./protocole";

export interface VoixChargee {
	/** Fils de calcul utilisés : 1 si la page n'est pas isolée (cross-origin), jusqu'à 4 sinon. */
	fils: number;
	mesures: MesuresChargement;
}

export interface Synthese {
	audio: Float32Array<ArrayBuffer>;
	frequence: number;
	phonemes: string;
	mesures: MesuresSynthese;
}

export interface Voix {
	charger(options?: { surProgression?: (p: Progression) => void }): Promise<VoixChargee>;
	synthetiser(texte: string, options?: OptionsSynthese): Promise<Synthese>;
	terminer(): void;
}

interface Attente<T> {
	resoudre: (valeur: T) => void;
	rejeter: (erreur: Error) => void;
}

export function creerVoix(): Voix {
	const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "voix" });
	const syntheses = new Map<number, Attente<Synthese>>();
	let chargement: (Attente<VoixChargee> & { promesse: Promise<VoixChargee> }) | null = null;
	let surProgression: ((p: Progression) => void) | undefined;
	let suivant = 1;

	const echouerTout = (erreur: Error) => {
		chargement?.rejeter(erreur);
		chargement = null;
		for (const attente of syntheses.values()) attente.rejeter(erreur);
		syntheses.clear();
	};

	worker.onmessage = ({ data }: MessageEvent<ReponseVoix>) => {
		switch (data.type) {
			case "progression":
				surProgression?.(data.progression);
				break;
			case "pret":
				chargement?.resoudre({ fils: data.fils, mesures: data.mesures });
				break;
			case "audio": {
				const { id, audio, frequence, phonemes, mesures } = data;
				syntheses.get(id)?.resoudre({ audio, frequence, phonemes, mesures });
				syntheses.delete(id);
				break;
			}
			case "erreur":
				if (data.id === undefined) {
					chargement?.rejeter(new Error(data.message));
					chargement = null;
				} else {
					syntheses.get(data.id)?.rejeter(new Error(data.message));
					syntheses.delete(data.id);
				}
				break;
		}
	};
	worker.onerror = (evenement) => {
		evenement.preventDefault();
		echouerTout(new Error(evenement.message || "Le Worker vocal s'est arrêté"));
	};

	const envoyer = (demande: DemandeVoix) => worker.postMessage(demande);

	return {
		charger(options = {}) {
			surProgression = options.surProgression;
			if (!chargement) {
				let resoudre!: (v: VoixChargee) => void;
				let rejeter!: (e: Error) => void;
				const promesse = new Promise<VoixChargee>((ok, ko) => {
					resoudre = ok;
					rejeter = ko;
				});
				chargement = { resoudre, rejeter, promesse };
				envoyer({ type: "charger" });
			}
			return chargement.promesse;
		},
		synthetiser(texte, options = {}) {
			const id = suivant++;
			return new Promise<Synthese>((resoudre, rejeter) => {
				syntheses.set(id, { resoudre, rejeter });
				envoyer({ type: "synthetiser", id, texte, options });
			});
		},
		terminer() {
			worker.terminate();
			echouerTout(new Error("Voix arrêtée"));
		},
	};
}
