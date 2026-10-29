import type { ScriptPub } from "@weekli/core";
import { composerAudio, importerVoix } from "../src/lib/pub/audio/index";
import { chargerPolices, creerContexte } from "../src/lib/pub/contexte";
import { exporter } from "../src/lib/pub/export";
import { creerMoteur } from "../src/lib/pub/moteur";
import { registreScenes } from "../src/lib/pub/scenes";
import { policesRequises } from "../src/lib/pub/visuel";
import brut from "./pub-weekli.json";

// Rendu de la pub de Weekli (developpement uniquement). Les voix (MP3 Vivienne) et les captures sont servies
// par un petit recepteur local ; le MP4 et la miniature y sont renvoyes en POST.
const RECEPTEUR = "http://127.0.0.1:5195";
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const etat = el("etat");

async function rendre() {
	const script = { ...(brut as unknown as ScriptPub), voix: { ...(brut as unknown as ScriptPub).voix, mode: "importee" as const } };
	etat.textContent = "Polices";
	await chargerPolices(policesRequises(script.marque.typo));

	const images = new Map<string, ImageBitmap>();
	for (const c of script.captures) images.set(c.id, await createImageBitmap(await (await fetch(`${RECEPTEUR}/img/${c.id}.png`)).blob()));

	etat.textContent = "Voix";
	const fichiers: Record<string, Blob> = {};
	for (const s of script.scenes) fichiers[s.id] = await (await fetch(`${RECEPTEUR}/voix/${s.id}.mp3`)).blob();
	const voix = await importerVoix(fichiers);

	const moteur = creerMoteur({ script, scenes: registreScenes(script), voixMesurees: voix.durees, contexte: creerContexte(script, { images }) });
	const apercu = el<HTMLCanvasElement>("apercu").getContext("2d") as CanvasRenderingContext2D;
	moteur.dessiner(apercu, 0, 0.5);

	// Miniature : image zero complete, 1920 x 1080
	const toile = new OffscreenCanvas(1920, 1080);
	moteur.dessiner(toile.getContext("2d") as unknown as CanvasRenderingContext2D, 0, 1);
	const miniature = await toile.convertToBlob({ type: "image/png" });
	await fetch(`${RECEPTEUR}/out/weekli-pub.png`, { method: "POST", body: miniature });

	etat.textContent = "Mixage";
	const { audio, mesures, avertissements } = await composerAudio(moteur, { voix });
	const r = await exporter(moteur, audio, (p) => (etat.textContent = `Image ${p.image}/${p.total}`));
	await fetch(`${RECEPTEUR}/out/weekli-pub.${r.format.extension}`, { method: "POST", body: r.fichier });
	const lien = el<HTMLAnchorElement>("telecharger");
	lien.href = URL.createObjectURL(r.fichier);
	lien.download = `weekli-pub.${r.format.extension}`;
	lien.hidden = false;

	const resume = {
		duree: moteur.duree,
		images: moteur.images,
		format: `${r.format.video} + ${r.format.audio}`,
		octets: r.stats.octets,
		voix: voix.etat,
		scenes: moteur.timeline.scenes.map((x) => ({ id: x.id, debut: +x.debut.toFixed(2), duree: +x.duree.toFixed(2) })),
		mesures,
		avertissements,
	};
	el("resultat").textContent = JSON.stringify(resume, null, 2);
	etat.textContent = "Terminé";
	return resume;
}

el("rendre").addEventListener("click", () => {
	rendre().catch((err: Error) => (etat.textContent = `Erreur : ${err.message}`));
});
Object.assign(window, { rendrePub: rendre });
