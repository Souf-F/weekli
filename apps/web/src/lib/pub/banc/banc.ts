import { assemblerAudio, creerApercu, creerMoteur, exporter, genererSonTest, genererSrt } from "../index";
import { registreDeTest } from "../scenes/test";
import { scriptDeTest } from "./script-test";

// Banc d'essai interne du moteur de pub (developpement uniquement, voir apps/web/dev/pub.html)

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const DUREE = 60;

const moteur = creerMoteur({ script: scriptDeTest(DUREE), scenes: registreDeTest() });
const audio = await assemblerAudio(moteur, { fond: await genererSonTest(moteur.duree), gainFond: 1 });
const apercu = creerApercu(el<HTMLCanvasElement>("apercu"), moteur, audio, (t) => {
	el("temps").textContent = `${t.toFixed(2)} / ${moteur.duree.toFixed(2)} s`;
	el<HTMLInputElement>("curseur").value = String(t);
});

const curseur = el<HTMLInputElement>("curseur");
curseur.max = String(moteur.duree);
el("infos").textContent = `${moteur.timeline.scenes.length} scènes, ${moteur.images} images, ${moteur.duree.toFixed(3)} s`;
curseur.addEventListener("input", () => apercu.aller(Number(curseur.value)));

const lecture = el<HTMLButtonElement>("lecture");
lecture.addEventListener("click", async () => {
	if (apercu.enLecture) await apercu.pause();
	else await apercu.lire();
	lecture.textContent = apercu.enLecture ? "Pause" : "Lecture";
});

const btnExport = el<HTMLButtonElement>("export");
const annuler = el<HTMLButtonElement>("annuler");
const etat = el("etat");
let controle: AbortController | null = null;
annuler.addEventListener("click", () => controle?.abort());

btnExport.addEventListener("click", async () => {
	controle = new AbortController();
	btnExport.disabled = true;
	annuler.hidden = false;
	etat.textContent = "Export en cours";
	try {
		const r = await exporter(moteur, audio, (p) => (etat.textContent = `Image ${p.image} / ${p.total}`), controle.signal);
		const s = r.stats;
		etat.textContent = `${r.format.extension} (${r.format.video} + ${r.format.audio}), ${s.images} images, ${(s.octets / 1e6).toFixed(1)} Mo, ${(s.tempsTotalMs / 1000).toFixed(1)} s au total, dessin moyen ${s.dessinMoyenMs.toFixed(1)} ms (p95 ${s.dessinP95Ms.toFixed(1)}, max ${s.dessinMaxMs.toFixed(1)})`;
		const lien = el<HTMLAnchorElement>("telecharger");
		lien.href = URL.createObjectURL(r.fichier);
		lien.download = `pub-test.${r.format.extension}`;
		lien.hidden = false;
		Object.assign(window, { dernierExport: r });
	} catch (err) {
		etat.textContent = err instanceof DOMException && err.name === "AbortError" ? "Export annulé" : `Erreur : ${(err as Error).message}`;
	} finally {
		btnExport.disabled = false;
		annuler.hidden = true;
	}
});

const srt = el<HTMLAnchorElement>("srt");
srt.href = URL.createObjectURL(new Blob([genererSrt(moteur) || "(pas de voix dans ce script de test)\n"], { type: "text/plain" }));
Object.assign(window, { moteurTest: moteur });
