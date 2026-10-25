import type { Scene } from "../../scene";
import { dessinerFrappe, FRAPPE, finFrappe } from "../../visuel/cinetique";
import { avancement, easeInOutCubic, easeOutCubic, interpoler } from "../../visuel/courbes";
import { dessinerFondClair } from "../../visuel/fonds";
import { blocCentre, type Identite } from "./commun";

// Rupture (design.md 8.9), calee sur la reference de 12,3 a 16,6 s : fond clair, 0,55 s de silence,
// frappe centree en 112 px avec le curseur carre. Quand le texte est fini, il s'efface et le curseur
// seul glisse au centre en grandissant : il annonce les pixels de la revelation.

const TENUE = 0.45; // le texte fini reste lisible avant de s'effacer
const DEPLACEMENT = 0.5;
const CURSEUR_FINAL = 120;

export function creerRupture(identite: Identite): Scene {
	return {
		dessiner(ctx, i, p) {
			if (i.donnees.type !== "rupture") return;
			const s = i.secondes;
			const duree = i.scene.duree;
			dessinerFondClair(ctx, p, { secondes: s, temps: i.temps, graine: i.graine });
			const bloc = blocCentre(ctx, i.donnees.texte, { niveau: "grand", echelle: 1.08, ambiance: identite.ambiance, x: 960, largeur: 1500, lignesMax: 3, alignement: "centre" }, 540);
			const debut = 0.13 * duree;
			const fin = finFrappe(bloc, debut);
			const depart = fin + TENUE;
			// le final n'a lieu que s'il reste le temps de le voir
			const final = depart + DEPLACEMENT + 0.25 <= duree;
			if (!final || s < depart) {
				dessinerFrappe(ctx, bloc, s, { debut, couleur: p.encre, couleurAccent: p.accentClair, curseur: p.accentClair });
				return;
			}
			const effacement = easeOutCubic(avancement(s, depart, 0.22));
			if (effacement < 1) {
				ctx.save();
				ctx.globalAlpha = 1 - effacement;
				dessinerFrappe(ctx, bloc, s, { debut, couleur: p.encre, couleurAccent: p.accentClair, curseur: "rgba(0, 0, 0, 0)" });
				ctx.restore();
			}
			const derniere = bloc.fragments[bloc.fragments.length - 1];
			const cote = bloc.taille * FRAPPE.curseur;
			const x0 = derniere ? derniere.x + derniere.largeur + bloc.taille * 0.08 : 960 - cote / 2;
			const y0 = derniere ? derniere.y - cote : 540 - cote / 2;
			const k = easeInOutCubic(avancement(s, depart, DEPLACEMENT));
			const c = interpoler(cote, CURSEUR_FINAL, k);
			ctx.fillStyle = p.accentClair;
			ctx.fillRect(interpoler(x0 + cote / 2, 960, k) - c / 2, interpoler(y0 + cote / 2, 540, k) - c / 2, c, c);
		},
	};
}
