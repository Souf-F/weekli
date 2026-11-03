// Messages échangés entre la page et le Worker vocal.
import type { Progression } from "./fichiers";
import type { OptionsSynthese } from "./kokoro";

export interface MesuresChargement {
	/** Millisecondes par étape, depuis la demande de chargement. */
	manifeste: number;
	fichiers: number;
	espeak: number;
	session: number;
	total: number;
	depuisCache: boolean;
}

export interface MesuresSynthese {
	phonemisation: number;
	inference: number[];
	total: number;
}

export type DemandeVoix =
	| { type: "charger" }
	| { type: "synthetiser"; id: number; texte: string; options: OptionsSynthese };

export type ReponseVoix =
	| { type: "progression"; progression: Progression }
	| { type: "pret"; fils: number; mesures: MesuresChargement }
	| {
			type: "audio";
			id: number;
			audio: Float32Array<ArrayBuffer>;
			frequence: number;
			phonemes: string;
			mesures: MesuresSynthese;
	  }
	| { type: "erreur"; id?: number; message: string };
