// Manipulation des couleurs de la palette (#rrggbb ou rgba()) pour les degrades et les fondus

type Rvba = [number, number, number, number];

export function lireCouleur(couleur: string): Rvba {
	if (couleur.startsWith("#")) {
		const n = Number.parseInt(couleur.slice(1, 7), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
	}
	const m = couleur.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
	return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 1];
}

const ecrire = ([r, v, b, a]: Rvba) => `rgba(${Math.round(r)}, ${Math.round(v)}, ${Math.round(b)}, ${+a.toFixed(4)})`;

// Meme teinte, opacite multipliee par `facteur` (garde l'opacite propre de la couleur, ex. `rayons`)
export function avecAlpha(couleur: string, facteur: number): string {
	const [r, v, b, a] = lireCouleur(couleur);
	return ecrire([r, v, b, a * facteur]);
}

export function melanger(a: string, b: string, t: number): string {
	const x = lireCouleur(a);
	const y = lireCouleur(b);
	return ecrire(x.map((c, i) => c + (y[i] - c) * t) as Rvba);
}
