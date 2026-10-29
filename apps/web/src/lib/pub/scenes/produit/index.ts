import type { ScriptPub } from "@weekli/core";
import type { RegistreScenes } from "../../scene";
import { creerAppel } from "./appel";
import { creerContexteProduit, type OptionsProduit } from "./commun";
import { creerEtape } from "./etape";
import { creerFin } from "./fin";
import { creerPreuve } from "./preuve";
import { creerResultat } from "./resultat";

// Scenes produit et action (F7) : etape, resultat, preuve, appel, fin.
// Le registre se cree pour un script : l'en-tete des etapes lit les onglets de toutes les etapes et le
// nom du projet, la fin lit le logo ; `InstantScene` ne porte que la scene courante. Le registre
// complet du moteur sera assemble avec celui des scenes de tension (F6).
export type ScenesProduit = Pick<RegistreScenes, "etape" | "resultat" | "preuve" | "appel" | "fin">;

export function registreProduit(script: ScriptPub, options: OptionsProduit = {}): ScenesProduit {
	const c = creerContexteProduit(script, options);
	return {
		etape: creerEtape(c),
		resultat: creerResultat(c),
		preuve: creerPreuve(c),
		appel: creerAppel(c),
		fin: creerFin(c),
	};
}

export type { OptionsProduit } from "./commun";
export { cellulesMonogramme, dessinerLogo, texteMonogramme } from "./logo";
