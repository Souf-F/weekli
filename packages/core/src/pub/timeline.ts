import {
	DECALAGE_VOIX,
	DUREE_GESTES,
	DUREE_GESTES_CAPTURE,
	DUREES_SCENE,
	DUREES_TRANSITION,
	LIMITES_PUB,
	MARGE_VOIX,
	MOTS_PAR_MINUTE,
	PAUSE_LECTURE,
} from "./limites";
import { BUT_DEFAUT, type But, type ScenePub, type ScriptPub, type Transition, type TypeScene } from "./types";

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
	transformation: "flou",
	flux: "coupe",
	avantapres: "glitch",
	resultat: "flou",
	preuve: "pixels",
	appel: "glitch",
	fin: "flou",
};

const borne = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const mots = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Bornes d'un type de scene ; une etape portee par une capture reste breve (design.md 8.17)
export const estCapture = (s: ScenePub) => s.type === "etape" && s.visuel.type === "capture";
export function bornesScene(scene: ScenePub): { min: number; defaut: number; max: number } {
	const d = DUREES_SCENE[scene.type];
	if (!estCapture(scene)) return d;
	const max = LIMITES_PUB.capturesScene.dureeMax;
	return { min: 1.8, defaut: max, max };
}

export const dureeVoixEstimee = (voix: string, vitesse: number) => (mots(voix) * 60) / (MOTS_PAR_MINUTE * vitesse);

// But effectif d'une scene : celui du script, sinon le defaut du type ; une etape portee par une capture est toujours "montrer"
export const butScene = (scene: ScenePub): But => (estCapture(scene) ? "montrer" : (scene.but ?? BUT_DEFAUT[scene.type]));

// Plancher de duree d'une scene : gestes d'entree puis pause de lecture, dans les bornes du type (design.md 8.16)
export function plancherScene(scene: ScenePub): number {
	const { min, max } = bornesScene(scene);
	const gestes = estCapture(scene) ? DUREE_GESTES_CAPTURE : DUREE_GESTES[scene.type];
	return borne(gestes + PAUSE_LECTURE[butScene(scene)], min, max);
}

// Duree d'une scene : la voix fixe le tempo (voix + marge, bornee par type), sinon `duree` du script ou defaut du type.
// Quand la voix est plus courte que gestes + pause, la duree suit gestes + pause (dans les bornes).
export function dureeScene(scene: ScenePub, script: ScriptPub, voixMesuree?: number): number {
	const { min, defaut, max } = bornesScene(scene);
	const voix = script.voix.mode === "aucune" ? 0 : (voixMesuree ?? dureeVoixEstimee(scene.voix, script.voix.vitesse));
	const base = voix > 0 ? borne(voix + MARGE_VOIX, min, max) : borne(scene.duree ?? defaut, min, max);
	return Math.max(base, plancherScene(scene));
}

// Une transition explicite (glitch, flou, pixels) est aussi un geste : hors de `gestes`, elle redevient une coupe (design.md 8.16)
const geste = (t: Transition, script: ScriptPub): Transition => (t !== "coupe" && script.gestes && !script.gestes.includes(t) ? "coupe" : t);

// Place les scenes non masquees sur l'axe du temps. Chaque transition d'entree chevauche la fin de la
// scene precedente : debut(n) = fin(n-1) - chevauchement(n). `voixMesurees` : durees reelles par id de scene
export function calculerTimeline(script: ScriptPub, voixMesurees: Readonly<Record<string, number>> = {}): Timeline {
	const visibles = script.scenes.map((s, index) => ({ s, index })).filter(({ s }) => !s.masquee);
	const totalEtapes = visibles.filter(({ s }) => s.type === "etape").length;
	let etapes = 0;
	let fin = 0;
	const rangs = visibles.map(({ s }) => {
		const numero = s.type === "etape" ? ++etapes : 0;
		const voulue = s.transition ?? (numero > 1 ? "coupe" : numero === 1 ? "flou" : TRANSITION_DEFAUT[s.type]);
		return { numero, transition: geste(voulue, script) };
	});
	const voixDe = ({ s }: { s: ScenePub }) =>
		script.voix.mode === "aucune"
			? 0
			: Object.hasOwn(voixMesurees, s.id)
				? voixMesurees[s.id]
				: dureeVoixEstimee(s.voix, script.voix.vitesse);
	const scenes = visibles.map(({ s, index }, rang): SceneTimeline => {
		const { numero, transition } = rangs[rang];
		const chevauchement = rang === 0 ? 0 : DUREES_TRANSITION[transition];
		const debut = Math.max(fin - chevauchement, 0);
		let duree = dureeScene(s, script, Object.hasOwn(voixMesurees, s.id) ? voixMesurees[s.id] : undefined);
		// La voix (decalee) doit finir avant le debut du chevauchement de la scene suivante : sinon on allonge
		const suivante = rangs[rang + 1];
		const voix = voixDe(visibles[rang]);
		if (suivante && voix > 0) duree = Math.max(duree, DECALAGE_VOIX + voix + DUREES_TRANSITION[suivante.transition]);
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
