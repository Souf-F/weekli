import { type Cadrage, type CaptureRef, paletteDepuisMarque } from "@weekli/core";
import { chargerPolices } from "../../contexte";
import type { InstantScene } from "../../scene";
import { HAUTEUR, LARGEUR } from "../../scene";
import {
	chargerImagesScript,
	dessinerVisuel,
	echantillonner,
	extraireCouleurs,
	ID_LOGO,
	importerImage,
	ouvrirStockage,
	proposerMarque,
	type Stockage,
} from "../index";
import { captureDeTest } from "./capture-test";

// Banc des cartes de capture (F8) : section de apps/web/dev/pub.html, developpement uniquement.

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ID_PUB = "banc";
const DUREE = 4.5; // secondes, duree par defaut d'une etape (design.md 8.9)
const PRIMAIRE_DEFAUT = "#2a1c13";

const images = new Map<string, ImageBitmap>();
const refs: CaptureRef[] = [];
let principale = "";
let primaire: `#${string}` = PRIMAIRE_DEFAUT;
let stockage: Stockage | null = null;

const canvas = el<HTMLCanvasElement>("cartes-canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Canvas 2D indisponible");
const etat = el("cartes-etat");
const curseur = el<HTMLInputElement>("cartes-curseur");

await chargerPolices(["500 15px Geist", "600 36px Geist"]);

function instant(t: number): InstantScene {
	// Seuls les champs lus par les cartes sont renseignes (donnees et scene ne servent pas ici)
	return {
		t,
		secondes: t * DUREE,
		temps: t * DUREE,
		graine: 1,
		contexte: { palette: paletteDepuisMarque({ primaire }), images, filtre: true },
	} as unknown as InstantScene;
}

function dessiner() {
	if (!ctx) return;
	const t = Number(curseur.value);
	const i = instant(t);
	const p = i.contexte.palette;
	ctx.setTransform(canvas.width / LARGEUR, 0, 0, canvas.height / HAUTEUR, 0, 0);
	ctx.fillStyle = p.clair;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	const zone = { x: 940, y: 140, largeur: 860, hauteur: 800 };
	const mode = el<HTMLSelectElement>("cartes-mode").value;
	const focus = el<HTMLInputElement>("cartes-focus").checked;
	const cadrage = el<HTMLSelectElement>("cartes-cadrage").value as Exclude<Cadrage, object>;
	const avecVignette = el<HTMLInputElement>("cartes-vignette").checked;
	if (mode === "liste") {
		dessinerVisuel(ctx, i, { type: "liste", titre: "Avant de publier", elements: ["Tests verts", "Version notée", "Annonce relue", "Déploiement prêt"] }, zone);
	} else if (images.has(principale)) {
		dessinerVisuel(
			ctx,
			i,
			{ type: "capture", capture: principale, cadrage, focus: focus ? { x: 0.08, y: 0.32, largeur: 0.42, hauteur: 0.3 } : undefined },
			zone,
			{ captures: refs, vignette: avecVignette ? undefined : null },
		);
	}
	el("cartes-t").textContent = `t ${t.toFixed(2)}  ${(t * DUREE).toFixed(2)} s`;
}

function afficherCouleurs(id: string) {
	const img = images.get(id);
	const zoneCouleurs = el("cartes-couleurs");
	zoneCouleurs.replaceChildren();
	if (!img) return;
	const couleurs = extraireCouleurs(echantillonner(img));
	const proposition = proposerMarque(couleurs);
	for (const c of couleurs) {
		const pastille = document.createElement("span");
		pastille.className = `pastille${c.hex === proposition.accent ? " accent" : ""}`;
		const puce = document.createElement("i");
		puce.style.background = c.hex;
		pastille.append(puce, `${c.hex} ${(c.part * 100).toFixed(0)} %`);
		zoneCouleurs.append(pastille);
	}
	if (proposition.accent) primaire = proposition.accent;
	etat.textContent = proposition.accent
		? `Marque proposée depuis ${id} : ${proposition.accent}`
		: `Image neutre (${id}) : aucune couleur de marque proposée`;
}

function choisir(id: string) {
	principale = id;
	for (const b of el("cartes-liste").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.id === id));
	afficherCouleurs(id);
	dessiner();
}

function rafraichirListe() {
	const liste = el("cartes-liste");
	liste.replaceChildren();
	for (const [id, img] of images) {
		const bouton = document.createElement("button");
		bouton.type = "button";
		bouton.dataset.id = id;
		bouton.title = id;
		bouton.setAttribute("aria-label", `Utiliser ${id}`);
		const mini = document.createElement("canvas");
		mini.width = 120;
		mini.height = Math.max(40, Math.round((120 * Math.min(img.height / img.width, 1.8)) || 80));
		mini.getContext("2d")?.drawImage(img, 0, 0, mini.width, mini.height);
		bouton.append(mini);
		bouton.addEventListener("click", () => choisir(id));
		liste.append(bouton);
	}
}

function ajouter(id: string, bitmap: ImageBitmap, ref?: CaptureRef) {
	images.get(id)?.close();
	images.set(id, bitmap);
	if (ref) {
		const i = refs.findIndex((r) => r.id === id);
		if (i >= 0) refs[i] = ref;
		else refs.push(ref);
	}
}

const formatDe = (b: ImageBitmap) => (b.height > b.width * 1.1 ? "mobile" : "bureau");

async function importer(fichiers: FileList | null) {
	if (!fichiers || !stockage) return;
	let dernier = "";
	for (const [i, f] of [...fichiers].entries()) {
		const id = `import-${Date.now().toString(36)}${i}`;
		try {
			const bitmap = await importerImage(stockage, ID_PUB, id, f);
			ajouter(id, bitmap, { id, source: "importee", format: formatDe(bitmap), legende: f.name });
			dernier = id;
		} catch (err) {
			etat.textContent = `${f.name} : ${(err as Error).message}`;
		}
	}
	rafraichirListe();
	if (dernier) choisir(dernier);
}

async function importerLogo(fichiers: FileList | null) {
	const f = fichiers?.[0];
	if (!f || !stockage) return;
	try {
		ajouter(ID_LOGO, await importerImage(stockage, ID_PUB, ID_LOGO, f));
		rafraichirListe();
		choisir(ID_LOGO);
	} catch (err) {
		etat.textContent = `Logo : ${(err as Error).message}`;
	}
}

// Capture simulee : meme chemin que la vraie (chargerImagesScript), mais l'image vient d'un dessin local
async function simuler() {
	if (!stockage) return;
	const script = {
		marque: { logo: "monogramme" as const },
		captures: [
			{ id: "site-bureau", source: "site" as const, url: "https://studio-lumen.fr/", format: "bureau" as const },
			{ id: "site-mobile", source: "site" as const, url: "https://studio-lumen.fr/", format: "mobile" as const },
		],
	};
	const r = await chargerImagesScript(script, { idPub: ID_PUB, stockage, capturer: (_url, format) => captureDeTest(format) });
	for (const ref of script.captures) {
		const b = r.images.get(ref.id);
		if (b) ajouter(ref.id, b, ref);
	}
	rafraichirListe();
	etat.textContent = r.manquantes.length ? `Manquantes : ${r.manquantes.map((m) => `${m.id} (${m.raison})`).join(", ")}` : "Captures simulées chargées";
	choisir("site-bureau");
}

async function restaurer() {
	if (!stockage) return;
	const medias = await stockage.lister(`${ID_PUB}/`);
	const { decoderImage } = await import("../chargement");
	for (const m of medias) {
		const id = m.cle.slice(ID_PUB.length + 1);
		try {
			const bitmap = await decoderImage(m.blob, id === ID_LOGO);
			ajouter(id, bitmap, id === ID_LOGO ? undefined : { id, source: "importee", format: formatDe(bitmap), legende: m.nom });
		} catch {
			etat.textContent = `${m.nom} : illisible, ignorée`;
		}
	}
	rafraichirListe();
	const premier = [...images.keys()].find((k) => k !== ID_LOGO) ?? [...images.keys()][0];
	if (premier) choisir(premier);
}

// Journal reseau : toute requete vers /api pendant la session (hors captures, il doit rester vide)
const requetesApi: string[] = [];
new PerformanceObserver((liste) => {
	for (const e of liste.getEntries()) if (e.name.includes("/api/")) requetesApi.push(e.name);
	el("cartes-reseau").textContent = `Requêtes vers /api : ${requetesApi.length}${requetesApi.length ? ` (${requetesApi.join(", ")})` : " : aucune image envoyée au serveur"}`;
}).observe({ type: "resource", buffered: true });
el("cartes-reseau").textContent = "Requêtes vers /api : 0 : aucune image envoyée au serveur";

// Interactions
for (const id of ["cartes-mode", "cartes-cadrage", "cartes-focus", "cartes-vignette"]) el(id).addEventListener("change", dessiner);
curseur.addEventListener("input", dessiner);
el<HTMLInputElement>("cartes-import").addEventListener("change", (e) => void importer((e.target as HTMLInputElement).files));
el<HTMLInputElement>("cartes-logo").addEventListener("change", (e) => void importerLogo((e.target as HTMLInputElement).files));
el("cartes-simuler").addEventListener("click", () => void simuler());
el("cartes-vider").addEventListener("click", async () => {
	await stockage?.supprimerPrefixe(`${ID_PUB}/`);
	for (const b of images.values()) b.close();
	images.clear();
	refs.length = 0;
	principale = "";
	primaire = PRIMAIRE_DEFAUT;
	rafraichirListe();
	el("cartes-couleurs").replaceChildren();
	etat.textContent = "IndexedDB vidée";
	dessiner();
});

let lecture = 0;
const boutonLecture = el<HTMLButtonElement>("cartes-lecture");
boutonLecture.addEventListener("click", () => {
	if (lecture) {
		cancelAnimationFrame(lecture);
		lecture = 0;
		boutonLecture.textContent = "Lecture";
		return;
	}
	boutonLecture.textContent = "Pause";
	const debut = performance.now() - Number(curseur.value) * DUREE * 1000;
	const boucle = (now: number) => {
		const t = ((now - debut) / 1000 / DUREE) % 1;
		curseur.value = String(t);
		dessiner();
		lecture = requestAnimationFrame(boucle);
	};
	lecture = requestAnimationFrame(boucle);
});

try {
	stockage = await ouvrirStockage();
	await restaurer();
} catch (err) {
	etat.textContent = `Stockage local indisponible : ${(err as Error).message}`;
}
dessiner();
Object.assign(window, { cartesBanc: { images, refs, simuler, choisir, dessiner } });
