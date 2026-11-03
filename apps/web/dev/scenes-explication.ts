import { ICONES, type ScenePub, type ScriptPub } from "@weekli/core";
import weekli from "./pub-weekli.json";
import { chargerPolices, creerContexte } from "../src/lib/pub/contexte";
import { creerMoteur, type Moteur } from "../src/lib/pub/moteur";
import { type Ctx2D, HAUTEUR, LARGEUR } from "../src/lib/pub/scene";
import { registreScenes } from "../src/lib/pub/scenes";
import { registreDeTest } from "../src/lib/pub/scenes/test";
import { dessinerFondClair, policesRequises } from "../src/lib/pub/visuel";
import { dessinerIcone } from "../src/lib/pub/visuel/icones";

// Banc des scenes d'explication (F15, developpement uniquement) : les trois scenes de la pub de
// Weekli (palette cafe), lecture, temps de dessin maximal a 1920 x 1080, textes coupes, planche.

const source = weekli as unknown as ScriptPub;
const TYPES = new Set(["transformation", "flux", "avantapres"]);
const m = (texte: string, accent?: string) => ({ texte, accent });

// Cas limites : chaque champ a sa longueur maximale (design.md 8.17)
const LIMITES: ScenePub[] = [
	{ id: "l-t", type: "transformation", voix: "", duree: 4.5, titre: m("Ta semaine de code devient enfin un vrai récit.", "un vrai récit."), entree: { icone: "dossier", libelle: "Toute ta semaine dev" }, operateur: "Weekli studio.", sortie: { icone: "musique", libelle: "Post, pub et voix ok" }, texte: "Tu donnes tes commits, Weekli en tire une histoire courte, lisible et prête à partager le soir même." },
	{ id: "l-f", type: "flux", voix: "", duree: 5, titre: m("Deux minutes chrono, trois gestes tout simples.", "trois gestes"), noeuds: [{ icone: "lien", libelle: "Tu ajoutes Weekl", detail: "Une seule fois, sans installer" }, { icone: "message", libelle: "Tu réponds vite", detail: "Trois questions, pas plus, ok" }, { icone: "video", libelle: "Tu reçois ta pub", detail: "Post, pub vidéo et voix off ok" }] },
	{ id: "l-a", type: "avantapres", voix: "", duree: 4.5, titre: m("Avant le dimanche soir, puis après Weekli.", "puis après Weekli."), avant: "Sans Weekli", apres: "Avec Weekli", paires: [{ avant: "Une voix off à enregistrer", apres: "Une voix off déjà enregistrée" }, { avant: "Un post à écrire en entier", apres: "Un post prêt à publier ce soir" }, { avant: "Une pub vidéo à monter seul", apres: "Une pub vidéo déjà montée" }] },
];

const scriptDe = (scenes: ScenePub[]): ScriptPub => ({ ...source, scenes });

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const apercu = $<HTMLCanvasElement>("apercu");
const curseur = $<HTMLInputElement>("curseur");
const etat = $<HTMLParagraphElement>("etat");
const coupes: string[] = [];
let moteur: Moteur;

const surCoupe = (id: string, texte: string) => {
	coupes.push(`${id} : ${texte}`);
	$<HTMLParagraphElement>("coupes").textContent = `Textes coupés : ${coupes.join(" | ")}`;
};

function creer(scenes: ScenePub[]) {
	const script = scriptDe(scenes);
	return creerMoteur({ script, scenes: { ...registreDeTest(), ...registreScenes(script, { surCoupe }) }, contexte: creerContexte(script) });
}

function tempsDe(mo: Moteur, id: string, s: number) {
	const sc = mo.timeline.scenes.find((x) => x.id === id);
	if (!sc) throw new Error(`Scene inconnue : ${id}`);
	return sc.debut + Math.min(s, sc.duree - 1 / 60);
}

function dessinerApercu() {
	moteur.dessiner(apercu.getContext("2d") as Ctx2D, Number(curseur.value), apercu.width / LARGEUR);
	$<HTMLSpanElement>("temps").textContent = `${Number(curseur.value).toFixed(2)} s`;
}

let lecture = 0;
function lire() {
	if (lecture) {
		cancelAnimationFrame(lecture);
		lecture = 0;
		return;
	}
	let origine = performance.now() - Number(curseur.value) * 1000;
	const pas = (maintenant: number) => {
		let t = (maintenant - origine) / 1000;
		if (t >= moteur.duree) {
			origine = maintenant;
			t = 0;
		}
		curseur.value = String(t);
		dessinerApercu();
		lecture = requestAnimationFrame(pas);
	};
	lecture = requestAnimationFrame(pas);
}

// Temps de dessin maximal par image (seconde passe, GPU synchronise par la lecture d'un pixel)
function mesurer() {
	const ctx = new OffscreenCanvas(LARGEUR, HAUTEUR).getContext("2d") as OffscreenCanvasRenderingContext2D;
	let max = 0;
	let somme = 0;
	for (const mesure of [false, true]) {
		for (let image = 0; image < moteur.images; image++) {
			const debut = performance.now();
			moteur.dessiner(ctx, image / 30, 1);
			ctx.getImageData(0, 0, 1, 1);
			const d = performance.now() - debut;
			if (mesure) {
				max = Math.max(max, d);
				somme += d;
			}
		}
	}
	const resultat = { max: Number(max.toFixed(1)), moyenne: Number((somme / moteur.images).toFixed(1)), images: moteur.images };
	etat.textContent = `Dessin : max ${resultat.max} ms, moyenne ${resultat.moyenne} ms sur ${resultat.images} images.`;
	return resultat;
}

// Planche : 4 instants par scene (480 x 270), puis les 28 icones
const INSTANTS: [string, number[]][] = [
	["transformation", [1.0, 1.9, 2.4, 4.4]],
	["flux", [1.25, 2.3, 3.0, 4.9]],
	["avantapres", [1.5, 2.3, 2.55, 4.4]],
];
async function planche(adresse?: string) {
	const L = 480;
	const H = 270;
	const lignes = INSTANTS.length + 2;
	const toile = new OffscreenCanvas(L * 4, H * lignes);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const limites = creer(LIMITES);
	// le moteur pose sa propre transformation : chaque vignette passe par une toile de travail
	const vignette = new OffscreenCanvas(L, H);
	const cv = vignette.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const poser = (mo: Moteur, t: number, x: number, y: number) => {
		mo.dessiner(cv, t, L / LARGEUR);
		ctx.drawImage(vignette, x, y);
	};
	INSTANTS.forEach(([id, instants], r) => instants.forEach((s, k) => poser(moteur, tempsDe(moteur, id, s), k * L, r * H)));
	// cas limites, image fixe de fin
	LIMITES.forEach((sc, k) => poser(limites, tempsDe(limites, sc.id, 4.4), k * L, INSTANTS.length * H));
	ctx.save();
	ctx.translate(3 * L, INSTANTS.length * H);
	ctx.fillStyle = "#111";
	ctx.fillRect(0, 0, L, H);
	ctx.restore();
	// icones : 2 rangees de 14 sur le fond clair
	const p = moteur.contexte.palette;
	ctx.save();
	ctx.translate(0, (lignes - 1) * H);
	ctx.scale((L * 4) / LARGEUR, (L * 4) / LARGEUR);
	ctx.beginPath();
	ctx.rect(0, 0, LARGEUR, (H * LARGEUR) / (L * 4));
	ctx.clip();
	dessinerFondClair(ctx, p, { secondes: 0, temps: 0, graine: 7, carres: false });
	ICONES.forEach((nom, n) => {
		const cx = 68 + (n % 14) * 137;
		const cy = 70 + Math.floor(n / 14) * 140;
		ctx.fillStyle = p.surface;
		ctx.beginPath();
		ctx.roundRect(cx - 60, cy - 60, 120, 120, 28);
		ctx.fill();
		dessinerIcone(ctx, nom, cx, cy, 96, { couleur: p.encre, accent: p.accentClair });
	});
	ctx.restore();
	const blob = await toile.convertToBlob({ type: "image/png" });
	if (adresse) {
		const r = await fetch(`${adresse}/scenes-f15.png`, { method: "POST", body: blob });
		if (!r.ok) throw new Error(`Recepteur : ${r.status}`);
	}
	etat.textContent = `Planche : ${toile.width} x ${toile.height}, ${(blob.size / 1024).toFixed(0)} Ko.`;
	return blob.size;
}

async function demarrer() {
	await chargerPolices(policesRequises(source.marque.typo));
	moteur = creer(source.scenes.filter((s) => TYPES.has(s.type)));
	// image fixe de fin des cas limites : remonte les textes coupes
	const limites = creer(LIMITES);
	const ctx = new OffscreenCanvas(LARGEUR, HAUTEUR).getContext("2d") as Ctx2D;
	for (const sc of limites.timeline.scenes) limites.dessiner(ctx, sc.fin - 1 / 60, 1);
	apercu.width = 960;
	apercu.height = 540;
	curseur.max = String(moteur.duree);
	dessinerApercu();
	etat.textContent = `Prêt : ${moteur.duree.toFixed(2)} s. Coupes : ${coupes.length}.`;
	for (const b of document.querySelectorAll("button")) b.disabled = false;
}

curseur.addEventListener("input", dessinerApercu);
$("lecture").addEventListener("click", lire);
$("mesurer").addEventListener("click", () => setTimeout(mesurer, 30));
$("planche").addEventListener("click", () => {
	planche($<HTMLInputElement>("recepteur").value).catch((e: unknown) => {
		etat.textContent = `Échec de l'envoi : ${e instanceof Error ? e.message : String(e)}`;
	});
});
Object.assign(window, { banc: { mesurer, planche, coupes } });

demarrer().catch((e: unknown) => {
	etat.textContent = `Erreur : ${e instanceof Error ? e.message : String(e)}`;
});
