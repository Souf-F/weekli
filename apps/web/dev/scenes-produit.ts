import type { ScenePub, ScriptPub } from "@weekli/core";
import { captureDeTest } from "../src/lib/pub/cartes/banc/capture-test";
import { chargerPolices, creerContexte } from "../src/lib/pub/contexte";
import { creerMoteur, type Moteur } from "../src/lib/pub/moteur";
import { type Ctx2D, HAUTEUR, LARGEUR } from "../src/lib/pub/scene";
import { registreDeTest } from "../src/lib/pub/scenes/test";
import { registreProduit } from "../src/lib/pub/scenes/produit";
import { policesRequises } from "../src/lib/pub/visuel";

// Banc des scenes produit et action (F7, developpement uniquement) : lecture, mesure du temps de
// dessin a 1920 x 1080, cas limites (etape en liste vide, textes longs) et images de la planche
// comparative, calees sur les instants de la reference Stepwize.

const m = (texte: string, accent?: string) => ({ texte, accent });

// Contenu calque sur la reference pour comparer tailles et positions a texte egal ou voisin.
// Projet fictif : aucun nom de client reel.
const SCENES: ScenePub[] = [
	{ id: "e1", type: "etape", voix: "", duree: 4.5, onglet: "Comprendre", filigrane: "Comprendre", titre: m("On comprend ce qui bloque.", "ce qui bloque."), texte: "À partir du terrain : réunions, échanges, fichiers et retours terrain.", visuel: { type: "capture", capture: "accueil", cadrage: "complet" } },
	{ id: "e2", type: "etape", voix: "", duree: 4.5, onglet: "Agir", filigrane: "Agir", titre: m("On lance les actions.", "les actions."), texte: "Une personne dédiée clarifie, priorise et lance les premières actions.", visuel: { type: "liste", titre: "Plan d'action", elements: ["Clarifier le sujet", "Prioriser ce qui compte", "Lancer les premières actions"] } },
	{ id: "e3", type: "etape", voix: "", duree: 4.5, onglet: "Suivre", filigrane: "Suivre", titre: m("Tout est suivi dans la plateforme.", "dans la plateforme."), texte: "Chaque action, chaque décision, chaque preuve, au même endroit.", visuel: { type: "capture", capture: "tableau", cadrage: "complet", focus: { x: 0.3, y: 0.24, largeur: 0.66, hauteur: 0.3 } } },
	{ id: "e4", type: "etape", voix: "", duree: 4.5, onglet: "Capitaliser", filigrane: "Capitaliser", titre: m("On garde chaque leçon.", "chaque leçon."), texte: "Tout ce qui est appris est conservé. Pour ne plus repartir de zéro.", visuel: { type: "capture", capture: "mobile", cadrage: "complet" } },
	{ id: "r", type: "resultat", voix: "", duree: 5.5, titre: m("Le sujet avance enfin.", "enfin."), avant: "Retard chantier", tampon: "Résolu", apres: "Nouveau projet", chute: m("Lundi prochain : on passe à autre chose.", "on passe à autre chose.") },
	{ id: "p", type: "preuve", voix: "", duree: 4.5, surtitre: "Déjà utilisé avec", elements: ["Atelier Morel", "Coop Garonne", "Brasserie Lune"], cartes: [{ titre: "Mission accompagnée", texte: "On démarre avec de l'humain." }, { titre: "Plateforme Relais", texte: "Retours, actions, décisions et preuves au même endroit." }, { titre: "Accompagnement renforcé", texte: "Points réguliers, relances et suivi rapproché." }] },
	{ id: "a", type: "appel", voix: "", duree: 5.5, question: m("Un problème revient chaque semaine ?", "chaque semaine ?"), badge: m("Premier audit gratuit", "gratuit"), action: "Parlons-en.", bouton: "Réserver mon audit gratuit" },
	{ id: "f", type: "fin", voix: "", duree: 4.5, slogan: "Jusqu'au résultat.", bouton: "Réserver mon audit gratuit", liens: ["relais.example", "contact@relais.example"] },
];

// Cas limites : etape dont la capture est inconnue (liste vide), textes longs a la limite des 80 %
const LIMITES: ScenePub[] = [
	{ id: "vide", type: "etape", voix: "", duree: 4, onglet: "Comprendre", filigrane: "Comprendre", titre: m("On comprend ce qui bloque vraiment.", "vraiment."), visuel: { type: "liste", titre: "", elements: [] } },
	{ id: "long-e", type: "etape", voix: "", duree: 4, onglet: "Organiser", filigrane: "Organiser", titre: m("Chaque réservation arrive confirmée et rangée.", "confirmée et rangée."), texte: "Le client choisit son créneau en ligne, reçoit une confirmation, puis un rappel la veille.", visuel: { type: "liste", titre: "Rappels automatiques", elements: ["Confirmation envoyée au client", "Rappel la veille au soir", "Table attribuée selon la salle", "Liste d'attente prévenue"] } },
	{ id: "long-a", type: "appel", voix: "", duree: 5, question: m("Encore un samedi soir passé au téléphone en plein service ?", "en plein service ?"), badge: m("Premier mois offert sans engagement", "offert"), action: "Essayez-le.", bouton: "Ouvrir mon carnet de réservations en ligne" },
	{ id: "long-p", type: "preuve", voix: "", duree: 4.5, surtitre: "Ce que vous trouvez dès le premier jour", elements: ["Gratuit et open source", "Sans inscription", "Données chez vous", "Export en un clic"] },
];

const base = (scenes: ScenePub[]): ScriptPub => ({
	version: 1,
	titre: "Banc F7",
	projet: { nom: "Relais", repo: "relais", lien: "https://relais.example" },
	reponses: { pourQui: "a", probleme: "b", promesse: "c" },
	marque: { primaire: "#1f22b8", logo: "monogramme", monogramme: "R", typo: "nette" },
	voix: { mode: "aucune", vitesse: 1, prononciation: {} },
	musique: "aucune",
	captures: [
		{ id: "accueil", source: "site", url: "https://relais.example/", format: "bureau" },
		{ id: "tableau", source: "site", url: "https://app.relais.example/", format: "bureau" },
		{ id: "mobile", source: "importee", format: "mobile" },
	],
	scenes,
});

// Fausse capture de tableau de bord (etape 3), dessinee localement comme celle de F8
async function captureTableau(): Promise<ImageBitmap> {
	const toile = new OffscreenCanvas(1280, 800);
	const c = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const police = '"Geist", ui-sans-serif, system-ui, sans-serif';
	c.fillStyle = "#ffffff";
	c.fillRect(0, 0, 1280, 800);
	c.fillStyle = "#f4f5fb";
	c.fillRect(0, 0, 300, 800);
	c.fillStyle = "#1f22b8";
	c.font = `600 30px ${police}`;
	c.fillText("Relais", 40, 70);
	["Tableau de bord", "Actions", "Décisions", "Preuves", "Apprentissages"].forEach((t, i) => {
		if (i === 0) {
			c.fillStyle = "#e3e5fb";
			c.beginPath();
			c.roundRect(24, 118, 252, 52, 10);
			c.fill();
		}
		c.fillStyle = i === 0 ? "#1f22b8" : "#5b6075";
		c.font = `${i === 0 ? 600 : 500} 24px ${police}`;
		c.fillText(t, 44, 153 + i * 62);
	});
	c.fillStyle = "#5b6075";
	c.font = `600 18px ${police}`;
	c.fillText("SUJET SUIVI", 360, 80);
	c.fillStyle = "#11142d";
	c.font = `600 40px ${police}`;
	c.fillText("Retard chantier récurrent", 360, 130);
	[["12", "Actions"], ["5", "Décisions"], ["8", "Preuves"], ["3", "Blocages"]].forEach(([n, l], i) => {
		const x = 360 + i * 222;
		c.strokeStyle = "#e3e5ee";
		c.lineWidth = 2;
		c.beginPath();
		c.roundRect(x, 190, 200, 210, 16);
		c.stroke();
		c.fillStyle = i === 3 ? "#e5484d" : "#1f22b8";
		c.font = `700 64px ${police}`;
		c.fillText(n, x + 24, 320);
		c.fillStyle = "#5b6075";
		c.font = `500 24px ${police}`;
		c.fillText(l, x + 24, 365);
	});
	c.fillStyle = "#11142d";
	c.font = `600 26px ${police}`;
	c.fillText("Avancement", 360, 520);
	c.fillStyle = "#eceef6";
	c.beginPath();
	c.roundRect(360, 550, 860, 18, 9);
	c.fill();
	c.fillStyle = "#1f22b8";
	c.beginPath();
	c.roundRect(360, 550, 560, 18, 9);
	c.fill();
	return createImageBitmap(toile);
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const apercu = $<HTMLCanvasElement>("apercu");
const curseur = $<HTMLInputElement>("curseur");
const etat = $<HTMLParagraphElement>("etat");
const coupes: string[] = [];

let moteur: Moteur;
let limites: Moteur;

// Instants de la planche : temps de la reference -> scene du banc et seconde locale
export const PLANCHE: { ref: number; scene: string; s: number | ((d: number) => number); legende: string }[] = [
	{ ref: 22.5, scene: "e1", s: 0.45, legende: "Étape 1, entrée du titre" },
	{ ref: 25.0, scene: "e1", s: 3.2, legende: "Étape 1 en place" },
	{ ref: 28.0, scene: "e2", s: 3.0, legende: "Étape 2, liste cochée" },
	{ ref: 31.5, scene: "e3", s: 2.4, legende: "Étape 3, focus" },
	{ ref: 35.5, scene: "e4", s: 2.0, legende: "Étape 4, carte mobile" },
	{ ref: 37.0, scene: "r", s: (d) => d * 0.34, legende: "Résultat, tampon" },
	{ ref: 40.0, scene: "r", s: (d) => d * 0.84, legende: "Résultat, chute" },
	{ ref: 44.0, scene: "p", s: 1.0, legende: "Preuve, noms qui s'empilent" },
	{ ref: 46.0, scene: "p", s: 3.4, legende: "Preuve, cartes" },
	{ ref: 50.0, scene: "a", s: (d) => d * 0.42, legende: "Appel, badge" },
	{ ref: 52.0, scene: "a", s: (d) => d * 0.78, legende: "Appel en place" },
	{ ref: 52.5, scene: "a", s: (d) => d - 0.7, legende: "Appel, bulle de sortie" },
	{ ref: 56.0, scene: "f", s: 3.0, legende: "Fin" },
];

function tempsDe(mo: Moteur, id: string, s: number | ((d: number) => number)) {
	const sc = mo.timeline.scenes.find((x) => x.id === id);
	if (!sc) throw new Error(`Scene inconnue : ${id}`);
	const local = typeof s === "number" ? s : s(sc.duree);
	return sc.debut + Math.min(local, sc.duree - 1 / 60);
}

function dessinerApercu() {
	const ctx = apercu.getContext("2d") as Ctx2D;
	moteur.dessiner(ctx, Number(curseur.value), apercu.width / LARGEUR);
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

// Temps de dessin a 1920 x 1080, GPU synchronise par la lecture d'un pixel apres chaque image
function mesurer() {
	const toile = new OffscreenCanvas(LARGEUR, HAUTEUR);
	const ctx = toile.getContext("2d", { willReadFrequently: false }) as OffscreenCanvasRenderingContext2D;
	const parType = new Map<string, number[]>();
	const passe = (mesure: boolean) => {
		for (let image = 0; image < moteur.images; image++) {
			const t = image / 30;
			const debut = performance.now();
			moteur.dessiner(ctx, t, 1);
			ctx.getImageData(0, 0, 1, 1);
			if (!mesure) continue;
			const sc = moteur.timeline.scenes.find((x) => t >= x.debut && t < x.fin);
			const cle = sc?.type ?? "?";
			if (!parType.has(cle)) parType.set(cle, []);
			parType.get(cle)?.push(performance.now() - debut);
		}
	};
	passe(false); // premiere passe : rasterisation des glyphes et toiles de travail
	passe(true);
	const lignes = [...parType.entries()].map(([type, v]) => {
		v.sort((a, b) => a - b);
		const moyenne = v.reduce((a, b) => a + b, 0) / v.length;
		return { type, n: v.length, moyenne, p95: v[Math.floor(v.length * 0.95)], max: v[v.length - 1] };
	});
	const corps = $<HTMLTableSectionElement>("mesures-corps");
	corps.replaceChildren(
		...lignes.map((l) => {
			const tr = document.createElement("tr");
			for (const v of [l.type, String(l.n), l.moyenne.toFixed(1), l.p95.toFixed(1), l.max.toFixed(1)]) {
				const td = document.createElement("td");
				td.textContent = v;
				tr.append(td);
			}
			return tr;
		}),
	);
	$<HTMLTableElement>("mesures").hidden = false;
	return lignes;
}

// Images de la planche (960 x 540), envoyees a un recepteur local de developpement
async function exporterPlanche(adresse: string) {
	const toile = new OffscreenCanvas(960, 540);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const envoyer = async (nom: string) => {
		const blob = await toile.convertToBlob({ type: "image/png" });
		const r = await fetch(`${adresse}/${nom}`, { method: "POST", body: blob });
		if (!r.ok) throw new Error(`Recepteur : ${r.status}`);
	};
	for (const [n, p] of PLANCHE.entries()) {
		moteur.dessiner(ctx, tempsDe(moteur, p.scene, p.s), 0.5);
		await envoyer(`nous-${String(n).padStart(2, "0")}.png`);
	}
	const extra: [string, number][] = [
		["vide", 2.5],
		["long-e", 3.2],
		["long-a", 3.6],
		["long-p", 3.6],
	];
	for (const [n, [id, s]] of extra.entries()) {
		limites.dessiner(ctx, tempsDe(limites, id, s), 0.5);
		await envoyer(`limite-${n}.png`);
	}
	etat.textContent = `Planche envoyée (${PLANCHE.length + extra.length} images).`;
}

async function demarrer() {
	await chargerPolices(policesRequises("nette"));
	const images = new Map<string, ImageBitmap>([
		["accueil", await createImageBitmap(await captureDeTest("bureau"))],
		["mobile", await createImageBitmap(await captureDeTest("mobile"))],
		["tableau", await captureTableau()],
	]);
	const surCoupe = (id: string, texte: string) => {
		coupes.push(`${id} : ${texte}`);
		$<HTMLParagraphElement>("coupes").textContent = `Textes coupés : ${coupes.join(" | ")}`;
	};
	const creer = (scenes: ScenePub[]) => {
		const script = base(scenes);
		return creerMoteur({ script, scenes: { ...registreDeTest(), ...registreProduit(script, { surCoupe }) }, contexte: creerContexte(script, { images }) });
	};
	moteur = creer(SCENES);
	limites = creer(LIMITES);
	// les cas limites sont dessines une fois au demarrage pour remonter les textes coupes
	const toile = new OffscreenCanvas(LARGEUR, HAUTEUR);
	for (const sc of limites.timeline.scenes) limites.dessiner(toile.getContext("2d") as Ctx2D, sc.debut + sc.duree * 0.9, 1);
	apercu.width = 960;
	apercu.height = 540;
	curseur.max = String(moteur.duree);
	dessinerApercu();
	etat.textContent = `Prêt : ${moteur.duree.toFixed(2)} s, ${moteur.images} images. Coupes : ${coupes.length}.`;
	for (const b of document.querySelectorAll("button")) b.disabled = false;
}

curseur.addEventListener("input", dessinerApercu);
$("lecture").addEventListener("click", lire);
$("mesurer").addEventListener("click", () => {
	etat.textContent = "Mesure en cours";
	setTimeout(() => {
		mesurer();
		etat.textContent = "Mesure terminée.";
	}, 30);
});
$("planche").addEventListener("click", () => {
	exporterPlanche($<HTMLInputElement>("recepteur").value).catch((e: unknown) => {
		etat.textContent = `Échec de l'envoi : ${e instanceof Error ? e.message : String(e)}`;
	});
});
Object.assign(window, { banc: { mesurer, exporterPlanche, coupes } });

demarrer().catch((e: unknown) => {
	etat.textContent = `Erreur : ${e instanceof Error ? e.message : String(e)}`;
});
