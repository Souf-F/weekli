import { DUREES_TRANSITION, type Palette, paletteDepuisMarque, type Transition } from "@weekli/core";
import { chargerPolices } from "../src/lib/pub/contexte";
import { exporter } from "../src/lib/pub/export";
import type { Moteur } from "../src/lib/pub/moteur";
import { type Ctx2D, HAUTEUR, IPS, LARGEUR, type Toile } from "../src/lib/pub/scene";
import { TRANSITIONS_PAR_DEFAUT } from "../src/lib/pub/transitions";
import {
	avancement,
	dessinerBloc,
	dessinerFondClair,
	dessinerFondSombre,
	dessinerFrappe,
	dessinerImpact,
	dessinerLettres,
	dessinerMotParMot,
	dessinerSoulignement,
	dessinerSurlignage,
	easeOutExpo,
	finMotParMot,
	mettreEnPage,
	policesRequises,
	secousseImpact,
} from "../src/lib/pub/visuel";

// Planche de demonstration de F5 (developpement uniquement) : chaque procede dure 2 s, rejoue sur
// plusieurs couleurs de marque. Ordre de la video : procede par procede, puis couleur par couleur,
// pour que les images extraites dans l'ordre forment directement les rangees de la planche.

const DUREE = 2;
const MARQUES: { nom: string; primaire: `#${string}` }[] = [
	{ nom: "bleu", primaire: "#3d4bff" },
	{ nom: "vert", primaire: "#0e9f6e" },
	{ nom: "gris", primaire: "#6b6f76" },
];
const NOM = "Relance";

type Instant = { s: number; temps: number; graine: number };
type Dessin = (ctx: Ctx2D, i: Instant, p: Palette) => void;
type Procede = { nom: string; dessiner: Dessin; instants: [number, number] };

const fondSombre = (ctx: Ctx2D, i: Instant, p: Palette, extra = {}) =>
	dessinerFondSombre(ctx, p, { secondes: i.s, temps: i.temps, graine: i.graine, ...extra });
const fondClair = (ctx: Ctx2D, i: Instant, p: Palette) => dessinerFondClair(ctx, p, { secondes: i.s, temps: i.temps, graine: i.graine });

// --- scenes de demonstration -------------------------------------------------------------------

const sceneTension: Dessin = (ctx, i, p) => {
	fondSombre(ctx, i, p);
	const bloc = mettreEnPage(ctx, { texte: "Personne ne le règle.", accent: "le règle." }, { niveau: "grand", x: LARGEUR / 2, y: 400, largeur: 1400, alignement: "centre" });
	dessinerBloc(ctx, bloc, p.blanc, p.alerteSombre);
};

const sceneRupture: Dessin = (ctx, i, p) => {
	fondClair(ctx, i, p);
	const bloc = mettreEnPage(ctx, { texte: "Et si quelqu'un s'en occupait, pour de vrai ?", accent: "pour de vrai ?" }, { niveau: "grand", x: 240, y: 380, largeur: 1440 });
	dessinerFrappe(ctx, bloc, i.s + 0.6, { couleur: p.encre, couleurAccent: p.accentClair, curseur: p.accentClair });
};

const sceneRevelation: Dessin = (ctx, i, p) => {
	fondSombre(ctx, i, p, { rayons: {} });
	const nom = mettreEnPage(ctx, NOM, { niveau: "affiche", x: LARGEUR / 2, y: 380, largeur: 1500, alignement: "centre" });
	dessinerBloc(ctx, nom, p.blanc);
};

function transition(nom: Transition, avant: Dessin, apres: Dessin): Dessin {
	const debut = 0.8;
	const duree = DUREES_TRANSITION[nom];
	return (ctx, i, p) => {
		const progres = avancement(i.s, debut, duree);
		if (progres <= 0) return avant(ctx, i, p);
		if (progres >= 1) return apres(ctx, { ...i, s: i.s - debut }, p);
		const e = ctx.getTransform().a;
		const a = couche("avant", e);
		avant(a.ctx, i, p);
		const b = couche("apres", e);
		apres(b.ctx, { ...i, s: i.s - debut, graine: i.graine + 1 }, p);
		TRANSITIONS_PAR_DEFAUT[nom](ctx, a.toile, b.toile, progres, p);
	};
}

const couches = new Map<string, OffscreenCanvas>();
function couche(nom: string, echelle: number): { toile: Toile; ctx: Ctx2D } {
	let toile = couches.get(nom);
	if (!toile) couches.set(nom, (toile = new OffscreenCanvas(1, 1)));
	toile.width = Math.round(LARGEUR * echelle);
	toile.height = Math.round(HAUTEUR * echelle);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
	return { toile, ctx };
}

const PROCEDES: Procede[] = [
	{ nom: "Fond sombre", instants: [0.4, 1.6], dessiner: (ctx, i, p) => fondSombre(ctx, i, p) },
	{ nom: "Fond clair", instants: [0.4, 1.6], dessiner: fondClair },
	{
		nom: "Carrés",
		instants: [0.2, 1.9],
		// derive accentuee pour la lecture de la planche : 6 s de derive condensees en 2 s
		dessiner: (ctx, i, p) => {
			const vue = { ...i, s: i.s * 3 };
			if (i.s < 1) fondSombre(ctx, vue, p, { grain: false, trame: false });
			else fondClair(ctx, vue, p);
		},
	},
	{
		nom: "Grain (zoom x4)",
		instants: [0.5, 1.5],
		dessiner: (ctx, i, p) => {
			const e = ctx.getTransform().a;
			const c = couche("grain", e);
			fondSombre(c.ctx, i, p, { carres: false });
			ctx.save();
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(c.toile as CanvasImageSource, c.toile.width * 0.375, c.toile.height * 0.375, c.toile.width / 4, c.toile.height / 4, 0, 0, LARGEUR, HAUTEUR);
			ctx.restore();
		},
	},
	{
		nom: "Rayons",
		instants: [0.35, 1.6],
		dessiner: (ctx, i, p) => {
			const ouverture = easeOutExpo(avancement(i.s, 0.1, 0.9));
			fondSombre(ctx, i, p, { rayons: { ouverture, intensite: ouverture } });
		},
	},
	{
		nom: "Mot par mot",
		instants: [0.42, 1.6],
		dessiner: (ctx, i, p) => {
			fondSombre(ctx, i, p);
			const bloc = mettreEnPage(ctx, "Semaine après semaine, le même sujet revient.", { niveau: "grand", x: LARGEUR / 2, y: 330, largeur: 1300, alignement: "centre" });
			dessinerMotParMot(ctx, bloc, i.s, { debut: 0.2, couleur: p.blanc });
		},
	},
	{
		nom: "Accent",
		instants: [0.6, 1.6],
		dessiner: (ctx, i, p) => {
			fondSombre(ctx, i, p);
			const bloc = mettreEnPage(ctx, { texte: "Même réunion. Même problème.", accent: "problème." }, { niveau: "grand", x: 240, y: 330, largeur: 1100 });
			dessinerMotParMot(ctx, bloc, i.s, { debut: 0.2, couleur: p.blanc, couleurAccent: p.alerteSombre });
		},
	},
	{
		nom: "Surlignage",
		instants: [1.05, 1.7],
		dessiner: (ctx, i, p) => {
			fondSombre(ctx, i, p, { rayons: {} });
			const nom = mettreEnPage(ctx, NOM, { niveau: "affiche", x: LARGEUR / 2, y: 300, largeur: 1500, alignement: "centre" });
			dessinerBloc(ctx, nom, p.blanc);
			const slogan = mettreEnPage(ctx, { texte: "On reprend les sujets qui reviennent.", accent: "qui reviennent." }, { niveau: "slogan", x: LARGEUR / 2, y: 520, largeur: 1400, alignement: "centre" });
			dessinerMotParMot(ctx, slogan, i.s, { debut: 0.15, couleur: p.blanc, accent: false });
			dessinerSurlignage(ctx, slogan, i.s, { debut: finMotParMot(slogan, 0.15) + 0.2, bloc: p.clair, texte: p.sombre });
		},
	},
	{
		nom: "Soulignement",
		instants: [0.75, 1.6],
		dessiner: (ctx, i, p) => {
			fondSombre(ctx, i, p, { rayons: {} });
			const nom = mettreEnPage(ctx, NOM, { niveau: "affiche", x: LARGEUR / 2, y: 300, largeur: 1500, alignement: "centre" });
			dessinerBloc(ctx, nom, p.blanc);
			const signature = mettreEnPage(ctx, "Jusqu'au résultat.", { niveau: "slogan", x: LARGEUR / 2, y: 520, largeur: 1400, alignement: "centre" });
			dessinerMotParMot(ctx, signature, i.s, { debut: 0.1, couleur: p.blanc });
			dessinerSoulignement(ctx, signature, i.s, { debut: finMotParMot(signature, 0.1) + 0.15, couleur: p.blanc });
		},
	},
	{
		nom: "Frappe",
		instants: [0.9, 1.95],
		dessiner: (ctx, i, p) => {
			fondClair(ctx, i, p);
			const bloc = mettreEnPage(ctx, { texte: "Et si quelqu'un s'en occupait, pour de vrai ?", accent: "pour de vrai ?" }, { niveau: "grand", x: 240, y: 380, largeur: 1440 });
			dessinerFrappe(ctx, bloc, i.s, { debut: 0.1, couleur: p.encre, couleurAccent: p.accentClair, curseur: p.accentClair });
		},
	},
	{
		nom: "Impact",
		instants: [0.34, 1.2],
		dessiner: (ctx, i, p) => {
			const debut = 0.3;
			const actif = i.s >= debut;
			const d = secousseImpact(i.s, debut, i.graine);
			ctx.save();
			ctx.translate(d.x, d.y);
			fondSombre(ctx, i, p, { alerte: actif ? 1 - 0.5 * avancement(i.s, debut, 0.8) : 0 });
			const bloc = mettreEnPage(ctx, "ENCORE.", { niveau: "impact", x: LARGEUR / 2, y: 420, largeur: 1680, lignesMax: 1, alignement: "centre" });
			dessinerImpact(ctx, bloc, i.s, { debut, couleur: p.alerteSombre });
			ctx.restore();
		},
	},
	{
		nom: "Lettres",
		instants: [0.5, 1.6],
		dessiner: (ctx, i, p) => {
			fondClair(ctx, i, p);
			const question = mettreEnPage(ctx, { texte: "Un sujet revient chaque semaine ?", accent: "chaque semaine ?" }, { niveau: "grand", x: LARGEUR / 2, y: 220, largeur: 1500, alignement: "centre" });
			dessinerBloc(ctx, question, p.encre, p.accentClair);
			const action = mettreEnPage(ctx, "Parlons-en.", { niveau: "affiche", x: LARGEUR / 2, y: 560, largeur: 1500, alignement: "centre" });
			dessinerLettres(ctx, action, i.s, { debut: 0.15, couleur: p.accentClair, particules: p.accentClair, graine: i.graine });
		},
	},
	{ nom: "Transition glitch", instants: [0.91, 0.97], dessiner: transition("glitch", sceneTension, sceneRupture) },
	{ nom: "Transition flou", instants: [1.0, 1.15], dessiner: transition("flou", sceneRupture, sceneTension) },
	{ nom: "Transition pixels", instants: [1.0, 1.22], dessiner: transition("pixels", sceneRupture, sceneRevelation) },
];

const palettes = MARQUES.map((m) => ({ ...m, palette: paletteDepuisMarque({ primaire: m.primaire }) }));
const segments = PROCEDES.flatMap((procede, k) => palettes.map((marque, c) => ({ procede, marque, index: k * palettes.length + c })));
const dureeTotale = segments.length * DUREE;
const images = Math.round(dureeTotale * IPS);

// Etiquette de lecture de la planche (propre au banc, pas aux scenes)
function etiquette(ctx: Ctx2D, texte: string) {
	ctx.save();
	ctx.font = "600 26px Geist, ui-sans-serif, sans-serif";
	const l = ctx.measureText(texte).width + 36;
	ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
	ctx.beginPath();
	ctx.roundRect(28, 28, l, 48, 6);
	ctx.fill();
	ctx.fillStyle = "#ffffff";
	ctx.fillText(texte, 46, 62);
	ctx.restore();
}

function dessiner(ctx: Ctx2D, temps: number, echelle = 1) {
	const n = Math.min(segments.length - 1, Math.floor(temps / DUREE + 1e-6));
	const seg = segments[n];
	const s = temps - n * DUREE;
	ctx.save();
	ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
	seg.procede.dessiner(ctx, { s, temps, graine: 1000 + n * 31 }, seg.marque.palette);
	etiquette(ctx, `${seg.procede.nom}  ${seg.marque.primaire}`);
	ctx.restore();
}

// Instants extraits pour la planche (numeros d'image dans l'ordre de la video)
const imagesPlanche = segments.flatMap((seg) => seg.procede.instants.map((t) => Math.round((seg.index * DUREE + t) * IPS)));
const moteur = { duree: dureeTotale, images, dessiner } as unknown as Moteur;

// --- interface du banc -------------------------------------------------------------------------

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>("apercu");
canvas.width = LARGEUR / 2;
canvas.height = HAUTEUR / 2;
const ctxApercu = canvas.getContext("2d") as CanvasRenderingContext2D;
const curseur = el<HTMLInputElement>("curseur");
const etat = el("etat");
let position = 0;
let lecture = 0;

function montrer(t: number) {
	position = Math.min(Math.max(t, 0), dureeTotale - 1 / IPS);
	dessiner(ctxApercu, position, 0.5);
	curseur.value = String(position);
	el("temps").textContent = `${position.toFixed(2)} / ${dureeTotale.toFixed(0)} s`;
}

await chargerPolices(policesRequises("nette"));
el("infos").textContent = `${PROCEDES.length} procédés x ${MARQUES.length} marques (${MARQUES.map((m) => m.primaire).join(", ")}), ${DUREE} s chacun, ${images} images`;
curseur.max = String(dureeTotale);
curseur.addEventListener("input", () => montrer(Number(curseur.value)));

const choix = el<HTMLSelectElement>("procede");
PROCEDES.forEach((p, k) => choix.add(new Option(p.nom, String(k))));
choix.addEventListener("change", () => montrer(Number(choix.value) * MARQUES.length * DUREE));

const btnLecture = el<HTMLButtonElement>("lecture");
btnLecture.addEventListener("click", () => {
	if (lecture) {
		cancelAnimationFrame(lecture);
		lecture = 0;
		btnLecture.textContent = "Lecture";
		return;
	}
	const origine = performance.now() / 1000 - position;
	const boucle = () => {
		montrer(performance.now() / 1000 - origine);
		lecture = position >= dureeTotale - 1 / IPS ? 0 : requestAnimationFrame(boucle);
		if (!lecture) btnLecture.textContent = "Lecture";
	};
	btnLecture.textContent = "Pause";
	lecture = requestAnimationFrame(boucle);
});

// Temps de dessin seul (sans encodage), par procede, a 1920 x 1080
type Mesure = { nom: string; moyenne: number; p95: number; max: number };
function mesurer(): Mesure[] {
	const toile = new OffscreenCanvas(LARGEUR, HAUTEUR);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	const parProcede = new Map<string, number[]>();
	for (let i = 0; i < images; i++) {
		const nom = segments[Math.min(segments.length - 1, Math.floor(i / IPS / DUREE))].procede.nom;
		const t0 = performance.now();
		dessiner(ctx, i / IPS, 1);
		ctx.getImageData(0, 0, 1, 1); // force la fin du rendu pour que la mesure le compte
		const duree = performance.now() - t0;
		parProcede.set(nom, [...(parProcede.get(nom) ?? []), duree]);
	}
	const resume = (nom: string, v: number[]): Mesure => {
		const tries = [...v].sort((a, b) => a - b);
		return { nom, moyenne: v.reduce((a, b) => a + b, 0) / v.length, p95: tries[Math.floor(tries.length * 0.95)], max: tries[tries.length - 1] };
	};
	const toutes = [...parProcede.values()].flat();
	return [...[...parProcede].map(([nom, v]) => resume(nom, v)), resume("Ensemble", toutes)];
}

el<HTMLButtonElement>("mesurer").addEventListener("click", () => {
	etat.textContent = "Mesure en cours";
	// laisse l'interface afficher l'etat avant la boucle de mesure (bloquante)
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
		Object.assign(window, { mesuresVisuel: r });
	}, 0);
});

const btnExport = el<HTMLButtonElement>("export");
btnExport.addEventListener("click", async () => {
	btnExport.disabled = true;
	try {
		const r = await exporter(moteur, null, (p) => (etat.textContent = `Image ${p.image} / ${p.total}`));
		const s = r.stats;
		etat.textContent = `${r.format.extension}, ${s.images} images, ${(s.octets / 1e6).toFixed(1)} Mo, dessin moyen ${s.dessinMoyenMs.toFixed(1)} ms (p95 ${s.dessinP95Ms.toFixed(1)}, max ${s.dessinMaxMs.toFixed(1)})`;
		const lien = el<HTMLAnchorElement>("telecharger");
		lien.href = URL.createObjectURL(r.fichier);
		lien.download = `planche-visuel.${r.format.extension}`;
		lien.hidden = false;
		Object.assign(window, { exportVisuel: r });
	} catch (err) {
		etat.textContent = `Erreur : ${(err as Error).message}`;
	} finally {
		btnExport.disabled = false;
	}
});

Object.assign(window, { imagesPlanche, colonnesPlanche: MARQUES.length * 2, dessinerPlanche: dessiner });
for (const id of ["lecture", "mesurer", "export"]) el<HTMLButtonElement>(id).disabled = false;
montrer(0);
