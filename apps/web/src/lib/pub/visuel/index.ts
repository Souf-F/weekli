// Fondations visuelles de la pub (F5) : fonds, motifs, typographie et typographie cinetique.
// Les transitions vivent dans ../transitions.ts (registre du moteur).
export {
	ACCENT,
	caracteresFrappe,
	debutAccent,
	dessinerFrappe,
	dessinerMotParMot,
	dessinerSoulignement,
	dessinerSurlignage,
	FRAPPE,
	finFrappe,
	finMotParMot,
	MOT,
	type OptionsFrappe,
	type OptionsMotParMot,
	type OptionsSoulignement,
	type OptionsSurlignage,
	SOULIGNEMENT,
	SURLIGNAGE,
} from "./cinetique";
export { avecAlpha, melanger } from "./couleur";
export * from "./courbes";
export { dessinerFondClair, dessinerFondSombre, type OptionsFond, type OptionsFondSombre } from "./fonds";
export { dessinerImpact, IMPACT, type OptionsImpact, secousseImpact } from "./impact";
export { dessinerLettres, finLettres, hauteurRebond, LETTRES, type OptionsLettres } from "./lettres";
export { dessinerCarres, dessinerGrain, dessinerRayons, type OptionsCarres, type OptionsRayons } from "./motifs";
export {
	type Ambiance,
	appliquerPolice,
	type Bloc,
	CAPITALE,
	dessinerBloc,
	ECHELLE,
	type Fragment,
	JAMBAGE,
	type Ligne,
	mettreEnPage,
	type Niveau,
	type OptionsMiseEnPage,
	policesRequises,
	reinitialiserPolice,
} from "./typo";
