import { calculerTimeline, nettoyerScriptPub, type ScriptPub } from "@weekli/core";

// Resultat de nettoyerScriptPub sur le script en cours d'edition, avec les avertissements ranges par scene
export type Diagnostic = {
	script: ScriptPub | null; // script nettoye, null si une regle de rejet est enfreinte
	erreurs: string[];
	generaux: string[];
	parScene: Record<string, string[]>;
	duree: number | null; // secondes, voix estimee
};

const SCENE = /^Scene "([a-z0-9-]+)"\s*:\s*/;
const LISTE = /\(([a-z0-9, -]+)\)\s*\.?$/;

export function diagnostiquer(script: ScriptPub): Diagnostic {
	const r = nettoyerScriptPub(script);
	const parScene: Record<string, string[]> = {};
	const generaux: string[] = [];
	const ids = new Set(script.scenes.map((s) => s.id));
	const poser = (id: string, texte: string) => (parScene[id] ??= []).push(texte);
	for (const a of r.avertissements) {
		const direct = SCENE.exec(a);
		if (direct && ids.has(direct[1])) {
			poser(direct[1], a.replace(SCENE, ""));
			continue;
		}
		const citees = a.startsWith("Repetition") ? (LISTE.exec(a)?.[1].split(/,\s*/) ?? []).filter((id) => ids.has(id)) : [];
		if (citees.length) citees.forEach((id) => poser(id, a));
		else generaux.push(a);
	}
	return { script: r.script, erreurs: r.erreurs, generaux, parScene, duree: r.script ? calculerTimeline(r.script).duree : null };
}
