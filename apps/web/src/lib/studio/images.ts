import type { CaptureRef, Hex, ScriptPub } from "@weekli/core";
import { api } from "../api";
import {
	type Capturer,
	chargerImagesScript,
	decoderImage,
	echantillonner,
	extraireCouleurs,
	ID_LOGO,
	importerImage,
	proposerMarque,
	type ResultatChargement,
	type Media,
	type Stockage,
	ouvrirStockage,
} from "../pub/cartes";

// Les captures de site pesent sur la limite de 5 par minute : une fois recues, elles restent en memoire
// pour la session (jamais stockees par le serveur ni sur disque)
const captures = new Map<string, Blob>();
const cleCapture = (url: string, format: string) => `${url}|${format}`;

export async function capturerSite(url: string, format: "bureau" | "mobile"): Promise<Blob> {
	const cle = cleCapture(url, format);
	const connue = captures.get(cle);
	if (connue) return connue;
	const blob = await api.capturer(url, format);
	captures.set(cle, blob);
	return blob;
}

export const memoriserCapture = (url: string, format: string, blob: Blob) => void captures.set(cleCapture(url, format), blob);

// Repli en memoire quand IndexedDB est indisponible (navigation privee) : les images importees durent le temps de la session
function stockageMemoire(): Stockage {
	const medias = new Map<string, Media>();
	return {
		async enregistrer(cle, genre, nom, blob) {
			medias.set(cle, { cle, genre, nom, type: blob.type, blob, ajoute: Date.now() });
		},
		async lire(cle) {
			return medias.get(cle);
		},
		async lister(prefixe) {
			return [...medias.values()].filter((m) => m.cle.startsWith(prefixe));
		},
		async supprimer(cle) {
			medias.delete(cle);
		},
		async supprimerPrefixe(prefixe) {
			for (const cle of [...medias.keys()]) if (cle.startsWith(prefixe)) medias.delete(cle);
		},
		fermer() {},
	};
}

// Stockage IndexedDB local (images et logo importes)
let stockage: Promise<Stockage> | null = null;
export const stockageLocal = () => (stockage ??= ouvrirStockage().catch(stockageMemoire));

export type Couleurs = { accent: Hex | null; candidats: Hex[] };

// Trois couleurs proposees au plus, tirees d'une image (design.md 8.4)
export async function couleursDeImage(blob: Blob): Promise<Couleurs> {
	const image = await decoderImage(blob);
	const p = proposerMarque(extraireCouleurs(echantillonner(image)));
	image.close();
	return { accent: p.accent, candidats: p.candidats.slice(0, 2) };
}

export async function importerPourPub(idPub: string, id: string, fichier: File): Promise<ImageBitmap> {
	return importerImage(await stockageLocal(), idPub, id, fichier);
}

// Enregistre sous l'id de la pub les images importees pendant l'assistant (la pub n'avait pas encore d'id)
export async function rattacherImages(idPub: string, images: ReadonlyMap<string, File>): Promise<void> {
	const s = await stockageLocal();
	for (const [id, fichier] of images) await importerImage(s, idPub, id, fichier);
}

export async function supprimerImagesPub(idPub: string): Promise<void> {
	const s = await stockageLocal();
	await s.supprimerPrefixe(`${idPub}/`);
}

// Charge les images manquantes d'un script ; les echecs sont listes dans `manquantes`
export async function chargerImagesManquantes(
	script: Pick<ScriptPub, "captures" | "marque">,
	idPub: string,
	deja: ReadonlySet<string>,
	signal?: AbortSignal,
): Promise<ResultatChargement> {
	const s = await stockageLocal();
	const capturer: Capturer = capturerSite;
	const vides: ResultatChargement = { images: new Map(), manquantes: [] };
	const aCharger: CaptureRef[] = script.captures.filter((c) => !deja.has(c.id));
	const logo = script.marque.logo === "image" && !deja.has(ID_LOGO);
	if (!aCharger.length && !logo) return vides;
	return chargerImagesScript({ captures: aCharger, marque: { logo: logo ? "image" : "monogramme" } }, { idPub, stockage: s, capturer, signal });
}
