import type { Moteur } from "../pub/moteur";
import { HAUTEUR, LARGEUR } from "../pub/scene";

// Miniature PNG 1920 x 1080 : l'image zero de la video (design.md 8.16), jamais une image prise au hasard
export async function creerMiniature(moteur: Moteur): Promise<Blob> {
	const toile = new OffscreenCanvas(LARGEUR, HAUTEUR);
	moteur.dessiner(toile.getContext("2d") as unknown as CanvasRenderingContext2D, 0, 1);
	return toile.convertToBlob({ type: "image/png" });
}
