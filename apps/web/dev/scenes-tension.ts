import type { ScenePub, ScriptPub } from "@weekli/core";
import { chargerPolices, creerContexte } from "../src/lib/pub/contexte";
import { creerMoteur, type Moteur } from "../src/lib/pub/moteur";
import { HAUTEUR, IPS, LARGEUR } from "../src/lib/pub/scene";
import { registreDeTest } from "../src/lib/pub/scenes/test";
import { registreTension } from "../src/lib/pub/scenes/tension";
import { policesRequises } from "../src/lib/pub/visuel";

// Banc des scenes de tension (developpement uniquement). Les durees reprennent le decoupage de la
// reference Stepwize (0 a 22 s) : a un temps donne, la video de reference et le rendu montrent le
// meme moment, cote a cote. La video n'est pas dans le depot : elle se charge depuis le disque.

const DUREES = { ouverture: 1.85, repetition: 4.05, boucle: 4.2, chorus: 3.3, rupture: 4.3, revelation: 6 };
// instants compares (secondes de la reference)
const INSTANTS = [1.0, 1.5, 2.5, 4.0, 4.5, 5.0, 6.5, 8.5, 10.5, 11.5, 14.0, 15.5, 17.0, 17.5, 19.5, 21.0];

const commune = { voix: "" };
const scenesCourtes: ScenePub[] = [
	{ ...commune, id: "ouverture", type: "ouverture", moment: "Lundi", detail: "matin · 09:00" },
	{
		...commune,
		id: "repetition",
		type: "repetition",
		lignes: [
			{ texte: "Même réunion.", accent: "réunion." },
			{ texte: "Même problème.", accent: "problème." },
		],
		impact: "ENCORE.",
		carte: { titre: "Retard chantier", detail: "Problème récurrent" },
	},
	{
		...commune,
		id: "boucle",
		type: "boucle",
		phrase: { texte: "Semaine après semaine, le même sujet revient.", accent: "revient." },
		reperes: ["Semaine 41", "Semaine 45", "Semaine 49"],
		carte: { titre: "Retard chantier", detail: "Problème récurrent" },
	},
	{
		...commune,
		id: "chorus",
		type: "chorus",
		titre: { texte: "Tout le monde en parle.", accent: "en parle." },
		chute: { texte: "Personne ne le règle.", accent: "le règle." },
		bulles: ["On fait quoi ?", "On en reparle lundi.", "Encore ce sujet ?", "On attend le retour.", "Qui s'en occupe ?", "Il faut relancer."],
	},
	{ ...commune, id: "rupture", type: "rupture", texte: { texte: "Et si quelqu'un s'en occupait, pour de vrai ?", accent: "pour de vrai ?" } },
	{ ...commune, id: "revelation", type: "revelation", slogan: { texte: "On prend en charge vos problèmes qui reviennent.", accent: "qui reviennent." }, signature: "Jusqu'au résultat." },
];

// Textes aux longueurs maximales du contrat (api-contract.md 2.1), lettres larges
const scenesLongues: ScenePub[] = [
	{ ...commune, id: "ouverture", type: "ouverture", moment: "Mercredi soir.", detail: "Week-end · 23:45 · encore ici" },
	{
		...commune,
		id: "repetition",
		type: "repetition",
		lignes: [
			{ texte: "Même commande mal enregistrée.", accent: "mal enregistrée." },
			{ texte: "Même client mécontent au mur.", accent: "mécontent" },
			{ texte: "Même message vocal manqué.", accent: "manqué." },
		],
		impact: "INSUPPORTABLE.",
		carte: { titre: "Commande numéro 4821 bloquée", detail: "Relance client sans réponse depuis lundi" },
	},
	{
		...commune,
		id: "boucle",
		type: "boucle",
		phrase: { texte: "Mois après mois, la même commande bloquée revient dans la boîte mail.", accent: "revient dans la boîte mail." },
		reperes: ["Novembre 2026", "Décembre 2026", "Janvier 2027", "Février 2027"],
		carte: { titre: "Commande numéro 4821 bloquée", detail: "Relance client sans réponse depuis lundi" },
	},
	{
		...commune,
		id: "chorus",
		type: "chorus",
		titre: { texte: "Tout le monde en parle pendant la pause café.", accent: "pause café." },
		chute: { texte: "Mais personne ne prend le dossier en main.", accent: "le dossier en main." },
		bulles: ["Quelqu'un a rappelé le client ?", "Je regarde ça demain matin.", "C'est pas mon périmètre.", "On en reparle en réunion.", "Il faudrait un responsable.", "Qui a le mot de passe ?"],
	},
	{ ...commune, id: "rupture", type: "rupture", texte: { texte: "Et si chaque commande bloquée trouvait enfin quelqu'un pour la débloquer ?", accent: "pour la débloquer ?" } },
	{
		...commune,
		id: "revelation",
		type: "revelation",
		slogan: { texte: "Vos commandes bloquées repartent seules, sans relance ni stress.", accent: "sans relance ni stress." },
		signature: "Moins d'appels, plus de ventes.",
	},
];

const avecDurees = (scenes: ScenePub[]) => scenes.map((s) => ({ ...s, duree: DUREES[s.type as keyof typeof DUREES] }));

function script(long: boolean, logo: boolean): ScriptPub {
	return {
		version: 1,
		titre: "Banc tension",
		projet: { nom: long ? "Commandes Sans Souci Pro" : "Relance", repo: "relance", lien: "https://relance.example" },
		reponses: { pourQui: "", probleme: "", promesse: "" },
		marque: { primaire: "#3d4bff", logo: logo ? "image" : "monogramme", monogramme: long ? "CS" : "R", typo: "nette" },
		voix: { mode: "aucune", vitesse: 1, prononciation: {} },
		musique: "aucune",
		captures: [],
		scenes: avecDurees(long ? scenesLongues : scenesCourtes),
	};
}

// Logo importe de test : dessine localement (anneau et carre), fond transparent
async function logoDeTest(): Promise<ImageBitmap> {
	const t = new OffscreenCanvas(256, 256);
	const c = t.getContext("2d") as OffscreenCanvasRenderingContext2D;
	c.fillStyle = "#ffffff";
	c.beginPath();
	c.arc(128, 128, 120, 0, Math.PI * 2);
	c.arc(128, 128, 70, 0, Math.PI * 2, true);
	c.fill();
	c.fillRect(104, 104, 48, 48);
	return createImageBitmap(t);
}

// --- interface -----------------------------------------------------------------------------------

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>("apercu");
canvas.width = LARGEUR / 2;
canvas.height = HAUTEUR / 2;
const ctxApercu = canvas.getContext("2d") as CanvasRenderingContext2D;
const video = el<HTMLVideoElement>("reference");
const curseur = el<HTMLInputElement>("curseur");
const etat = el("etat");
let position = 0;
let lecture = 0;
let moteur: Moteur;
let logo: ImageBitmap | null = null;

function construire() {
	const long = el<HTMLInputElement>("long").checked;
	const avecLogo = el<HTMLInputElement>("logo").checked;
	const s = script(long, avecLogo);
	const images = new Map<string, ImageBitmap>();
	if (avecLogo && logo) images.set("logo", logo);
	moteur = creerMoteur({ script: s, scenes: { ...registreDeTest(), ...registreTension(s) }, contexte: creerContexte(s, { images }) });
	curseur.max = String(moteur.duree);
	el("infos").textContent = `${s.scenes.length} scènes, ${moteur.duree.toFixed(2)} s, ${moteur.images} images ; ${moteur.timeline.scenes.map((x) => `${x.type} ${x.debut.toFixed(2)}`).join(", ")}`;
}

function montrer(t: number, suivreVideo = true) {
	position = Math.min(Math.max(t, 0), moteur.duree - 1 / IPS);
	moteur.dessiner(ctxApercu, position, 0.5);
	curseur.value = String(position);
	el("temps").textContent = `${position.toFixed(2)} / ${moteur.duree.toFixed(2)} s`;
	if (suivreVideo && video.src && Math.abs(video.currentTime - position) > 0.02) video.currentTime = position;
}

await chargerPolices(policesRequises("nette"));
logo = await logoDeTest();
construire();
curseur.addEventListener("input", () => montrer(Number(curseur.value)));
for (const id of ["long", "logo"]) {
	el(id).addEventListener("change", () => {
		construire();
		montrer(position);
	});
}
el<HTMLInputElement>("fichier").addEventListener("change", (e) => {
	const f = (e.target as HTMLInputElement).files?.[0];
	if (!f) return;
	video.src = URL.createObjectURL(f);
	video.addEventListener("loadeddata", () => montrer(position), { once: true });
});
for (const t of INSTANTS) {
	const b = document.createElement("button");
	b.type = "button";
	b.textContent = `${t.toFixed(1)} s`;
	b.addEventListener("click", () => montrer(t));
	el("instants").append(b);
}

const btnLecture = el<HTMLButtonElement>("lecture");
btnLecture.addEventListener("click", () => {
	if (lecture) {
		cancelAnimationFrame(lecture);
		lecture = 0;
		video.pause();
		btnLecture.textContent = "Lecture";
		return;
	}
	const origine = performance.now() / 1000 - position;
	if (video.src) void video.play().catch(() => undefined);
	const boucle = () => {
		montrer(performance.now() / 1000 - origine, false);
		lecture = position >= moteur.duree - 1 / IPS ? 0 : requestAnimationFrame(boucle);
		if (!lecture) {
			btnLecture.textContent = "Lecture";
			video.pause();
		}
	};
	btnLecture.textContent = "Pause";
	lecture = requestAnimationFrame(boucle);
});

// Temps de dessin seul, par scene, a 1920 x 1080 (synchronisation forcee par getImageData)
type Mesure = { nom: string; moyenne: number; p95: number; max: number };
function mesurer(): Mesure[] {
	const toile = new OffscreenCanvas(LARGEUR, HAUTEUR);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const par = new Map<string, number[]>();
	for (let passe = 0; passe < 2; passe++) {
		for (let k = 0; k < moteur.images; k++) {
			const temps = k / IPS;
			const t0 = performance.now();
			moteur.dessiner(ctx, temps, 1);
			ctx.getImageData(0, 0, 1, 1);
			// premiere passe : rasterisation initiale des glyphes et des tuiles, hors regime
			if (passe === 0) continue;
			const nom = moteur.timeline.scenes.reduce((n, s) => (s.debut <= temps ? s.type : n), "ouverture");
			par.set(nom, [...(par.get(nom) ?? []), performance.now() - t0]);
		}
	}
	const resume = (nom: string, v: number[]): Mesure => {
		const tries = [...v].sort((a, b) => a - b);
		return { nom, moyenne: v.reduce((a, b) => a + b, 0) / v.length, p95: tries[Math.floor(tries.length * 0.95)], max: tries[tries.length - 1] };
	};
	return [...[...par].map(([n, v]) => resume(n, v)), resume("Ensemble", [...par.values()].flat())];
}

el<HTMLButtonElement>("mesurer").addEventListener("click", () => {
	etat.textContent = "Mesure en cours";
	setTimeout(() => {
		const r = mesurer();
		const corps = el("mesures").querySelector("tbody") as HTMLTableSectionElement;
		corps.replaceChildren(
			...r.map((m) => {
				const tr = document.createElement("tr");
				for (const v of [m.nom, m.moyenne.toFixed(1), m.p95.toFixed(1), m.max.toFixed(1)]) {
					const td = document.createElement("td");
					td.textContent = v;
					tr.append(td);
				}
				return tr;
			}),
		);
		el("mesures").hidden = false;
		etat.textContent = "Mesure terminée";
		Object.assign(window, { mesuresTension: r });
	}, 0);
});

// Textes coupes : tout fillText de la scene qui porte des points de suspension (troncature de mettreEnPage)
function chercherCoupes(): string[] {
	const toile = new OffscreenCanvas(LARGEUR / 2, HAUTEUR / 2);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const coupes = new Set<string>();
	const original = ctx.fillText.bind(ctx);
	ctx.fillText = (texte: string, x: number, y: number, max?: number) => {
		if (texte.includes("…")) coupes.add(texte);
		original(texte, x, y, max);
	};
	for (let k = 0; k < moteur.images; k += 3) moteur.dessiner(ctx, k / IPS, 0.5);
	return [...coupes];
}

el<HTMLButtonElement>("coupes").addEventListener("click", () => {
	const c = chercherCoupes();
	etat.textContent = c.length ? `Textes coupés : ${c.join(" | ")}` : "Aucun texte coupé";
	Object.assign(window, { coupesTension: c });
});

// Rendu d'un instant en PNG a la definition demandee (planche comparative)
async function imageA(temps: number, echelle = 0.25): Promise<Blob> {
	const toile = new OffscreenCanvas(Math.round(LARGEUR * echelle), Math.round(HAUTEUR * echelle));
	moteur.dessiner(toile.getContext("2d") as OffscreenCanvasRenderingContext2D, temps, echelle);
	return toile.convertToBlob({ type: "image/png" });
}

Object.assign(window, { imageTension: imageA, instantsTension: INSTANTS, montrerTension: montrer });
for (const id of ["lecture", "mesurer", "coupes"]) el<HTMLButtonElement>(id).disabled = false;
montrer(0);
