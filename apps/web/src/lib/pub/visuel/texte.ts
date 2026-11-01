import type { Ctx2D } from "../scene";
import { dessinerFrappe, dessinerMotParMot, finFrappe, finMotParMot, type OptionsMotParMot } from "./cinetique";
import type { Apparition } from "./gestes";
import { dessinerImpact, IMPACT } from "./impact";
import { dessinerLettres, finLettres } from "./lettres";
import type { Bloc } from "./typo";

// Apparition d'un bloc de texte par le procede choisi (gestes.ts). Les procedes partagent la meme
// signature : une scene change de procede sans changer de mise en page ni de calendrier.

export type OptionsApparition = OptionsMotParMot & {
	curseur: string; // frappe : couleur du curseur
	particules: string; // lettres : couleur des particules
	graine: number;
};

// Instant ou le texte a fini d'entrer, quel que soit le procede
export function finApparition(procede: Apparition, bloc: Bloc, debut: number, ecart?: number): number {
	switch (procede) {
		case "frappe":
			return finFrappe(bloc, debut);
		case "lettres":
			return finLettres(bloc, debut) - 0.5 + 0.3;
		case "impact":
			return debut + IMPACT.duree;
		default:
			return finMotParMot(bloc, debut, ecart);
	}
}

export function dessinerApparition(ctx: Ctx2D, procede: Apparition, bloc: Bloc, secondes: number, o: OptionsApparition) {
	const debut = o.debut ?? 0;
	switch (procede) {
		case "frappe":
			dessinerFrappe(ctx, bloc, secondes, { debut, couleur: o.couleur, couleurAccent: o.couleurAccent, curseur: o.curseur });
			return;
		case "lettres":
			dessinerLettres(ctx, bloc, secondes, { debut, couleur: o.couleur, couleurAccent: o.couleurAccent, particules: o.particules, graine: o.graine });
			return;
		case "impact":
			dessinerImpact(ctx, bloc, secondes, { debut, couleur: o.couleur });
			return;
		default:
			dessinerMotParMot(ctx, bloc, secondes, o);
	}
}

