import type { Post } from "./types";

// Storyboard d'une video LinkedIn : une suite de scenes courtes, rendues ensuite sur un canvas

export type Scene =
	| { type: "titre"; titre: string; sousTitre?: string; duree: number }
	| { type: "terminal"; commande: string; lignes: string[]; duree: number }
	| { type: "liste"; titre: string; elements: string[]; duree: number }
	| { type: "avantApres"; avant: string; apres: string; legende: string; duree: number }
	| { type: "citation"; texte: string; duree: number }
	| { type: "fin"; titre: string; lien?: string; duree: number };

export type Storyboard = { scenes: Scene[] };

export const LIMITES_VIDEO = { scenes: 8, dureeMin: 2, dureeMax: 7, texte: 140, lignes: 6 } as const;

// Tronque sans couper un mot : on s'arrete au dernier espace et on ajoute des points de suspension
const court = (v: unknown, max: number = LIMITES_VIDEO.texte) => {
	if (typeof v !== "string") return "";
	const texte = v.replace(/\s+/g, " ").trim();
	if (texte.length <= max) return texte;
	const coupe = texte.slice(0, max - 1);
	const espace = coupe.lastIndexOf(" ");
	return `${(espace > max / 2 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.]+$/, "")}…`;
};
const duree = (v: unknown, defaut: number) =>
	Math.min(
		Math.max(typeof v === "number" && Number.isFinite(v) ? v : defaut, LIMITES_VIDEO.dureeMin),
		LIMITES_VIDEO.dureeMax,
	);
const liste = (v: unknown, max: number = LIMITES_VIDEO.lignes) =>
	(Array.isArray(v) ? v : [])
		.map((x) => court(x, 80))
		.filter(Boolean)
		.slice(0, max);

// Valide et borne un storyboard venu de l'IA ou d'un utilisateur : rien d'inattendu n'atteint le rendu
export function nettoyerStoryboard(entree: unknown): Storyboard {
	const brutes = (entree as { scenes?: unknown[] } | null)?.scenes;
	const scenes: Scene[] = [];
	for (const s of Array.isArray(brutes) ? brutes : []) {
		if (!s || typeof s !== "object") continue;
		const e = s as Record<string, unknown>;
		switch (e.type) {
			case "titre":
				if (court(e.titre))
					scenes.push({
						type: "titre",
						titre: court(e.titre, 70),
						sousTitre: court(e.sousTitre, 90),
						duree: duree(e.duree, 3),
					});
				break;
			case "terminal":
				if (liste(e.lignes).length)
					scenes.push({
						type: "terminal",
						commande: court(e.commande, 60),
						lignes: liste(e.lignes),
						duree: duree(e.duree, 4),
					});
				break;
			case "liste":
				if (liste(e.elements, 4).length)
					scenes.push({
						type: "liste",
						titre: court(e.titre, 60),
						elements: liste(e.elements, 4),
						duree: duree(e.duree, 5),
					});
				break;
			case "avantApres":
				if (court(e.avant) && court(e.apres))
					scenes.push({
						type: "avantApres",
						avant: court(e.avant, 40),
						apres: court(e.apres, 40),
						legende: court(e.legende, 70),
						duree: duree(e.duree, 4),
					});
				break;
			case "citation":
				if (court(e.texte)) scenes.push({ type: "citation", texte: court(e.texte, 120), duree: duree(e.duree, 4) });
				break;
			case "fin":
				scenes.push({
					type: "fin",
					titre: court(e.titre, 50) || "Weekli",
					lien: court(e.lien, 60),
					duree: duree(e.duree, 3),
				});
				break;
		}
		if (scenes.length >= LIMITES_VIDEO.scenes) break;
	}
	return { scenes };
}

export const dureeTotale = (s: Storyboard) => s.scenes.reduce((t, x) => t + x.duree, 0);

// Storyboard sans IA : tire un titre, une liste et une phrase forte du texte du post
export function storyboardDepuisPost(post: Post): Storyboard {
	const lignes = post.texte
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !/^#\w/.test(l));
	const hashtags = (post.texte.match(/#[\p{L}\d_]+/gu) ?? []).slice(0, 3).join(" ");
	const numerotees = lignes.filter((l) => /^(\d+[.)]|[-•])\s/.test(l)).map((l) => l.replace(/^(\d+[.)]|[-•])\s*/, ""));
	// Les liens et les phrases qui annoncent une liste ne font pas de bonnes scenes
	const phrases = lignes.filter((l) => !/^(\d+[.)]|[-•])\s/.test(l) && !/https?:\/\//.test(l));
	const accroche = phrases[0] ?? post.titre;
	const forte = phrases
		.slice(1)
		.sort((a, b) => a.length - b.length)
		.find((p) => p.length > 25 && p.length < 120 && !p.endsWith(":"));

	const scenes: unknown[] = [{ type: "titre", titre: post.titre || accroche, sousTitre: post.titre ? accroche : "" }];
	if (numerotees.length >= 2) scenes.push({ type: "liste", titre: "En bref", elements: numerotees });
	else if (phrases.length > 2) scenes.push({ type: "liste", titre: "En bref", elements: phrases.slice(1, 4) });
	if (forte) scenes.push({ type: "citation", texte: forte });
	// La source peut contenir des SHA ("weekli · 88baace") : seul le nom du projet sert de titre de fin
	scenes.push({ type: "fin", titre: post.source.split(/[·|,]/)[0].trim() || "Weekli", lien: hashtags });
	return nettoyerStoryboard({ scenes });
}

// Generation par l'IA : consignes et schema de sortie structuree

export function systemeStoryboard() {
	return `Tu es motion designer. A partir d'un post LinkedIn de developpeur, tu proposes le storyboard d'une video verticale de 12 a 25 secondes.

Types de scenes disponibles :
- titre : accroche forte (titre, sousTitre optionnel)
- terminal : une commande et jusqu'a 6 lignes de sortie, pour montrer du code ou un resultat
- liste : un titre et 2 a 4 points courts
- avantApres : deux valeurs (avant, apres) et une legende, pour un gain mesurable
- citation : une phrase forte du post
- fin : nom du projet et lien ou hashtags

Regles :
- 3 a 6 scenes, toujours une scene titre en premier et une scene fin en dernier.
- Textes tres courts, lisibles en 2 secondes. Jamais de tiret long.
- N'invente aucun chiffre ni aucune commande absente du post : sans donnees, n'utilise pas avantApres ni terminal.
- duree en secondes, entre 2 et 7.`;
}

export const SCHEMA_STORYBOARD = {
	type: "object",
	properties: {
		scenes: {
			type: "array",
			items: {
				type: "object",
				properties: {
					type: { type: "string", enum: ["titre", "terminal", "liste", "avantApres", "citation", "fin"] },
					titre: { type: "string" },
					sousTitre: { type: "string" },
					commande: { type: "string" },
					lignes: { type: "array", items: { type: "string" } },
					elements: { type: "array", items: { type: "string" } },
					avant: { type: "string" },
					apres: { type: "string" },
					legende: { type: "string" },
					texte: { type: "string" },
					lien: { type: "string" },
					duree: { type: "number" },
				},
				required: ["type", "duree"],
				additionalProperties: false,
			},
		},
	},
	required: ["scenes"],
	additionalProperties: false,
} as const;
