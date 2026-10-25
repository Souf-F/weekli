import type { Carte, Palette } from "@weekli/core";
import { type Ctx2D, HAUTEUR, type InstantScene, LARGEUR, type Scene } from "../../scene";
import { avecAlpha } from "../../visuel/couleur";
import { avancement, easeInOutCubic, easeOutCubic, easeOutExpo, interpoler } from "../../visuel/courbes";
import { dessinerMotParMot } from "../../visuel/cinetique";
import { dessinerImpact, secousseImpact } from "../../visuel/impact";
import { blocCentre, dessinerCarte, fondTension, type Identite, type PoseCarte } from "./commun";

// Repetition (design.md 8.9), calee sur la reference de 1,85 a 5,9 s. Premiere ligne en 205 px a
// gauche, la carte inclinee a droite ; les lignes suivantes montent en haut au centre et la carte
// glisse sous elles, au centre, avec des ondes. A 60 % : le mot d'impact plein ecran sur fond rougi,
// puis a 74 % un mur de 7 x 7 cartes identiques derriere lui.

const IMPACT_T = 0.6;
const MUR_T = 0.74;
const SORTIE = { duree: 0.18, montee: 40 };
const MUR = { colonnes: 7, lignes: 7, pasX: 155, pasY: 102, echelle: 0.344, centre: { x: 960, y: 560 } };

const POSE_DROITE: PoseCarte = { x: 1395, y: 530, echelle: 1.5, angle: 4 };
const POSE_CENTRE: PoseCarte = { x: 960, y: 560, echelle: 1, angle: 0 };

function poseInterpolee(a: PoseCarte, b: PoseCarte, k: number): PoseCarte {
	return {
		x: interpoler(a.x, b.x, k),
		y: interpoler(a.y, b.y, k),
		echelle: interpoler(a.echelle ?? 1, b.echelle ?? 1, k),
		angle: interpoler(a.angle ?? 0, b.angle ?? 0, k),
	};
}

// Ondes concentriques qui se resserrent sur la carte quand une ligne la reprend
function dessinerOndes(ctx: Ctx2D, p: Palette, secondes: number, debut: number) {
	const k = avancement(secondes, debut, 0.6);
	if (k <= 0 || k >= 1) return;
	ctx.save();
	ctx.strokeStyle = avecAlpha(p.accentSombre, 0.5 * (1 - k));
	ctx.lineWidth = 2;
	for (const n of [0, 1, 2]) {
		const e = interpoler(1.7 + n * 0.12, 1, easeOutCubic(k));
		ctx.beginPath();
		ctx.ellipse(POSE_CENTRE.x, POSE_CENTRE.y, 330 * e + n * 18, 190 * e + n * 12, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.restore();
}

function dessinerMur(ctx: Ctx2D, i: InstantScene, carte: Carte, debut: number) {
	const s = i.secondes;
	if (s < debut) return;
	const { colonnes, lignes, pasX, pasY, echelle, centre } = MUR;
	for (let l = 0; l < lignes; l++) {
		for (let c = 0; c < colonnes; c++) {
			const dx = c - (colonnes - 1) / 2;
			const dy = l - (lignes - 1) / 2;
			// les cartes se posent du centre vers les bords
			const k = easeOutExpo(avancement(s, debut + Math.hypot(dx, dy) * 0.035, 0.3));
			if (k <= 0) continue;
			dessinerCarte(ctx, i, carte, { x: centre.x + dx * pasX, y: centre.y + dy * pasY, echelle: echelle * interpoler(0.7, 1, k), alpha: 0.9 * k });
		}
	}
}

export function creerRepetition(identite: Identite): Scene {
	return {
		dessiner(ctx, i, p) {
			if (i.donnees.type !== "repetition") return;
			const { lignes, impact, carte } = i.donnees;
			const s = i.secondes;
			const duree = i.scene.duree;
			const ambiance = identite.ambiance;
			const tImpact = IMPACT_T * duree;
			const tMur = MUR_T * duree;
			const enImpact = s >= tImpact;

			const secousse = secousseImpact(s, tImpact, i.graine);
			// la secousse decale le cadre : le bord decouvert reste de la couleur du fond
			ctx.fillStyle = p.sombre;
			ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
			ctx.save();
			ctx.translate(secousse.x, secousse.y);
			const alerte = enImpact ? interpoler(1, 0.35, easeOutCubic(avancement(s, tImpact, tMur - tImpact))) : 0;
			fondTension(ctx, i, p, { alerte });

			if (!enImpact) {
				const n = Math.max(1, lignes.length);
				const fenetre = tImpact / n;
				const k = Math.min(n - 1, Math.floor(s / fenetre));
				const debutLigne = k * fenetre;
				// la ligne courante ; la precedente sort vers le haut pendant que la nouvelle entre
				for (const rang of [k - 1, k]) {
					if (rang < 0) continue;
					const sortie = rang < k ? easeOutCubic(avancement(s, debutLigne, SORTIE.duree)) : 0;
					if (sortie >= 1) continue;
					const enHaut = !!carte && rang > 0;
					const bloc = carte
						? enHaut
							? blocCentre(ctx, lignes[rang], { niveau: "grand", echelle: 1.08, ambiance, x: 960, largeur: 1600, lignesMax: 2, alignement: "centre" }, 190)
							: blocCentre(ctx, lignes[rang], { niveau: "affiche", echelle: 1.28, ambiance, x: 210, largeur: 860, lignesMax: 3 }, 530)
						: blocCentre(ctx, lignes[rang], { niveau: "affiche", echelle: 1.28, ambiance, x: 960, largeur: 1600, lignesMax: 3, alignement: "centre" }, 540);
					const mots = Math.max(1, bloc.mots - 1);
					const ecart = Math.min(0.35, (fenetre * 0.5) / mots);
					ctx.save();
					ctx.translate(0, -SORTIE.montee * sortie);
					ctx.globalAlpha = 1 - sortie;
					dessinerMotParMot(ctx, bloc, s, {
						debut: rang * fenetre + 0.12,
						ecart,
						couleur: p.blanc,
						// la derniere ligne porte l'alerte ; les premieres, l'accent (comme la reference)
						couleurAccent: rang === n - 1 ? p.alerteSombre : p.accentSombre,
					});
					ctx.restore();
				}
				if (carte) {
					const entree = easeOutExpo(avancement(s, 0.05, 0.55));
					const versCentre = n > 1 ? easeInOutCubic(avancement(s, fenetre, 0.45)) : 0;
					const pose = poseInterpolee({ ...POSE_DROITE, x: POSE_DROITE.x + (1 - entree) * 260 }, POSE_CENTRE, versCentre);
					if (n > 1) for (let r = 1; r < n; r++) dessinerOndes(ctx, p, s, r * fenetre + 0.1);
					dessinerCarte(ctx, i, carte, { ...pose, alpha: entree, ombre: true });
				}
			} else {
				if (carte) dessinerMur(ctx, i, carte, tMur);
				const bloc = blocCentre(ctx, impact, { niveau: "impact", echelle: 1.25, majuscules: ambiance === "nette", ambiance, x: 960, largeur: 1680, lignesMax: 2, alignement: "centre" }, 560);
				dessinerImpact(ctx, bloc, s, { debut: tImpact, couleur: p.alerteSombre });
			}
			ctx.restore();
		},
	};
}
