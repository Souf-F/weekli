import type { MotsAccent } from "@weekli/core";
import type { Ctx2D, Scene } from "../../scene";
import { dessinerFrappe, FRAPPE, finFrappe } from "../../visuel/cinetique";
import { avancement, easeInOutCubic, easeOutCubic, interpoler } from "../../visuel/courbes";
import { dessinerFondClair } from "../../visuel/fonds";
import { type Ambiance, type Bloc, mettreEnPage } from "../../visuel/typo";
import { blocCentre, type Identite } from "./commun";

// Rupture (design.md 8.9), calee sur la reference de 12,3 a 16,6 s : fond clair, 0,65 s de silence,
// frappe centree en 112 px avec le curseur carre. Comme la reference, la partie accentuee finale
// passe a la ligne. Quand le texte est fini, il s'efface et le curseur seul glisse au centre en
// grandissant : il annonce les pixels de la revelation.

const TENUE = 0.45; // le texte fini reste lisible avant de s'effacer
const DEPLACEMENT = 0.5;
const CURSEUR_FINAL = 120;
const TRANSPARENT = "rgba(0, 0, 0, 0)";

// Une ou deux lignes tapees l'une apres l'autre
function decouper(ctx: Ctx2D, texte: MotsAccent, ambiance: Ambiance): Bloc[] {
	const options = { niveau: "grand", echelle: 1.08, ambiance, x: 960, largeur: 1500, alignement: "centre" } as const;
	const { accent } = texte;
	const debutAccent = accent ? texte.texte.lastIndexOf(accent) : -1;
	if (accent && debutAccent > 0 && debutAccent + accent.length === texte.texte.length) {
		const avant = mettreEnPage(ctx, texte.texte.slice(0, debutAccent).trim(), { ...options, y: 0, lignesMax: 1 });
		const apres = mettreEnPage(ctx, { texte: accent, accent }, { ...options, y: 0, lignesMax: 1 });
		// la coupe n'a lieu que si chaque partie tient sur une ligne a pleine taille
		if (!avant.reduit && !apres.reduit && !avant.coupe && !apres.coupe) {
			const haut = Math.round(540 - avant.interligne);
			return [
				mettreEnPage(ctx, texte.texte.slice(0, debutAccent).trim(), { ...options, y: haut, lignesMax: 1 }),
				mettreEnPage(ctx, { texte: accent, accent }, { ...options, y: haut + Math.round(avant.interligne), lignesMax: 1 }),
			];
		}
	}
	return [blocCentre(ctx, texte, { ...options, lignesMax: 3 }, 540)];
}

export function creerRupture(identite: Identite): Scene {
	return {
		dessiner(ctx, i, p) {
			if (i.donnees.type !== "rupture") return;
			const s = i.secondes;
			const duree = i.scene.duree;
			dessinerFondClair(ctx, p, { secondes: s, temps: i.temps, graine: i.graine });
			const blocs = decouper(ctx, i.donnees.texte, identite.ambiance);
			const debuts = [0.15 * duree];
			for (let k = 1; k < blocs.length; k++) debuts.push(finFrappe(blocs[k - 1], debuts[k - 1]) + FRAPPE.pas);
			const derniere = blocs[blocs.length - 1];
			const fin = finFrappe(derniere, debuts[debuts.length - 1]);
			const depart = fin + TENUE;
			// le final n'a lieu que s'il reste le temps de le voir
			const final = depart + DEPLACEMENT + 0.25 <= duree;
			const effacement = final ? easeOutCubic(avancement(s, depart, 0.22)) : 0;
			if (effacement < 1) {
				ctx.save();
				ctx.globalAlpha = 1 - effacement;
				blocs.forEach((bloc, k) => {
					if (k > 0 && s < debuts[k]) return; // ligne pas encore commencee : ni texte ni curseur
					// une ligne garde son curseur jusqu'a ce que la suivante commence
					const actif = (k === blocs.length - 1 || s < debuts[k + 1]) && !(final && s >= depart);
					dessinerFrappe(ctx, bloc, s, { debut: debuts[k], couleur: p.encre, couleurAccent: p.accentClair, curseur: actif ? p.accentClair : TRANSPARENT });
				});
				ctx.restore();
			}
			if (!final || s < depart) return;
			const dernier = derniere.fragments[derniere.fragments.length - 1];
			const cote = derniere.taille * FRAPPE.curseur;
			const x0 = dernier ? dernier.x + dernier.largeur + derniere.taille * 0.08 : 960 - cote / 2;
			const y0 = dernier ? dernier.y - cote : 540 - cote / 2;
			const k = easeInOutCubic(avancement(s, depart, DEPLACEMENT));
			const c = interpoler(cote, CURSEUR_FINAL, k);
			ctx.fillStyle = p.accentClair;
			ctx.fillRect(interpoler(x0 + cote / 2, 960, k) - c / 2, interpoler(y0 + cote / 2, 540, k) - c / 2, c, c);
		},
	};
}
