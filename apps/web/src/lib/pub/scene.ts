import type { Palette, ScenePub, SceneTimeline, Transition, TypeScene } from "@weekli/core";

// Format fixe de la pub (design.md 8.3)
export const LARGEUR = 1920;
export const HAUTEUR = 1080;
export const IPS = 30;

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Toile = HTMLCanvasElement | OffscreenCanvas;

// Tout ce qu'une scene peut lire pour dessiner une image : fonction pure de ces valeurs
export type InstantScene = {
	donnees: ScenePub; // la scene du script
	scene: SceneTimeline;
	t: number; // 0 a 1 dans la scene
	secondes: number; // secondes ecoulees dans la scene
	temps: number; // secondes depuis le debut de la pub
	graine: number; // entier stable issu de l'id de la scene, pour `alea`
	contexte: ContexteRendu;
};

// Ressources partagees, chargees avant le premier dessin
export type ContexteRendu = {
	palette: Palette;
	images: Map<string, ImageBitmap>; // captures, logo, images importees, par id
	filtre: boolean; // ctx.filter disponible (flou) ; sinon la scene doit se passer du flou
};

// Interface d'une scene : le moteur appelle dessiner() avec un repere logique de 1920 x 1080
// (l'echelle de l'apercu est deja appliquee). Aucun etat, aucun Math.random : voir `alea`.
export type Scene = {
	dessiner(ctx: Ctx2D, instant: InstantScene, palette: Palette): void;
};

export type RegistreScenes = Record<TypeScene, Scene>;

// Transition : compose la couche `avant` (scene precedente) et `apres` (scene courante), progres de 0 a 1.
// Les couches sont des toiles 1920 x 1080 logiques (dessiner avec drawImage(couche, 0, 0, LARGEUR, HAUTEUR)).
export type Transitionneur = (ctx: Ctx2D, avant: Toile, apres: Toile, progres: number, palette: Palette) => void;
export type RegistreTransitions = Record<Transition, Transitionneur>;
