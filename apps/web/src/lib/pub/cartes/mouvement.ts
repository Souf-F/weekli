// Mouvement des cartes (design.md 8.10) : fonctions pures du temps de scene.

export const DUREE_ENTREE = 0.5; // secondes
export const MONTEE_ENTREE = 60; // px
export const RETARD_VIGNETTE = 0.15; // secondes
export const T_FOCUS = 0.45; // instant (0 a 1) ou le focus s'active

const borner01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export function easeOutExpo(p: number): number {
	const x = borner01(p);
	return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
}

export function easeInOutCubic(p: number): number {
	const x = borner01(p);
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export type MouvementCarte = {
	opacite: number;
	montee: number; // decalage vertical d'entree en px (positif = plus bas)
	echelle: number; // echelle totale : entree x Ken Burns x zoom du focus
	glissement: number; // 0 a 1 : part de la distance entre le focus et le centre deja parcourue
	focus: number; // 0 a 1 : avancement de l'effet de focus (assombrissement, cadre)
};

// `secondes` : temps local de la scene ; `t` : 0 a 1 ; `retard` : delai d'entree de cette carte
export function mouvementCarte(t: number, secondes: number, retard: number, avecFocus: boolean): MouvementCarte {
	const entree = easeOutExpo((secondes - retard) / DUREE_ENTREE);
	const tt = borner01(t);
	const focus = avecFocus ? easeInOutCubic((tt - T_FOCUS) / 0.18) : 0;
	// Ken Burns 1 -> 1,05 sur la scene ; avec focus, la carte zoome de 1,05 a 1,12 a partir de T_FOCUS
	const kenBurns = avecFocus ? lerp(1, 1.05, Math.min(1, tt / T_FOCUS)) : lerp(1, 1.05, tt);
	const zoom = avecFocus ? lerp(kenBurns, 1.12, focus) : kenBurns;
	return {
		opacite: entree,
		montee: (1 - entree) * MONTEE_ENTREE,
		echelle: lerp(0.94, 1, entree) * zoom,
		glissement: avecFocus ? easeInOutCubic(tt) : 0,
		focus,
	};
}
