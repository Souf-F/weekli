import { calculerTimeline, instantTimeline, type Palette, type ScriptPub, type Timeline } from "@weekli/core";
import { graineDepuisTexte } from "./aleatoire";
import { creerContexte } from "./contexte";
import {
	type ContexteRendu,
	type Ctx2D,
	HAUTEUR,
	IPS,
	type InstantScene,
	LARGEUR,
	type RegistreScenes,
	type RegistreTransitions,
	type Toile,
} from "./scene";
import { TRANSITIONS_PAR_DEFAUT } from "./transitions";

export type OptionsMoteur = {
	script: ScriptPub;
	scenes: RegistreScenes;
	voixMesurees?: Readonly<Record<string, number>>;
	contexte?: ContexteRendu;
	transitions?: RegistreTransitions;
};

export type Moteur = {
	script: ScriptPub;
	timeline: Timeline;
	contexte: ContexteRendu;
	palette: Palette;
	duree: number; // secondes, durees des images comprises
	images: number;
	// Dessine l'image au temps donne dans ctx, a l'echelle donnee (1 = 1920 x 1080, 0,5 = apercu)
	dessiner(ctx: Ctx2D, temps: number, echelle?: number): void;
};

// Nombre d'images exact : la duree de la video vaut images / IPS, a une image pres de la timeline
export const nombreImages = (duree: number) => Math.max(1, Math.round(duree * IPS));

function creerToile(): Toile {
	if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
	return document.createElement("canvas");
}

function preparer(toile: Toile, echelle: number): Ctx2D {
	const l = Math.round(LARGEUR * echelle);
	const h = Math.round(HAUTEUR * echelle);
	if (toile.width !== l) toile.width = l;
	if (toile.height !== h) toile.height = h;
	const ctx = toile.getContext("2d") as Ctx2D;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = "source-over";
	ctx.clearRect(0, 0, l, h);
	ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
	return ctx;
}

export function creerMoteur(options: OptionsMoteur): Moteur {
	const { script, scenes } = options;
	const transitions = options.transitions ?? TRANSITIONS_PAR_DEFAUT;
	const contexte = options.contexte ?? creerContexte(script);
	const timeline = calculerTimeline(script, options.voixMesurees);
	const palette = contexte.palette;
	let coucheAvant: Toile | null = null;
	let coucheApres: Toile | null = null;

	const instant = (id: string, index: number, t: number, temps: number, st: InstantScene["scene"]): InstantScene => ({
		donnees: script.scenes[index],
		scene: st,
		t,
		secondes: t * st.duree,
		temps,
		graine: graineDepuisTexte(id),
		contexte,
	});

	function dessiner(ctx: Ctx2D, temps: number, echelle = 1) {
		const courant = instantTimeline(timeline, temps);
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, Math.round(LARGEUR * echelle), Math.round(HAUTEUR * echelle));
		ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
		ctx.globalAlpha = 1;
		if (!courant) {
			ctx.fillStyle = palette.sombre;
			ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
			ctx.restore();
			return;
		}
		const { scene, t, precedente } = courant;
		const apres = instant(scene.id, scene.index, t, temps, scene);
		if (!precedente) {
			scenes[scene.type].dessiner(ctx, apres, palette);
		} else {
			coucheAvant ??= creerToile();
			coucheApres ??= creerToile();
			const p = precedente;
			const ctxAvant = preparer(coucheAvant, echelle);
			scenes[p.scene.type].dessiner(ctxAvant, instant(p.scene.id, p.scene.index, p.t, temps, p.scene), palette);
			const ctxApres = preparer(coucheApres, echelle);
			scenes[scene.type].dessiner(ctxApres, apres, palette);
			transitions[scene.transition](ctx, coucheAvant, coucheApres, p.progres, palette);
		}
		ctx.restore();
	}

	return { script, timeline, contexte, palette, duree: timeline.duree, images: nombreImages(timeline.duree), dessiner };
}
