import type { PubEnregistree } from "@weekli/core";
import { api } from "@/lib/api";
import { chargerPolices, creerContexte } from "@/lib/pub/contexte";
import { creerMoteur } from "@/lib/pub/moteur";
import { registreScenes } from "@/lib/pub/scenes";
import { policesRequises } from "@/lib/pub/visuel";

// Vignette d'une pub : l'image de sa revelation, rendue a la volee (design.md 9.2). Une seule a la fois, pour ne pas
// bloquer la page quand la liste en compte vingt.
const LARGEUR_VIGNETTE = 480;
const echelle = LARGEUR_VIGNETTE / 1920;
let file: Promise<unknown> = Promise.resolve();

export async function dessinerVignette(canvas: HTMLCanvasElement, pub: PubEnregistree): Promise<void> {
	const { script } = pub;
	await chargerPolices(policesRequises(script.marque.typo));
	const moteur = creerMoteur({ script, scenes: registreScenes(script), contexte: creerContexte(script) });
	const revelation = moteur.timeline.scenes.find((s) => s.type === "revelation") ?? moteur.timeline.scenes[0];
	canvas.width = LARGEUR_VIGNETTE;
	canvas.height = Math.round((LARGEUR_VIGNETTE * 9) / 16);
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	moteur.dessiner(ctx, revelation ? revelation.debut + revelation.duree * 0.85 : 0, echelle);
}

export function vignette(canvas: HTMLCanvasElement, id: string): Promise<void> {
	const tache = file.then(async () => dessinerVignette(canvas, await api.pub(id)));
	file = tache.catch(() => undefined);
	return tache;
}
