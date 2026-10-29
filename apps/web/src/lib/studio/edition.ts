import { LIMITES_PUB, REGEX_ID, type ScenePub, type ScriptPub, type TypeScene } from "@weekli/core";

// Edition d'un ScriptPub : fonctions pures, jamais de mutation. Le script edite n'est pas nettoye a chaque frappe
// (les regles de structure se signalent sans bloquer, voir diagnostic.ts).

export const NOMS_SCENE: Record<TypeScene, string> = {
	ouverture: "Ouverture",
	repetition: "Répétition",
	boucle: "Boucle",
	chorus: "Chorus",
	rupture: "Rupture",
	revelation: "Révélation",
	etape: "Étape",
	transformation: "Transformation",
	flux: "Flux",
	avantapres: "Avant et après",
	resultat: "Résultat",
	preuve: "Preuve",
	appel: "Appel",
	fin: "Fin",
};

export type Chemin = readonly (string | number)[];

export function lireChemin(racine: unknown, chemin: Chemin): unknown {
	return chemin.reduce<unknown>((courant, cle) => (courant == null ? undefined : (courant as Record<string | number, unknown>)[cle]), racine);
}

// Ecrit une valeur en copiant les objets traverses. `undefined` retire la cle.
export function ecrireChemin<T>(racine: T, chemin: Chemin, valeur: unknown): T {
	if (chemin.length === 0) return valeur as T;
	const [cle, ...reste] = chemin;
	const copie = (Array.isArray(racine) ? [...racine] : { ...(racine as object) }) as Record<string | number, unknown>;
	const suite = ecrireChemin(copie[cle], reste, valeur);
	if (suite === undefined && !Array.isArray(copie)) delete copie[cle];
	else copie[cle] = suite;
	return copie as T;
}

export const remplacerScene = (script: ScriptPub, index: number, scene: ScenePub): ScriptPub => ({
	...script,
	scenes: script.scenes.map((s, i) => (i === index ? scene : s)),
});

export const modifierScene = (script: ScriptPub, index: number, chemin: Chemin, valeur: unknown): ScriptPub =>
	remplacerScene(script, index, ecrireChemin(script.scenes[index], chemin, valeur));

export function deplacerScene(script: ScriptPub, index: number, sens: -1 | 1): ScriptPub {
	const cible = index + sens;
	if (cible < 0 || cible >= script.scenes.length) return script;
	const scenes = [...script.scenes];
	[scenes[index], scenes[cible]] = [scenes[cible], scenes[index]];
	return { ...script, scenes };
}

export const basculerMasquee = (script: ScriptPub, index: number): ScriptPub =>
	remplacerScene(script, index, { ...script.scenes[index], masquee: !script.scenes[index].masquee });

export const retirerScene = (script: ScriptPub, index: number): ScriptPub => ({
	...script,
	scenes: script.scenes.filter((_, i) => i !== index),
});

export const peutDupliquer = (script: ScriptPub) => script.scenes.length < LIMITES_PUB.scenes.max;
export const peutRetirer = (script: ScriptPub) => script.scenes.length > LIMITES_PUB.scenes.min;

// "etape-2" donne "etape-3" : un id libre, de 24 caracteres au plus
export function idLibre(script: ScriptPub, modele: string): string {
	const base = modele.replace(/-\d+$/, "").slice(0, 20);
	const pris = new Set(script.scenes.map((s) => s.id));
	for (let n = 2; n < 1000; n++) {
		const id = `${base}-${n}`;
		if (!pris.has(id) && REGEX_ID.test(id)) return id;
	}
	return `${base}-${Date.now() % 1000}`;
}

export function dupliquerScene(script: ScriptPub, index: number): ScriptPub {
	if (!peutDupliquer(script)) return script;
	const copie = { ...structuredClone(script.scenes[index]), id: idLibre(script, script.scenes[index].id) };
	const scenes = [...script.scenes];
	scenes.splice(index + 1, 0, copie);
	return { ...script, scenes };
}

// Gestes : 2 a 3 identifiants distincts, ou aucun (defauts du catalogue)
export function basculerGeste(script: ScriptPub, geste: NonNullable<ScriptPub["gestes"]>[number], max = 3): ScriptPub {
	const actuels = script.gestes ?? [];
	const suivants = actuels.includes(geste) ? actuels.filter((g) => g !== geste) : actuels.length < max ? [...actuels, geste] : actuels;
	return { ...script, gestes: suivants.length ? suivants : undefined };
}

// "Mon meilleur projet" donne "mon-meilleur-projet"
export const nomFichier = (titre: string) =>
	titre
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60) || "pub";
