import type { Geste, ScenePub, ScriptPub } from "@weekli/core";
import { chargerPolices, creerContexte } from "../src/lib/pub/contexte";
import { creerMoteur } from "../src/lib/pub/moteur";
import { IPS } from "../src/lib/pub/scene";
import { registreScenes } from "../src/lib/pub/scenes";
import { policesRequises } from "../src/lib/pub/visuel";
import brut from "./pub-weekli.json";

// Planche des gestes (developpement uniquement) : les memes scenes avec trois jeux de gestes. Chaque
// colonne est un moteur complet ; chaque ligne montre une scene a un instant ou le geste est lisible.
// Mesure aussi le temps de dessin de chaque pub (budget : 60 ms par image).

const base = brut as unknown as ScriptPub;
const repetition: ScenePub = {
	id: "repetition",
	type: "repetition",
	voix: "",
	lignes: [
		{ texte: "Même réunion.", accent: "réunion." },
		{ texte: "Même problème.", accent: "problème." },
	],
	impact: "ENCORE.",
	carte: { titre: "Retard chantier", detail: "Problème récurrent" },
};

const JEUX: { nom: string; gestes: Geste[] }[] = [
	{ nom: "Sobre : accent, soulignement, flou", gestes: ["accent", "soulignement", "flou"] },
	{ nom: "Nerveux : impact, glitch, lettres", gestes: ["impact", "glitch", "lettres"] },
	{ nom: "Editorial : frappe, surlignage, pixels", gestes: ["frappe", "surlignage", "pixels"] },
];
// scene, instant (secondes depuis le debut de la scene) ou le geste se lit
const LIGNES: { id: string; a: (duree: number) => number }[] = [
	{ id: "ouverture", a: () => 0 }, // image zero : tout est deja pose
	{ id: "repetition", a: (d) => 0.6 * d + 0.07 }, // 2e image du mot d'impact
	{ id: "rupture", a: (d) => 0.15 * d + 0.9 },
	{ id: "revelation", a: (d) => 0.93 * d },
	{ id: "appel", a: () => 1.55 },
];

const cellule = { l: 400, h: 225 };
const marge = 8;

function script(gestes: Geste[]): ScriptPub {
	const scenes = [base.scenes.find((s) => s.id === "ouverture"), repetition, ...["rupture", "revelation", "appel"].map((id) => base.scenes.find((s) => s.id === id))] as ScenePub[];
	return { ...base, gestes, captures: [], scenes: scenes.map((s) => ({ ...s, duree: undefined })) as ScenePub[], voix: { ...base.voix, mode: "aucune" } };
}

await chargerPolices(policesRequises(base.marque.typo));
const planche = document.getElementById("planche") as HTMLCanvasElement;
planche.width = JEUX.length * (cellule.l + marge) + marge;
planche.height = LIGNES.length * (cellule.h + marge) + marge + 26;
const ctx = planche.getContext("2d") as CanvasRenderingContext2D;
ctx.fillStyle = "#111";
ctx.fillRect(0, 0, planche.width, planche.height);
ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
ctx.fillStyle = "#eee";
ctx.textBaseline = "middle";

const mesures: Record<string, { moyenne: number; max: number }> = {};
const hors = new OffscreenCanvas(1920, 1080);
const ctxHors = hors.getContext("2d") as unknown as CanvasRenderingContext2D;

JEUX.forEach((jeu, col) => {
	const s = script(jeu.gestes);
	const moteur = creerMoteur({ script: s, scenes: registreScenes(s), contexte: creerContexte(s) });
	const x = marge + col * (cellule.l + marge);
	ctx.fillText(jeu.nom, x, 14);
	LIGNES.forEach((ligne, rang) => {
		const sc = moteur.timeline.scenes.find((e) => e.id === ligne.id) as NonNullable<(typeof moteur.timeline.scenes)[number]>;
		const t = sc.debut + ligne.a(sc.duree);
		const y = 26 + marge + rang * (cellule.h + marge);
		const tuile = new OffscreenCanvas(cellule.l, cellule.h);
		moteur.dessiner(tuile.getContext("2d") as unknown as CanvasRenderingContext2D, Math.min(t, moteur.duree - 1 / IPS), cellule.l / 1920);
		ctx.drawImage(tuile, x, y);
	});
	// temps de dessin a 1920 x 1080, deuxieme passe (glyphes deja rasterises)
	const durees: number[] = [];
	for (let passe = 0; passe < 2; passe++) {
		for (let k = 0; k < moteur.images; k++) {
			const t0 = performance.now();
			moteur.dessiner(ctxHors, k / IPS, 1);
			ctxHors.getImageData(0, 0, 1, 1);
			if (passe === 1) durees.push(performance.now() - t0);
		}
	}
	mesures[jeu.nom] = { moyenne: durees.reduce((a, b) => a + b, 0) / durees.length, max: Math.max(...durees) };
});

// Posterisation douce (pas de 10) : le grain du fond rend sinon le PNG trop lourd pour le depot
function plancheGestes(): string {
	const image = ctx.getImageData(0, 0, planche.width, planche.height);
	for (let k = 0; k < image.data.length; k += 4) {
		for (let c = 0; c < 3; c++) image.data[k + c] = Math.min(255, Math.round(image.data[k + c] / 10) * 10);
	}
	ctx.putImageData(image, 0, 0);
	return planche.toDataURL("image/png");
}

Object.assign(window, { mesuresGestes: mesures, plancheGestes });
(document.getElementById("mesures") as HTMLElement).textContent = JSON.stringify(mesures, null, 2);
(document.getElementById("etat") as HTMLElement).textContent = "Pret";
