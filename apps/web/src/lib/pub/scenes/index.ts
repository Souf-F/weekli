import type { ScriptPub } from "@weekli/core";
import type { RegistreScenes } from "../scene";
import { type OptionsProduit, registreProduit } from "./produit";
import { registreTension } from "./tension";

// Registre complet du moteur : scenes de tension et de revelation (F6) et scenes produit (F7).
// Les deux familles lisent le monogramme dans le script (marque.monogramme, sinon l'initiale du nom) :
// il n'y a donc qu'une seule source pour le logo de la pub.
export function registreScenes(script: ScriptPub, options: OptionsProduit = {}): RegistreScenes {
	return { ...registreTension(script), ...registreProduit(script, options) };
}

export type { OptionsProduit } from "./produit";
