import type { MotsAccent, Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { HAUTEUR, LARGEUR } from "../../scene";
import {
	avancement,
	avecAlpha,
	dessinerFondClair,
	dessinerLettres,
	easeInCubic,
	easeInOutCubic,
	easeOutExpo,
	interpoler,
	mettreEnPage,
	rebond,
} from "../../visuel";
import {
	type Contexte,
	dessinerBouton,
	dessinerTitre,
	ECHELLE_ACTION,
	ECHELLE_GRAND,
	entree,
	finTitre,
	glissementFleche,
	mesurerBouton,
	mettreTitre,
} from "./commun";

// Scene `appel` (design.md 8.9, reference 47 a 53 s) : question centree, badge pilule dont la partie
// accentuee se remplit, mot d'action en lettres qui tombent, bouton pilule. Sortie : une bulle sombre
// grandit depuis le bouton et couvre l'image, la fin (sombre) prend le relais.

type DonneesAppel = Extract<ScenePub, { type: "appel" }>;

const BADGE = { taille: 57, hauteur: 128, marge: 44, ecart: 18 };
const ECARTS = { question: 52, badge: 64, action: 58 };
const BULLE = 0.5; // secondes de sortie
// la bulle couvre l'image avant la transition d'entree de la fin (flou de 0,5 s), sinon elle serait floutee
const AVANT_FIN = 0.45;
const ECART_QUESTION = 0.1; // interligne de la reference entre les deux parties de la question
const POLICE = (graisse: number, taille: number) => `${graisse} ${taille}px "Geist", ui-sans-serif, system-ui, sans-serif`;

// Decoupe du badge : avant, accent, apres
function morceauxBadge(b: MotsAccent) {
	const accent = b.accent?.trim();
	const k = accent ? b.texte.indexOf(accent) : -1;
	if (!accent || k < 0) return { avant: b.texte.trim(), accent: "", apres: "" };
	return { avant: b.texte.slice(0, k).trim(), accent, apres: b.texte.slice(k + accent.length).trim() };
}

export function creerAppel(c: Contexte): Scene {
	function dessinerBadge(ctx: Ctx2D, badge: MotsAccent, cx: number, y: number, s: number, debut: number, p: Palette) {
		const m = morceauxBadge(badge);
		ctx.save();
		ctx.font = POLICE(600, BADGE.taille);
		if ("letterSpacing" in ctx) ctx.letterSpacing = "-1px";
		const l = (t: string) => (t ? ctx.measureText(t).width : 0);
		const bloc = m.accent ? l(m.accent) + BADGE.marge * 1.3 : 0;
		const largeur = Math.min(LARGEUR - 240, l(m.avant) + l(m.apres) + bloc + BADGE.marge * 2 + (m.avant ? BADGE.ecart : 0) + (m.apres ? BADGE.ecart : 0));
		const x = cx - largeur / 2;
		const h = BADGE.hauteur;
		const e = easeOutExpo(avancement(s, debut, 0.5));
		const ech = interpoler(0.88, 1, e) * rebond(avancement(s, debut + 0.05, 0.3), 1.03);
		ctx.globalAlpha *= e;
		ctx.translate(cx, y + h / 2);
		ctx.scale(ech, ech);
		ctx.translate(-cx, -(y + h / 2));
		const k = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
		ctx.save();
		ctx.shadowColor = avecAlpha(p.sombre, 0.14);
		ctx.shadowBlur = 50 * k;
		ctx.shadowOffsetY = 18 * k;
		ctx.fillStyle = p.surface;
		ctx.beginPath();
		ctx.roundRect(x, y, largeur, h, h / 2);
		ctx.fill();
		ctx.restore();

		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.fillStyle = p.encre;
		let xx = x + BADGE.marge;
		const yy = y + h / 2 + 2;
		if (m.avant) {
			ctx.fillText(m.avant, xx, yy);
			xx += l(m.avant) + BADGE.ecart;
		}
		if (m.accent) {
			// le bloc d'accent se remplit de gauche a droite, le texte passe au blanc
			const hb = h - 30;
			const pb = easeInOutCubic(avancement(s, debut + 0.45, 0.32));
			ctx.fillStyle = avecAlpha(p.accentClair, 0.12);
			ctx.beginPath();
			ctx.roundRect(xx - 8, y + 15, bloc, hb, hb / 2);
			ctx.fill();
			ctx.fillStyle = p.accentClair;
			ctx.fillText(m.accent, xx + BADGE.marge * 0.65 - 8, yy);
			if (pb > 0) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(xx - 8, y, bloc * pb, h);
				ctx.clip();
				ctx.beginPath();
				ctx.roundRect(xx - 8, y + 15, bloc, hb, hb / 2);
				ctx.fill();
				ctx.fillStyle = p.blanc;
				ctx.fillText(m.accent, xx + BADGE.marge * 0.65 - 8, yy);
				ctx.restore();
			}
			xx += bloc + BADGE.ecart - 8;
		}
		if (m.apres) {
			ctx.fillStyle = p.encre;
			ctx.fillText(m.apres, xx, yy);
		}
		if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
		ctx.restore();
	}

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as DonneesAppel;
		const s = i.secondes;
		const duree = i.scene.duree;
		dessinerFondClair(ctx, p, { secondes: s, temps: i.temps, graine: i.graine });

		const question = mettreTitre(ctx, d.question, {
			niveau: "grand",
			x: LARGEUR / 2,
			y: 0,
			largeur: 1500,
			echelle: ECHELLE_GRAND,
			ambiance: c.ambiance,
			alignement: "centre",
			lignesMax: 2,
			ecart: ECART_QUESTION,
		});
		const action = mettreEnPage(ctx, d.action, { niveau: "affiche", x: LARGEUR / 2, y: 0, largeur: 1600, lignesMax: 1, alignement: "centre", echelle: ECHELLE_ACTION, ambiance: c.ambiance });
		const bouton0 = mesurerBouton(ctx, d.bouton, LARGEUR / 2, 0, 34, 1100);

		// pile verticale centree : question, badge, action, bouton (hauteurs mesurees, puis mise en place)
		const hBadge = d.badge ? BADGE.hauteur + ECARTS.badge : 0;
		const total = question.hauteur + ECARTS.question + hBadge + action.hauteur + ECARTS.action + bouton0.hauteur;
		const haut = Math.max(70, (HAUTEUR - total) / 2);
		const yBadge = haut + question.hauteur + ECARTS.question;
		const yAction = yBadge + hBadge;
		const yBouton = yAction + action.hauteur + ECARTS.action;

		const q = mettreTitre(ctx, d.question, { niveau: "grand", x: LARGEUR / 2, y: haut, largeur: 1500, echelle: ECHELLE_GRAND, ambiance: c.ambiance, alignement: "centre", lignesMax: 2, ecart: ECART_QUESTION });
		const a = mettreEnPage(ctx, d.action, { niveau: "affiche", x: LARGEUR / 2, y: yAction, largeur: 1600, lignesMax: 1, alignement: "centre", echelle: ECHELLE_ACTION, ambiance: c.ambiance });
		for (const b of q.blocs) c.signalerCoupe(d.id, b, d.question.texte);
		c.signalerCoupe(d.id, a, d.action);

		const debutQuestion = 0.1;
		dessinerTitre(ctx, q, s, { debut: debutQuestion, couleur: p.encre, accent: p.accentClair });
		const debutBadge = finTitre(q, debutQuestion) + 0.05;
		if (d.badge) dessinerBadge(ctx, d.badge, LARGEUR / 2, yBadge, s, debutBadge, p);
		const debutAction = Math.min(duree * 0.42, (d.badge ? debutBadge + 0.55 : debutBadge));
		dessinerLettres(ctx, a, s, { debut: debutAction, couleur: p.accentClair, particules: p.accentClair, graine: i.graine });

		const b = { ...bouton0, y: yBouton, centreY: yBouton + bouton0.hauteur / 2 };
		const debutBouton = Math.min(duree * 0.6, debutAction + 0.55);
		const eb = entree(s, debutBouton, 0.5, 24);
		dessinerBouton(ctx, b, d.bouton, {
			fond: p.accentClair,
			texte: p.blanc,
			glissement: glissementFleche(s, debutBouton + 0.4),
			alpha: eb.alpha,
			dy: eb.dy,
			ombre: avecAlpha(p.accentClair, 0.3),
		});

		// sortie : bulle sombre qui grandit depuis le bouton, liseres clairs sur son bord
		const pb = avancement(s, duree - AVANT_FIN - BULLE, BULLE);
		if (pb > 0) {
			const cx = b.centreX;
			const cy = b.centreY;
			const rMax = Math.hypot(Math.max(cx, LARGEUR - cx), Math.max(cy, HAUTEUR - cy)) + 40;
			const r = rMax * easeInCubic(pb) * 0.85 + rMax * 0.15 * pb;
			ctx.save();
			for (const [ecart, alpha] of [
				[34, 0.12],
				[18, 0.22],
			] as const) {
				ctx.fillStyle = avecAlpha(p.accentSombre, alpha);
				ctx.beginPath();
				ctx.arc(cx, cy, r + ecart, 0, Math.PI * 2);
				ctx.fill();
			}
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
			g.addColorStop(0, p.sombreHalo);
			g.addColorStop(1, p.sombre);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	return { dessiner };
}
