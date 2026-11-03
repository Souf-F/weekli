// Hasard reproductible : meme graine, meme suite, donc meme image a l'apercu et a l'export

export function graineDepuisTexte(texte: string): number {
	let h = 2166136261; // FNV-1a
	for (let i = 0; i < texte.length; i++) {
		h ^= texte.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

// mulberry32 : generateur de 0 inclus a 1 exclu
export function alea(graine: number): () => number {
	let s = graine >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
