import type { Palette } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { avecAlpha } from "../../visuel/couleur";
import { avancement, easeInOutCubic, easeOutCubic, easeOutExpo, interpoler } from "../../visuel/courbes";
import { dessinerMotParMot, finMotParMot } from "../../visuel/cinetique";
import { choisirApparition } from "../../visuel/gestes";
import { dessinerApparition, finApparition } from "../../visuel/texte";
import { appliquerPolice, type Bloc, reinitialiserPolice } from "../../visuel/typo";
import { blocCentre, fondTension, type Identite } from "./commun";

// Ouverture (design.md 8.9), calee sur la reference de 0 a 1,85 s : un cadran fin se dessine,
// le moment geant (264 px, capitales) entre lettre par lettre avec une trainee, puis le detail
// en couleur d'accent. Le cadran tourne lentement.

const CENTRE = { x: 960, y: 524 };
const CADRAN = { interieur: 416, exterieur: 464, rotation: (8 * Math.PI) / 180, graduations: 12 };
const LETTRE = { ecart: 0.06, duree: 0.34, glisse: 70 };
// arcs du cercle exterieur (degres) : un trait interrompu, comme un cadran de montre
const ARCS: [number, number][] = [
	[-80, 40],
	[58, 170],
	[186, 262],
];

// `pose` : premiere scene de la pub (image zero, design.md 8.16), le cadran est deja complet a t = 0
function dessinerCadran(ctx: Ctx2D, p: Palette, secondes: number, duree: number, pose: boolean) {
	const trace = pose ? 1 : easeInOutCubic(avancement(secondes, 0.02 * duree, Math.min(0.7, 0.4 * duree)));
	if (trace <= 0) return;
	const apparition = pose ? 1 : easeOutExpo(avancement(secondes, 0, 0.6));
	ctx.save();
	ctx.translate(CENTRE.x, CENTRE.y);
	ctx.rotate(secondes * CADRAN.rotation);
	ctx.scale(interpoler(0.94, 1, apparition), interpoler(0.94, 1, apparition));
	ctx.lineCap = "round";
	const depart = -Math.PI / 2;
	// halo du cercle interieur, puis le trait net
	for (const [largeur, alpha] of [
		[8, 0.12],
		[2.5, 0.95],
	] as const) {
		ctx.strokeStyle = avecAlpha(p.accentSombre, alpha);
		ctx.lineWidth = largeur;
		ctx.beginPath();
		ctx.arc(0, 0, CADRAN.interieur, depart, depart + trace * Math.PI * 2);
		ctx.stroke();
	}
	ctx.strokeStyle = avecAlpha(p.accentSombre, 0.6);
	ctx.lineWidth = 1.5;
	for (const [a, b] of ARCS) {
		const fin = Math.min(b, a + (b - a) * trace * 1.15);
		if (fin <= a) continue;
		ctx.beginPath();
		ctx.arc(0, 0, CADRAN.exterieur, (a * Math.PI) / 180 + depart, (fin * Math.PI) / 180 + depart);
		ctx.stroke();
	}
	// graduations : elles suivent le trace du cercle
	ctx.strokeStyle = avecAlpha(p.blanc, 0.75);
	for (let k = 0; k < CADRAN.graduations; k++) {
		if (k / CADRAN.graduations > trace) break;
		const a = depart + (k / CADRAN.graduations) * Math.PI * 2;
		const longueur = k % 3 === 0 ? 26 : 16;
		ctx.lineWidth = k % 3 === 0 ? 2.5 : 1.5;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * (CADRAN.interieur + 8), Math.sin(a) * (CADRAN.interieur + 8));
		ctx.lineTo(Math.cos(a) * (CADRAN.interieur + 8 + longueur), Math.sin(a) * (CADRAN.interieur + 8 + longueur));
		ctx.stroke();
	}
	ctx.restore();
}

// Lettre par lettre : chaque lettre glisse depuis la gauche avec une trainee qui s'efface
function dessinerMoment(ctx: Ctx2D, bloc: Bloc, secondes: number, debut: number, couleur: string) {
	const apparition = easeOutExpo(avancement(secondes, debut, 0.7));
	if (secondes < debut) return;
	const cx = bloc.x + bloc.largeur / 2;
	const cy = bloc.y + bloc.hauteur / 2;
	const e = interpoler(0.9, 1, apparition);
	ctx.save();
	ctx.translate(cx, cy);
	ctx.scale(e, e);
	ctx.translate(-cx, -cy);
	ctx.textBaseline = "alphabetic";
	let rang = 0;
	for (const f of bloc.fragments) {
		appliquerPolice(ctx, bloc, f.accent);
		let prefixe = "";
		for (const lettre of f.texte) {
			const x = f.x + (prefixe ? ctx.measureText(prefixe).width : 0);
			prefixe += lettre;
			const p = avancement(secondes, debut + rang * LETTRE.ecart, LETTRE.duree);
			rang++;
			if (p <= 0) continue;
			const d = (1 - easeOutExpo(p)) * LETTRE.glisse;
			ctx.fillStyle = couleur;
			if (p < 0.6) {
				for (const k of [1, 2, 3]) {
					ctx.globalAlpha = 0.16 * (1 - p / 0.6);
					ctx.fillText(lettre, x - d - k * 16 * (1 - p), f.y);
				}
			}
			ctx.globalAlpha = easeOutCubic(Math.min(1, p * 1.6));
			ctx.fillText(lettre, x - d, f.y);
		}
	}
	reinitialiserPolice(ctx);
	ctx.restore();
}

export function creerOuverture(identite: Identite): Scene {
	return {
		dessiner(ctx, i: InstantScene, p) {
			if (i.donnees.type !== "ouverture") return;
			const { moment, detail } = i.donnees;
			const s = i.secondes;
			const duree = i.scene.duree;
			fondTension(ctx, i, p);
			// image zero : premiere scene de la pub, texte et cadran sont deja poses
			const premiere = i.scene.debut <= 0;
			dessinerCadran(ctx, p, s, duree, premiere);
			const ambiance = identite.ambiance;
			const bloc = blocCentre(
				ctx,
				moment,
				{ niveau: "affiche", echelle: 1.65, majuscules: ambiance === "nette", ambiance, x: CENTRE.x, largeur: 1560, lignesMax: 2, alignement: "centre" },
				490,
			);
			const debutMoment = 0.16 * duree;
			const procede = choisirApparition(i.contexte.gestes, ["glisse", "frappe", "mot"]);
			const finMoment = procede === "glisse" ? debutMoment + Math.max(0.7, (bloc.fragments.reduce((n, f) => n + [...f.texte].length, 0) - 1) * LETTRE.ecart + LETTRE.duree) : finApparition(procede, bloc, debutMoment);
			const sMoment = premiere ? Math.max(s, finMoment) : s;
			if (procede === "glisse") dessinerMoment(ctx, bloc, sMoment, debutMoment, p.blanc);
			else dessinerApparition(ctx, procede, bloc, sMoment, { debut: debutMoment, couleur: p.blanc, curseur: p.accentSombre, particules: p.accentSombre, graine: i.graine });
			if (detail) {
				const derniere = bloc.lignes[bloc.lignes.length - 1].y;
				const sous = blocCentre(ctx, detail, { niveau: "slogan", echelle: 1.8, ambiance, x: CENTRE.x, largeur: 1400, lignesMax: 1, alignement: "centre" }, derniere + 112);
				const debutDetail = 0.4 * duree;
				dessinerMotParMot(ctx, sous, premiere ? Math.max(s, finMotParMot(sous, debutDetail, 0.03)) : s, { debut: debutDetail, couleur: p.accentSombre, ecart: 0.03 });
			}
		},
	};
}
