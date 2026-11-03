import type { CaptureRef, ScriptPub } from "@weekli/core";
import { api } from "../../api";
import { cleMedia, type Stockage } from "./stockage";
import { detecterTypeImage, type TypeImage } from "./type-image";

// Chargement des images d'une pub vers `contexte.images`. Seule une capture de site (source "site")
// part vers le serveur, via /api/captures. Les images importees et le logo restent en local.

export const IMAGE_MAX_OCTETS = 8 * 1024 * 1024;
export const LOGO_MAX_OCTETS = 512 * 1024; // design.md 8.11
export const COTE_MAX_IMAGE = 2560; // pixels : au-dela, l'image est reduite au decodage
export const ID_LOGO = "logo";

export class ErreurImage extends Error {}

const TYPES_IMAGE: TypeImage[] = ["image/png", "image/jpeg", "image/webp"];

async function typeValide(blob: Blob, logo: boolean): Promise<TypeImage> {
	const max = logo ? LOGO_MAX_OCTETS : IMAGE_MAX_OCTETS;
	if (blob.size === 0) throw new ErreurImage("Fichier vide");
	if (blob.size > max) throw new ErreurImage(`Fichier trop lourd (${Math.round(max / 1024)} Ko maximum)`);
	const type = detecterTypeImage(new Uint8Array(await blob.slice(0, 1024).arrayBuffer()));
	if (!type || (type === "image/svg+xml" && !logo) || (!logo && !TYPES_IMAGE.includes(type))) {
		throw new ErreurImage(logo ? "Format accepté : SVG, PNG ou WebP" : "Format accepté : PNG, JPEG ou WebP");
	}
	if (logo && type === "image/jpeg") throw new ErreurImage("Format accepté : SVG, PNG ou WebP");
	return type;
}

// Un SVG se rastérise via <img> (jamais injecte dans la page : aucun script ne s'execute)
async function rasteriserSvg(blob: Blob): Promise<ImageBitmap> {
	const url = URL.createObjectURL(new Blob([blob], { type: "image/svg+xml" }));
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		const base = Math.max(img.naturalWidth, img.naturalHeight) || 512;
		const echelle = 512 / base;
		const l = Math.max(1, Math.round((img.naturalWidth || 512) * echelle));
		const h = Math.max(1, Math.round((img.naturalHeight || 512) * echelle));
		const toile = new OffscreenCanvas(l, h);
		toile.getContext("2d")?.drawImage(img, 0, 0, l, h);
		return await createImageBitmap(toile);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export async function decoderImage(blob: Blob, logo = false): Promise<ImageBitmap> {
	const type = await typeValide(blob, logo);
	try {
		if (type === "image/svg+xml") return await rasteriserSvg(blob);
		const brut = await createImageBitmap(blob);
		const plusGrand = Math.max(brut.width, brut.height);
		if (plusGrand <= COTE_MAX_IMAGE) return brut;
		const e = COTE_MAX_IMAGE / plusGrand;
		const reduit = await createImageBitmap(brut, { resizeWidth: Math.round(brut.width * e), resizeHeight: Math.round(brut.height * e), resizeQuality: "high" });
		brut.close();
		return reduit;
	} catch (err) {
		if (err instanceof ErreurImage) throw err;
		throw new ErreurImage("Image illisible ou corrompue");
	}
}

// Importe un fichier choisi par l'utilisateur : valide, stocke dans IndexedDB, renvoie l'image decodee
export async function importerImage(stockage: Stockage, idPub: string, id: string, fichier: File): Promise<ImageBitmap> {
	const logo = id === ID_LOGO;
	const bitmap = await decoderImage(fichier, logo);
	await stockage.enregistrer(cleMedia(idPub, id), logo ? "logo" : "image", fichier.name, fichier);
	return bitmap;
}

export type Capturer = (url: string, format: "bureau" | "mobile") => Promise<Blob>;

export type ResultatChargement = {
	images: Map<string, ImageBitmap>;
	manquantes: { id: string; raison: string }[]; // a signaler dans l'editeur (monogramme, liste vide...)
};

async function chargerUne(ref: CaptureRef, idPub: string, stockage: Stockage, capturer: Capturer): Promise<ImageBitmap> {
	if (ref.source === "importee") {
		const media = await stockage.lire(cleMedia(idPub, ref.id));
		if (!media) throw new ErreurImage("Image absente de cet appareil, à réimporter");
		return decoderImage(media.blob);
	}
	if (!ref.url) throw new ErreurImage("Adresse de la capture manquante");
	return decoderImage(await capturer(ref.url, ref.format));
}

// Charge les captures du script et le logo. Les echecs ne bloquent pas : l'image est listee dans `manquantes`.
// Les captures de site partent une par une (limite du serveur : 5 par minute).
export async function chargerImagesScript(
	script: { captures: CaptureRef[]; marque: Pick<ScriptPub["marque"], "logo"> },
	options: { idPub: string; stockage: Stockage; capturer?: Capturer; signal?: AbortSignal },
): Promise<ResultatChargement> {
	const capturer = options.capturer ?? api.capturer;
	const images = new Map<string, ImageBitmap>();
	const manquantes: ResultatChargement["manquantes"] = [];
	const essayer = async (id: string, charger: () => Promise<ImageBitmap>) => {
		options.signal?.throwIfAborted();
		try {
			images.set(id, await charger());
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") throw err;
			manquantes.push({ id, raison: err instanceof Error ? err.message : "Chargement impossible" });
		}
	};
	for (const ref of script.captures) await essayer(ref.id, () => chargerUne(ref, options.idPub, options.stockage, capturer));
	if (script.marque.logo === "image") {
		await essayer(ID_LOGO, async () => {
			const media = await options.stockage.lire(cleMedia(options.idPub, ID_LOGO));
			if (!media) throw new ErreurImage("Logo absent de cet appareil : le monogramme est utilisé");
			return decoderImage(media.blob, true);
		});
	}
	return { images, manquantes };
}
