import type { ScriptPub } from "@weekli/core";
import type { RegistreScenes } from "../../scene";
import { creerContexteProduit, type OptionsProduit } from "../produit/commun";
import { creerAvantApres } from "./avantapres";
import { versExplication } from "./commun";
import { creerFlux } from "./flux";
import { creerTransformation } from "./transformation";

// Scenes d'explication en motion design (F15, design.md 8.17) : transformation, flux, avantapres.
// Meme fabrique que les scenes produit : le registre lit le nom du projet, le logo et les gestes.
export type ScenesExplication = Pick<RegistreScenes, "transformation" | "flux" | "avantapres">;

export function registreExplication(script: ScriptPub, options: OptionsProduit = {}): ScenesExplication {
	const c = versExplication(creerContexteProduit(script, options));
	return { transformation: creerTransformation(c), flux: creerFlux(c), avantapres: creerAvantApres(c) };
}
