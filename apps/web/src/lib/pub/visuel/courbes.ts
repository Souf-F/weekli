// Courbes et petits calculs de temps partages par tous les procedes (secondes, fonctions pures)

export const borner = (x: number, min = 0, max = 1) => Math.min(Math.max(x, min), max);
export const interpoler = (a: number, b: number, t: number) => a + (b - a) * t;

// Avancement de 0 a 1 d'un procede qui commence a `debut` et dure `duree` secondes
export const avancement = (secondes: number, debut: number, duree: number) =>
	duree <= 0 ? (secondes >= debut ? 1 : 0) : borner((secondes - debut) / duree);

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInCubic = (t: number) => t * t * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const lisser = (a: number, b: number, x: number) => {
	const t = borner((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

// Rebond d'echelle : monte vite au pic puis revient a 1 (accent : pic 1,06 en 180 ms)
export function rebond(t: number, pic: number): number {
	if (t <= 0 || t >= 1) return 1;
	const montee = 0.25;
	const k = t < montee ? easeOutCubic(t / montee) : 1 - easeInOutCubic((t - montee) / (1 - montee));
	return 1 + (pic - 1) * k;
}
