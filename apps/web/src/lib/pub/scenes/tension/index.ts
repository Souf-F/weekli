import type { ScriptPub } from "@weekli/core";
import type { RegistreScenes } from "../../scene";
import { creerBoucle } from "./boucle";
import { creerChorus } from "./chorus";
import { identiteDepuisScript } from "./commun";
import { creerOuverture } from "./ouverture";
import { creerRepetition } from "./repetition";
import { creerRevelation } from "./revelation";
import { creerRupture } from "./rupture";

// Scenes de tension et de revelation (F6). Le registre complet du moteur sera assemble avec les
// scenes produit (F7). Les scenes lisent le nom, le logo et la typo du script : d'ou la fabrique.

export type TypeTension = "ouverture" | "repetition" | "boucle" | "chorus" | "rupture" | "revelation";
export type RegistreTension = Pick<RegistreScenes, TypeTension>;

export function registreTension(script: Pick<ScriptPub, "projet" | "marque">): RegistreTension {
	const identite = identiteDepuisScript(script);
	return {
		ouverture: creerOuverture(identite),
		repetition: creerRepetition(identite),
		boucle: creerBoucle(identite),
		chorus: creerChorus(identite),
		rupture: creerRupture(identite),
		revelation: creerRevelation(identite),
	};
}

export { type Identite, identiteDepuisScript } from "./commun";
export { type Grille, grilleImage, grilleMonogramme } from "./logo";
