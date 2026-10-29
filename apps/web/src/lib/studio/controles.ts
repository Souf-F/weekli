import { type ScenePub } from "@weekli/core";
import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import { FREQUENCE } from "../pub/audio";
import type { Moteur } from "../pub/moteur";
import { HAUTEUR, IPS, LARGEUR } from "../pub/scene";

// Controles finaux apres l'export (design.md 8.16). Un echec bloque le telechargement du MP4 et en donne la cause.
export type Controle = { id: string; libelle: string; ok: boolean; detail: string };
export type Rapport = { controles: Controle[]; ok: boolean; planche: Blob | null };

export const SEUIL_CRETE_DBTP = -1.5;
const SEUIL_LUMINANCE = 0.02;
const COTE_ANALYSE = 0.1; // echelle du dessin des images de controle (192 x 108)

const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));
const cede = () => new Promise<void>((ok) => setTimeout(ok, 0));

// Crete vraie estimee : suréchantillonnage x4 par interpolation de Catmull-Rom autour des echantillons forts
export function creteVraieDb(canaux: readonly Float32Array[]): number {
	let crete = 0;
	for (const x of canaux) {
		for (let i = 1; i < x.length - 2; i++) {
			const p1 = x[i];
			const a = Math.abs(p1);
			if (a > crete) crete = a;
			if (a < 0.4 && Math.abs(x[i + 1]) < 0.4) continue;
			const p0 = x[i - 1];
			const p2 = x[i + 1];
			const p3 = x[i + 2];
			for (let k = 1; k < 4; k++) {
				const t = k / 4;
				const v = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
				if (Math.abs(v) > crete) crete = Math.abs(v);
			}
		}
	}
	return db(crete);
}

const luminanceHex = (hex: string) => {
	const n = Number.parseInt(hex.slice(1), 16);
	return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

function luminanceMoyenne(ctx: OffscreenCanvasRenderingContext2D, l: number, h: number): number {
	const d = ctx.getImageData(0, 0, l, h).data;
	let somme = 0;
	for (let i = 0; i < d.length; i += 4) somme += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
	return somme / (d.length / 4) / 255;
}

// Cherche les images quasi noires hors du fond sombre de la marque : une image sur deux, au pas de 2/IPS
async function chercherNoirs(moteur: Moteur, signal?: AbortSignal): Promise<number[]> {
	const l = Math.round(LARGEUR * COTE_ANALYSE);
	const h = Math.round(HAUTEUR * COTE_ANALYSE);
	const toile = new OffscreenCanvas(l, h);
	const ctx = toile.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
	const plancher = Math.min(SEUIL_LUMINANCE, luminanceHex(moteur.palette.sombre) * 0.5);
	const noirs: number[] = [];
	for (let i = 0; i < moteur.images; i += 2) {
		signal?.throwIfAborted();
		const t = Math.min(i / IPS, moteur.duree - 1e-3);
		moteur.dessiner(ctx as unknown as CanvasRenderingContext2D, t, COTE_ANALYSE);
		if (luminanceMoyenne(ctx, l, h) < plancher) noirs.push(+t.toFixed(2));
		if (i % 40 === 0) await cede();
	}
	return noirs;
}

async function pixels(source: CanvasImageSource, l: number, h: number): Promise<Uint8ClampedArray> {
	const toile = new OffscreenCanvas(l, h);
	const ctx = toile.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
	ctx.drawImage(source, 0, 0, l, h);
	return ctx.getImageData(0, 0, l, h).data;
}

// Ecart moyen par canal (sur 255) toleré entre la premiere image du MP4 (H.264, avec pertes) et la miniature PNG
const ECART_IMAGE_ZERO = 3;

// La premiere image decodee du fichier exporte doit etre celle de la miniature (a la perte de compression pres)
async function imageZeroIdentique(fichier: Blob, miniature: Blob): Promise<{ ok: boolean; ecart: number }> {
	const entree = new Input({ source: new BlobSource(fichier), formats: ALL_FORMATS });
	try {
		const video = await entree.getPrimaryVideoTrack();
		const premiere = video ? await new CanvasSink(video, { width: LARGEUR, height: HAUTEUR, fit: "fill" }).getCanvas(0) : null;
		if (!premiere) return { ok: false, ecart: Number.NaN };
		const image = await createImageBitmap(miniature);
		const a = await pixels(premiere.canvas, LARGEUR, HAUTEUR);
		const b = await pixels(image, LARGEUR, HAUTEUR);
		image.close();
		let somme = 0;
		for (let i = 0; i < a.length; i++) if (i % 4 !== 3) somme += Math.abs(a[i] - b[i]);
		const ecart = somme / ((a.length / 4) * 3);
		return { ok: ecart <= ECART_IMAGE_ZERO, ecart };
	} finally {
		entree.dispose();
	}
}

// Duree et pistes du fichier reellement ecrit
async function lireFichier(fichier: Blob) {
	const entree = new Input({ source: new BlobSource(fichier), formats: ALL_FORMATS });
	try {
		const video = await entree.getPrimaryVideoTrack();
		const audio = await entree.getPrimaryAudioTrack();
		return {
			duree: video ? await video.computeDuration() : 0,
			dureeAudio: audio ? await audio.computeDuration() : 0,
			largeur: video?.displayWidth ?? 0,
			hauteur: video?.displayHeight ?? 0,
			audio: !!audio,
		};
	} finally {
		entree.dispose();
	}
}

// Scenes dont le contenu est illustratif (cartes, listes, frises, tampons, bulles) : jamais une demonstration reelle
const illustrative = (s: ScenePub) => !["ouverture", "rupture", "revelation", "appel", "fin"].includes(s.type) && !(s.type === "etape" && s.visuel.type === "capture");

// Planche de relecture : une image a chaque milieu de transition et deux par scene (t0 + 0,2 s et t1 - 0,2 s)
export async function planche(moteur: Moteur): Promise<Blob> {
	const { scenes } = moteur.timeline;
	const reperes: { t: number; legende: string; illustration: boolean }[] = [];
	for (const s of scenes) {
		const sc = moteur.script.scenes[s.index];
		const note = illustrative(sc);
		if (s.chevauchement > 0) reperes.push({ t: s.debut + s.chevauchement / 2, legende: `${s.id} · raccord`, illustration: note });
		reperes.push({ t: s.debut + 0.2, legende: `${s.id} · début`, illustration: note });
		reperes.push({ t: s.fin - 0.2, legende: `${s.id} · fin`, illustration: note });
	}
	const colonnes = 4;
	const w = 320;
	const h = 180;
	const marge = 12;
	const bandeau = 22;
	const lignes = Math.ceil(reperes.length / colonnes);
	const sortie = new OffscreenCanvas(colonnes * (w + marge) + marge, lignes * (h + bandeau + marge) + marge);
	const g = sortie.getContext("2d") as OffscreenCanvasRenderingContext2D;
	g.fillStyle = "#2a1c13";
	g.fillRect(0, 0, sortie.width, sortie.height);
	const tuile = new OffscreenCanvas(w, h);
	const gt = tuile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	g.font = "12px sans-serif";
	g.textBaseline = "middle";
	for (const [i, r] of reperes.entries()) {
		const x = marge + (i % colonnes) * (w + marge);
		const y = marge + Math.floor(i / colonnes) * (h + bandeau + marge);
		moteur.dessiner(gt as unknown as CanvasRenderingContext2D, Math.min(Math.max(r.t, 0), moteur.duree - 1e-3), w / LARGEUR);
		g.drawImage(tuile, x, y);
		g.fillStyle = "#e5e4e2";
		g.fillText(`${r.legende} · ${r.t.toFixed(1)} s`, x, y + h + bandeau / 2);
		if (r.illustration) {
			const texte = "Illustration";
			g.fillStyle = "rgba(42, 28, 19, 0.78)";
			g.fillRect(x + w - 74, y + h - 20, 70, 16);
			g.fillStyle = "#e5e4e2";
			g.fillText(texte, x + w - 70, y + h - 12);
		}
		if (i % 6 === 5) await cede();
	}
	return sortie.convertToBlob({ type: "image/png" });
}

export type EntreeControles = {
	moteur: Moteur;
	fichier: Blob;
	miniature: Blob;
	audio: AudioBuffer | null;
	signal?: AbortSignal;
};

export async function controler({ moteur, fichier, miniature, audio, signal }: EntreeControles): Promise<Rapport> {
	const controles: Controle[] = [];
	const ajouter = (id: string, libelle: string, ok: boolean, detail: string) => controles.push({ id, libelle, ok, detail });

	const lu = await lireFichier(fichier);
	const attendue = moteur.images / IPS;
	ajouter(
		"duree",
		"Durée de la vidéo",
		Math.abs(lu.duree - attendue) <= 1 / IPS + 1e-3,
		`${lu.duree.toFixed(2)} s dans le fichier, ${attendue.toFixed(2)} s prévues`,
	);
	ajouter("format", "Dimensions et pistes", lu.largeur === LARGEUR && lu.hauteur === HAUTEUR && lu.audio === !!audio, `${lu.largeur} × ${lu.hauteur}, ${lu.audio ? "avec" : "sans"} piste audio`);

	if (audio) {
		const dureeAudio = audio.length / FREQUENCE;
		// Le conteneur ajoute le remplissage du dernier paquet AAC (moins de 2 images) : la piste mixee, elle, a la longueur exacte
		ajouter("audio", "Audio et vidéo de même durée", Math.abs(dureeAudio - attendue) <= 1 / IPS + 1e-3 && Math.abs(lu.dureeAudio - lu.duree) <= 2 / IPS, `${dureeAudio.toFixed(2)} s d'audio mixé, ${lu.dureeAudio.toFixed(2)} s de piste, ${lu.duree.toFixed(2)} s de vidéo`);
		const crete = creteVraieDb([audio.getChannelData(0), audio.getChannelData(1)]);
		ajouter("crete", "Crête vraie du son", crete < SEUIL_CRETE_DBTP, `${crete.toFixed(1)} dBTP estimés, limite ${SEUIL_CRETE_DBTP} dBTP`);
	}

	const noirs = await chercherNoirs(moteur, signal);
	ajouter("noirs", "Aucun noir involontaire", noirs.length === 0, noirs.length ? `Image quasi noire à ${noirs.slice(0, 3).join(" s, ")} s` : "Aucune image quasi noire");

	const zero = await imageZeroIdentique(fichier, miniature);
	ajouter("zero", "Image zéro identique à la miniature", zero.ok, Number.isNaN(zero.ecart) ? "Première image illisible dans le fichier" : `Écart moyen de ${zero.ecart.toFixed(2)} sur 255 entre la vidéo et le PNG`);

	return { controles, ok: controles.every((c) => c.ok), planche: await planche(moteur) };
}
