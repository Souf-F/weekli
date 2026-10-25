import { DUREES_SCENE, DUREES_TRANSITION, MARGE_VOIX, MOTS_PAR_MINUTE } from "./limites";
import type { ScenePub, ScriptPub, Transition, TypeScene } from "./types";

export type SceneTimeline = {
	id: string;
	type: TypeScene;
	index: number; // position dans script.scenes
	debut: number; // secondes
	duree: number;
	fin: number;
	transition: Transition; // transition d'entree
	chevauchement: number; // secondes pendant lesquelles la scene precedente reste visible sous celle-ci
	etape?: { numero: number; total: number };
};

export type Timeline = { scenes: SceneTimeline[]; duree: number };

const TRANSITION_DEFAUT: Record<TypeScene, Transition> = {
	ouverture: "coupe",
	repetition: "coupe",
	boucle: "glitch",
	chorus: "flou",
	rupture: "glitch",
	revelation: "pixels",
	etape: "coupe",
	resultat: "flou",
	preuve: "pixels",
	appel: "glitch",
	fin: "flou",
};

const borne = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const mots = (s: string) => s.split(/\s+/).filter(Boolean).length;

export const dureeVoixEstimee = (voix: string, vitesse: number) => (mots(voix) * 60) / (MOTS_PAR_MINUTE * vitesse);

// Duree d'une scene : la voix fixe le tempo (voix + marge, bornee par type), sinon `duree` du script ou defaut du type
export function dureeScene(scene: ScenePub, script: ScriptPub, voixMesuree?: number): number {
	const { min, defaut, max } = DUREES_SCENE[scene.type];
	const voix = script.voix.mode === "aucune" ? 0 : (voixMesuree ?? dureeVoixEstimee(scene.voix, script.voix.vitesse));
	return voix > 0 ? borne(voix + MARGE_VOIX, min, max) : borne(scene.duree ?? defaut, min, max);
}

// Place les scenes non masquees sur l'axe du temps. Chaque transition d'entree chevauche la fin de la
// scene precedente : debut(n) = fin(n-1) - chevauchement(n). `voixMesurees` : durees reelles par id de scene
export function calculerTimeline(script: ScriptPub, voixMesurees: Readonly<Record<string, number>> = {}): Timeline {
	const visibles = script.scenes.map((s, index) => ({ s, index })).filter(({ s }) => !s.masquee);
	const totalEtapes = visibles.filter(({ s }) => s.type === "etape").length;
	let etapes = 0;
	let fin = 0;
	const scenes = visibles.map(({ s, index }, rang): SceneTimeline => {
		const numero = s.type === "etape" ? ++etapes : 0;
		const transition = s.transition ?? (numero > 1 ? "coupe" : numero === 1 ? "flou" : TRANSITION_DEFAUT[s.type]);
		const chevauchement = rang === 0 ? 0 : DUREES_TRANSITION[transition];
		const debut = Math.max(fin - chevauchement, 0);
		const duree = dureeScene(s, script, Object.hasOwn(voixMesurees, s.id) ? voixMesurees[s.id] : undefined);
		fin = debut + duree;
		return {
			id: s.id,
			type: s.type,
			index,
			debut,
			duree,
			fin,
			transition,
			chevauchement,
			...(numero ? { etape: { numero, total: totalEtapes } } : {}),
		};
	});
	return { scenes, duree: fin };
}

export type Instant = {
	scene: SceneTimeline;
	t: number; // 0 a 1 dans la scene
	precedente: { scene: SceneTimeline; t: number; progres: number } | null; // progres de la transition, 0 a 1
};

// Ce qu'il faut dessiner a l'instant `temps` : la scene courante et, pendant une transition, la precedente
export function instantTimeline(tl: Timeline, temps: number): Instant | null {
	if (!tl.scenes.length) return null;
	const rang = tl.scenes.reduce((r, s, i) => (s.debut <= temps ? i : r), -1);
	const scene = tl.scenes[Math.max(rang, 0)];
	const local = (s: SceneTimeline) => borne((temps - s.debut) / s.duree, 0, 1);
	const avant = tl.scenes[rang - 1];
	const progres = scene.chevauchement ? (temps - scene.debut) / scene.chevauchement : 1;
	return {
		scene,
		t: local(scene),
		precedente: avant && progres < 1 ? { scene: avant, t: local(avant), progres: Math.max(progres, 0) } : null,
	};
}
