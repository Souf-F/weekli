import type { Palette } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { avecAlpha } from "../../visuel/couleur";
import { avancement, easeInCubic, easeInOutCubic, easeOutCubic, easeOutExpo, interpoler } from "../../visuel/courbes";
import { dessinerMotParMot } from "../../visuel/cinetique";
import { blocQuiTient, CARTE, dessinerCarte, fondTension, type Identite } from "./commun";

// Boucle (design.md 8.9), calee sur la reference de 5,6 a 9,8 s : la phrase entre mot a mot en haut,
// au rythme de la voix ; six copies de la carte flottent en profondeur (petites, floues et pales au
// fond) ; une pastille en bas egrene les reperes. A chaque repere, une carte avance vers la camera,
// se floute et sort, puis revient au fond : la boucle.

type Emplacement = { x: number; y: number; e: number; a: number };

// Positions relevees sur la reference (images a 6,5 et 8,5 s), de la plus proche a la plus lointaine
const EMPLACEMENTS: Emplacement[] = [
	{ x: 600, y: 780, e: 1.2, a: -6 },
	{ x: 1320, y: 500, e: 0.86, a: 6 },
	{ x: 930, y: 668, e: 0.7, a: 0 },
	{ x: 1015, y: 470, e: 0.58, a: -8 },
	{ x: 760, y: 560, e: 0.5, a: 7 },
	{ x: 1190, y: 640, e: 0.46, a: -3 },
];
// cartes qui avancent, dans l'ordre des reperes (une carte du milieu se voit mieux partir)
const ORDRE_AVANCEE = [1, 2, 0, 3];
const AVANCEE = 0.85;
const RETOUR = 0.5;
const PASTILLE = { y: 990, hauteur: 60, taille: 28, marge: 30 };
const GEIST = `"Geist", ui-sans-serif, system-ui, sans-serif`;

function dessinerPastille(ctx: Ctx2D, p: Palette, reperes: string[], s: number, debut: number, pas: number) {
	if (s < debut || !reperes.length) return;
	const j = Math.min(reperes.length - 1, Math.floor((s - debut) / pas));
	const changement = easeOutCubic(avancement(s, debut + j * pas, 0.24));
	const apparition = easeOutExpo(avancement(s, debut, 0.4));
	ctx.save();
	ctx.font = `600 ${PASTILLE.taille}px ${GEIST}`;
	if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
	const largeurDe = (k: number) => ctx.measureText(reperes[k]).width + PASTILLE.marge * 2;
	const largeur = j > 0 ? interpoler(largeurDe(j - 1), largeurDe(j), changement) : largeurDe(0);
	const h = PASTILLE.hauteur;
	ctx.translate(960, PASTILLE.y);
	ctx.scale(interpoler(0.8, 1, apparition), interpoler(0.8, 1, apparition));
	ctx.globalAlpha = apparition;
	ctx.fillStyle = avecAlpha(p.blanc, 0.08);
	ctx.strokeStyle = avecAlpha(p.blanc, 0.24);
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(-largeur / 2, -h / 2, largeur, h, h / 2);
	ctx.fill();
	ctx.stroke();
	ctx.clip();
	ctx.fillStyle = p.blanc;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	// l'ancien repere monte et s'efface, le nouveau arrive par le bas
	if (j > 0 && changement < 1) {
		ctx.globalAlpha = apparition * (1 - changement);
		ctx.fillText(reperes[j - 1], 0, 2 - changement * 26);
		ctx.globalAlpha = apparition * changement;
		ctx.fillText(reperes[j], 0, 2 + (1 - changement) * 26);
	} else {
		ctx.fillText(reperes[j], 0, 2);
	}
	ctx.restore();
}

// Etat d'une carte : flottement continu, avancee vers la camera puis retour au fond
function etatCarte(rang: number, e0: Emplacement, s: number, avancees: number[]) {
	const phase = rang * 1.7;
	let x = e0.x + Math.cos(s * 0.8 + phase) * 10;
	let y = e0.y + Math.sin(s * 0.9 + phase) * 12;
	let e = e0.e;
	let alpha = interpoler(0.7, 1, (e0.e - 0.46) / 0.74);
	let flouCarte = Math.max(0, (0.66 - e0.e) * 9);
	const angle = e0.a + Math.sin(s * 0.7 + phase) * 1.5;
	for (const debut of avancees) {
		const k = avancement(s, debut, AVANCEE);
		if (k <= 0) continue;
		if (k < 1) {
			const a = easeInCubic(k);
			e = interpoler(e0.e, e0.e * 2.8 + 0.6, a);
			x = interpoler(x, x + (x - 960) * 1.3 + 220, a);
			y = interpoler(y, y + (y - 540) * 0.7, a);
			flouCarte = interpoler(flouCarte, 9, easeInCubic(Math.max(0, (k - 0.35) / 0.65)));
			alpha *= 1 - easeInCubic(Math.max(0, (k - 0.6) / 0.4));
			break;
		}
		// revenue au fond, elle remonte doucement a sa place
		const r = easeInOutCubic(avancement(s, debut + AVANCEE, RETOUR));
		e = interpoler(0.3, e0.e, r);
		alpha *= r;
	}
	return { x, y, e, alpha, angle, flou: flouCarte };
}

export function creerBoucle(identite: Identite): Scene {
	return {
		dessiner(ctx, i: InstantScene, p) {
			if (i.donnees.type !== "boucle") return;
			const { phrase, reperes, carte } = i.donnees;
			const s = i.secondes;
			const duree = i.scene.duree;
			fondTension(ctx, i, p);

			const debutReperes = 0.1 * duree;
			const pas = (duree * 0.86 - debutReperes) / Math.max(1, reperes.length);
			const avancees = reperes.slice(1).map((_, k) => debutReperes + (k + 1) * pas - 0.15);

			// cartes du fond vers l'avant ; une carte qui avance passe devant toutes les autres
			const cartes = EMPLACEMENTS.map((e0, rang) => {
				const propres = avancees.filter((_, k) => ORDRE_AVANCEE[k % ORDRE_AVANCEE.length] === rang);
				return { rang, ...etatCarte(rang, e0, s, propres) };
			}).sort((a, b) => a.e - b.e);
			const entree = easeOutExpo(avancement(s, 0.05 * duree, 0.6));
			for (const c of cartes) {
				const alpha = c.alpha * entree;
				dessinerCarte(ctx, i, carte, { x: c.x, y: c.y + (1 - entree) * 50, echelle: c.e, angle: c.angle, alpha, flou: c.flou, inclinaison: Math.sin(c.angle / 20) * 0.08 });
				// repere au-dessus de la carte, comme un tampon de date
				if (reperes.length && c.e < 1.3 && alpha > 0.05) {
					ctx.save();
					ctx.globalAlpha = alpha * 0.9;
					ctx.fillStyle = p.accentSombre;
					ctx.font = `700 ${Math.round(20 * c.e)}px ${GEIST}`;
					ctx.textAlign = "center";
					ctx.fillText(reperes[c.rang % reperes.length], c.x, c.y - (CARTE.hauteur / 2 + 14) * c.e);
					ctx.restore();
				}
			}

			const options = { niveau: "grand", ambiance: identite.ambiance, x: 960, largeur: 1500, lignesMax: 2, alignement: "centre" } as const;
			const bloc = blocQuiTient(ctx, phrase, [
				{ options, centre: 169 },
				{ options: { ...options, niveau: "titre", largeur: 1600, lignesMax: 3 }, centre: 190 },
			]);
			const debutPhrase = 0.09 * duree;
			const ecart = Math.min(0.3, (0.5 * duree) / Math.max(1, bloc.mots - 1));
			dessinerMotParMot(ctx, bloc, s, { debut: debutPhrase, ecart, couleur: p.blanc, couleurAccent: p.alerteSombre });
			dessinerPastille(ctx, p, reperes, s, debutReperes, pas);
		},
	};
}
