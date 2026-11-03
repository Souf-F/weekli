import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { HAUTEUR, LARGEUR } from "../../scene";
import {
	avancement,
	avecAlpha,
	dessinerFondSombre,
	dessinerMotParMot,
	easeInOutCubic,
	finMotParMot,
	mettreEnPage,
} from "../../visuel";
import { type Contexte, dessinerBlocVisible, ECHELLE_GRAND, entree, MARGE } from "./commun";

// Scene `preuve` (design.md 8.9, reference 42 a 47 s) : sur fond sombre, une introduction, puis les
// noms ou engagements s'empilent en Grand blanc, chacun souligne d'un filet ; les cartes d'engagement
// entrent a droite, decalees de 120 ms.

type DonneesPreuve = Extract<ScenePub, { type: "preuve" }>;

const LIGNE = 155; // pas vertical des elements (reference)
const FILET = 36; // distance entre la ligne de base et le filet
const CARTES = { x: 1188, largeur: 612, ecart: 30, marge: 34 };
const ECART_ELEMENTS = 0.42; // secondes entre deux elements
const POUSSEE = 0.03;

export function creerPreuve(c: Contexte): Scene {
	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as DonneesPreuve;
		const s = i.secondes;
		dessinerFondSombre(ctx, p, { secondes: s, temps: i.temps, graine: i.graine });

		ctx.save();
		const k = 1 + POUSSEE * i.t;
		ctx.translate(LARGEUR / 2, HAUTEUR / 2);
		ctx.scale(k, k);
		ctx.translate(-LARGEUR / 2, -HAUTEUR / 2);

		const cartes = (d.cartes ?? []).slice(0, 3);
		const elements = d.elements.slice(0, 4);
		const largeurColonne = cartes.length ? 890 : LARGEUR - 2 * MARGE;

		// hauteur du groupe pour le centrer verticalement
		const hSur = 64;
		const hauteur = hSur + 34 + elements.length * LIGNE;
		const haut = Math.round(HAUTEUR / 2 + 10 - hauteur / 2);

		const sur = mettreEnPage(ctx, d.surtitre, { niveau: "slogan", x: MARGE, y: haut, largeur: largeurColonne, lignesMax: 1, echelle: 0.96, ambiance: c.ambiance });
		c.signalerCoupe(d.id, sur, d.surtitre);
		const a = entree(s, 0.05, 0.5, 16);
		dessinerBlocVisible(ctx, sur, avecAlpha(p.blanc, 0.8), a.alpha, a.dy);

		let fin = 0.2;
		elements.forEach((texte, n) => {
			const y = haut + hSur + 34 + n * LIGNE;
			const bloc = mettreEnPage(ctx, texte, { niveau: "grand", x: MARGE - 4, y, largeur: largeurColonne, lignesMax: 1, echelle: ECHELLE_GRAND, ambiance: c.ambiance });
			c.signalerCoupe(d.id, bloc, texte);
			const debut = 0.22 + n * ECART_ELEMENTS;
			dessinerMotParMot(ctx, bloc, s, { debut, couleur: p.blanc, accent: false });
			// filet blanc 12 % qui se trace sous l'element
			const pf = easeInOutCubic(avancement(s, debut + 0.12, 0.5));
			if (pf > 0) {
				ctx.fillStyle = avecAlpha(p.blanc, 0.14);
				ctx.fillRect(MARGE, (bloc.lignes[0]?.y ?? y) + FILET, largeurColonne * pf, 1.5);
			}
			fin = finMotParMot(bloc, debut);
		});

		// cartes d'engagement : fond sombreHalo, bord blanc 10 %, entree depuis la droite
		if (cartes.length) {
			const mesures = cartes.map((carte) => {
				const titre = mettreEnPage(ctx, carte.titre, { niveau: "slogan", x: 0, y: 0, largeur: CARTES.largeur - CARTES.marge * 2 - 34, lignesMax: 1, echelle: 0.7, ambiance: "nette" });
				const texte = carte.texte
					? mettreEnPage(ctx, carte.texte, { niveau: "carte", x: 0, y: 0, largeur: CARTES.largeur - CARTES.marge * 2 - 34, lignesMax: 2, ambiance: "nette" })
					: null;
				c.signalerCoupe(d.id, titre, carte.titre);
				if (texte && carte.texte) c.signalerCoupe(d.id, texte, carte.texte);
				return { titre, texte, h: CARTES.marge * 2 + titre.hauteur + (texte ? 8 + texte.hauteur : 0) };
			});
			const total = mesures.reduce((a2, m) => a2 + m.h, 0) + CARTES.ecart * (cartes.length - 1);
			let y = Math.round(haut + hSur + 34 + (elements.length * LIGNE) / 2 - total / 2);
			const debutCartes = Math.min(fin + 0.1, i.scene.duree * 0.55);
			mesures.forEach((m, n) => {
				const e = entree(s, debutCartes + n * 0.12, 0.6, 0);
				if (e.alpha > 0) {
					ctx.save();
					ctx.globalAlpha *= e.alpha;
					ctx.translate((1 - e.e) * 120, 0);
					const x = CARTES.x;
					ctx.fillStyle = avecAlpha(p.sombreHalo, 0.55);
					ctx.strokeStyle = avecAlpha(p.blanc, 0.12);
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.roundRect(x, y, CARTES.largeur, m.h, 22);
					ctx.fill();
					ctx.stroke();
					ctx.fillStyle = p.blanc;
					const yTitre = y + CARTES.marge;
					const ligne = m.titre.lignes[0];
					const ligneDeBase = yTitre + (ligne ? ligne.y : 0);
					ctx.beginPath();
					ctx.roundRect(x + CARTES.marge, ligneDeBase - 19, 14, 14, 3);
					ctx.fill();
					ctx.save();
					ctx.translate(x + CARTES.marge + 34, yTitre);
					dessinerBlocVisible(ctx, m.titre, p.blanc, 1);
					if (m.texte) {
						ctx.translate(0, m.titre.hauteur + 8);
						dessinerBlocVisible(ctx, m.texte, avecAlpha(p.blanc, 0.72), 1);
					}
					ctx.restore();
					ctx.restore();
				}
				y += m.h + CARTES.ecart;
			});
		}
		ctx.restore();
	}

	return { dessiner };
}
