import { alea } from "../../aleatoire";
import type { Scene } from "../../scene";
import { avancement, easeOutCubic, interpoler } from "../../visuel/courbes";
import { dessinerMotParMot } from "../../visuel/cinetique";
import { blocCentre, flou, fondTension, type Identite, tuileBulle } from "./commun";

// Chorus (design.md 8.9), cale sur la reference de 9,3 a 12,6 s : le titre au centre en 161 px,
// les bulles surgissent autour en ressort ; a 52 % la chute remplace le titre (accent d'alerte)
// pendant que les bulles tombent en tournant et se floutent.

// Centres releves sur la reference (image a 10,5 s), queue du cote du bord le plus proche
const PLACES = [
	{ x: 394, y: 282, queue: "gauche" },
	{ x: 1524, y: 270, queue: "droite" },
	{ x: 324, y: 744, queue: "gauche" },
	{ x: 1594, y: 756, queue: "droite" },
	{ x: 700, y: 924, queue: "gauche" },
	{ x: 1240, y: 932, queue: "droite" },
] as const;
// ordre de remplissage : equilibre gauche et droite, haut et bas, quel que soit le nombre de bulles
const ORDRE = [0, 3, 1, 4, 2, 5];
const CHUTE_T = 0.52;
const GRAVITE = 2600; // px/s2

// Ressort amorti : 0 vers 1 avec un leger depassement
const ressort = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6 * k) * Math.cos(k * 9));

export function creerChorus(identite: Identite): Scene {
	return {
		dessiner(ctx, i, p) {
			if (i.donnees.type !== "chorus") return;
			const { titre, chute, bulles } = i.donnees;
			const s = i.secondes;
			const duree = i.scene.duree;
			const ambiance = identite.ambiance;
			fondTension(ctx, i, p);

			const tChute = CHUTE_T * duree;
			const options = { niveau: "grand", echelle: 1.55, ambiance, x: 960, largeur: 1300, lignesMax: 2, alignement: "centre" } as const;
			const sortieTitre = easeOutCubic(avancement(s, tChute, 0.2));
			if (sortieTitre < 1) {
				const bloc = blocCentre(ctx, titre, options, 565);
				ctx.save();
				ctx.translate(0, -30 * sortieTitre);
				ctx.globalAlpha = 1 - sortieTitre;
				dessinerMotParMot(ctx, bloc, s, { debut: 0.12 * duree, ecart: 0.11, couleur: p.blanc, couleurAccent: p.accentSombre });
				ctx.restore();
			}
			const blocChute = blocCentre(ctx, chute, options, 565);
			dessinerMotParMot(ctx, blocChute, s, { debut: tChute + 0.08, ecart: 0.1, couleur: p.blanc, couleurAccent: p.alerteSombre });

			const hasard = alea(i.graine ^ 0x51ed);
			bulles.slice(0, PLACES.length).forEach((texte, k) => {
				const place = PLACES[ORDRE[k]];
				const sens = hasard() < 0.5 ? -1 : 1;
				const rotation = sens * (60 + hasard() * 70);
				const derive = (hasard() * 2 - 1) * 90;
				const inclinaison = (hasard() * 2 - 1) * 4;
				const apparition = ressort(avancement(s, 0.2 * duree + k * 0.12, 0.7));
				if (apparition <= 0) return;
				const debutChute = tChute - 0.12 + k * 0.07;
				const tau = Math.max(0, s - debutChute);
				const { source, largeur, hauteur } = tuileBulle(ctx, texte, place.queue, p);
				// point d'ancrage : la pointe de la queue (la bulle sort de la bouche du locuteur)
				const ax = place.queue === "gauche" ? -largeur / 2 + 32 : largeur / 2 - 32;
				const ay = hauteur / 2;
				ctx.save();
				ctx.translate(place.x + ax + derive * tau, place.y + ay + 0.5 * GRAVITE * tau * tau + Math.sin(s * 1.6 + k) * 4);
				ctx.rotate(((inclinaison + rotation * tau * (1 + tau)) * Math.PI) / 180);
				const e = interpoler(0.2, 1, apparition);
				ctx.scale(e, e);
				ctx.globalAlpha = Math.min(1, apparition * 1.5);
				flou(ctx, Math.min(6, tau * 14), i.contexte.filtre);
				ctx.drawImage(source, -largeur / 2 - ax, -hauteur / 2 - ay, largeur, hauteur);
				ctx.restore();
			});
		},
	};
}
