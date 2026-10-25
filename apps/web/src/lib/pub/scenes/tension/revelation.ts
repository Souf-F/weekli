import type { Palette } from "@weekli/core";
import { alea } from "../../aleatoire";
import { type Ctx2D, HAUTEUR, type InstantScene, LARGEUR, type Scene } from "../../scene";
import { dessinerMotParMot, dessinerSoulignement, dessinerSurlignage, finMotParMot } from "../../visuel/cinetique";
import { avecAlpha } from "../../visuel/couleur";
import { avancement, easeInOutCubic, easeOutCubic, easeOutExpo, interpoler } from "../../visuel/courbes";
import { dessinerBloc, mettreEnPage } from "../../visuel/typo";
import { blocCentre, fondTension, type Identite } from "./commun";
import { type Grille, grilleImage, grilleMonogramme } from "./logo";

// Revelation (design.md 8.9), calee sur la reference de 16 a 22 s. Un point au centre, puis 300
// particules carrees convergent et forment le logo en grand (monogramme pixel ou logo importe),
// onde et eclat ; le logo se range a gauche du nom (160 px) qui se devoile ; slogan mot a mot en
// 56 px, partie accentuee surlignee ; signature en 96 px qui glisse puis se souligne. Les rayons
// s'ouvrent pendant la formation, la camera pousse de 1 a 1,04.

const T = { point: 0.03, convergence: 0.02, formation: 0.16, rangement: 0.24, nom: 0.17, slogan: 0.3, signature: 0.68 };
const PARTICULES = 300;
const GRAND = 468; // cote du logo forme au centre
const LOGO = 176; // cote du logo range a cote du nom
const ESPACE = 44;
const LIGNE = 394; // milieu des capitales du nom (reference)

type Boite = { x: number; y: number; cote: number }; // centre et cote

type Particule = { x: number; y: number; cote: number; alpha: number; couleur: string; cellule: boolean };

// Particule `j` a l'instant `s` : les premieres forment les cellules, les autres sont des eclats
function particules(grille: Grille, boite: Boite, s: number, duree: number, graine: number, p: Palette): Particule[] {
	const hasard = alea(graine ^ 0x9a7f);
	const n = grille.cellules.length;
	const total = Math.max(PARTICULES, n + 60);
	const tF = T.formation * duree;
	const fenetre = tF - T.convergence * duree;
	const pas = boite.cote / Math.max(grille.colonnes, grille.lignes);
	const resultat: Particule[] = [];
	const cellules: Particule[] = []; // dessinees apres les eclats : le logo reste net
	for (let j = 0; j < total; j++) {
		const angle = hasard() * Math.PI * 2;
		const rayon = 700 + hasard() * 600;
		const depart = T.convergence * duree + hasard() * fenetre * 0.4;
		const tourbillon = (hasard() * 2 - 1) * 160;
		const taille = 5 + hasard() * 10;
		const eclat = { a: hasard() * Math.PI * 2, r: hasard() * 260, v: 280 + hasard() * 640, clair: hasard() < 0.5 };
		const k = avancement(s, depart, fenetre * 0.6);
		if (k <= 0) continue;
		const sx = 960 + Math.cos(angle) * rayon;
		const sy = 540 + Math.sin(angle) * rayon;
		if (j < n) {
			const { c, l } = grille.cellules[j];
			const cx = boite.x + (c - (grille.colonnes - 1) / 2) * pas;
			const cy = boite.y + (l - (grille.lignes - 1) / 2) * pas;
			const e = easeInOutCubic(k);
			const courbe = Math.sin(e * Math.PI) * tourbillon;
			cellules.push({
				x: interpoler(sx, cx, e) - Math.sin(angle) * courbe,
				y: interpoler(sy, cy, e) + Math.cos(angle) * courbe,
				cote: interpoler(taille, pas * 0.86, e),
				alpha: Math.min(1, k * 3),
				couleur: p.blanc,
				cellule: true,
			});
			continue;
		}
		// eclat : converge en couronne autour du logo (jamais dessus), puis rejaillit et s'eteint
		const couronne = boite.cote * 0.55 + 20 + eclat.r * 0.3;
		const ex = boite.x + Math.cos(eclat.a) * couronne;
		const ey = boite.y + Math.sin(eclat.a) * couronne;
		const tau = Math.max(0, s - tF);
		const sortie = (eclat.v * (1 - Math.exp(-2.2 * tau))) / 2.2;
		const e = easeInOutCubic(k);
		const alpha = Math.min(1, k * 3) * (1 - avancement(tau, 0.2, 1.6 + eclat.r / 400));
		if (alpha <= 0.01) continue;
		resultat.push({
			x: interpoler(sx, ex, e) + Math.cos(eclat.a) * (sortie + eclat.r * avancement(tau, 0, 0.3)),
			y: interpoler(sy, ey, e) + Math.sin(eclat.a) * (sortie + eclat.r * avancement(tau, 0, 0.3)),
			cote: taille * 0.8,
			alpha,
			couleur: eclat.clair ? p.blanc : p.accentSombre,
			cellule: false,
		});
	}
	return [...resultat, ...cellules];
}

function dessinerOnde(ctx: Ctx2D, p: Palette, s: number, debut: number) {
	const k = avancement(s, debut, 0.8);
	if (k <= 0 || k >= 1) return;
	const e = easeOutCubic(k);
	ctx.save();
	ctx.strokeStyle = avecAlpha(p.accentSombre, 0.7 * (1 - k));
	ctx.lineWidth = interpoler(10, 1, k);
	ctx.beginPath();
	ctx.arc(960, 540, interpoler(80, 1000, e), 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

// Lueur d'accent au centre : eclat a la formation, puis un fond plus lumineux que celui de la tension
function dessinerLueur(ctx: Ctx2D, p: Palette, s: number, tF: number) {
	const montee = avancement(s, tF - 0.3, 0.3);
	const eclat = Math.max(0, 1 - Math.abs(s - tF) / 0.35);
	const force = 0.32 * montee + 0.25 * eclat;
	if (force <= 0) return;
	const g = ctx.createRadialGradient(960, 480, 0, 960, 480, 820);
	g.addColorStop(0, avecAlpha(p.accentSombre, force));
	g.addColorStop(0.45, avecAlpha(p.accentSombre, force * 0.3));
	g.addColorStop(1, avecAlpha(p.accentSombre, 0));
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}

function boiteLogo(s: number, duree: number, logo: Boite): Boite {
	const k = easeInOutCubic(avancement(s, T.formation * duree, (T.rangement - T.formation) * duree));
	return { x: interpoler(960, logo.x, k), y: interpoler(540, logo.y, k), cote: interpoler(GRAND, logo.cote, k) };
}

export function creerRevelation(identite: Identite): Scene {
	return {
		dessiner(ctx, i: InstantScene, p) {
			if (i.donnees.type !== "revelation") return;
			const { slogan, signature } = i.donnees;
			const s = i.secondes;
			const duree = i.scene.duree;
			const ambiance = identite.ambiance;
			const tF = T.formation * duree;
			const ouverture = easeOutExpo(avancement(s, 0.12 * duree, 0.25 * duree));
			fondTension(ctx, i, p, { rayons: { intensite: ouverture, ouverture } });
			dessinerLueur(ctx, p, s, tF);

			// poussee de camera sur tout le contenu
			const camera = interpoler(1, 1.04, easeOutCubic(i.t));
			ctx.save();
			ctx.translate(960, 540);
			ctx.scale(camera, camera);
			ctx.translate(-960, -540);

			// logo importe si present, sinon monogramme (design.md 8.11)
			const image = identite.logo === "image" ? i.contexte.images.get("logo") : undefined;
			const grilleIm = image ? grilleImage(image) : null;
			const grille = grilleIm?.cellules.length ? grilleIm : grilleMonogramme(identite.monogramme);

			// lockup : logo puis nom, centres ensemble sur la largeur
			// nom long : plus petit, puis sur deux lignes ; le lockup reste centre
			const nomLargeur = 1600 - LOGO - ESPACE;
			const essais = [1, 0.75, 0.56].map((echelle) => ({ niveau: "affiche", echelle, ambiance, largeur: nomLargeur, lignesMax: 1 }) as const);
			const choix = [...essais, { ...essais[2], lignesMax: 2 }].find((o) => !mettreEnPage(ctx, identite.nom, { ...o, x: 0, y: 0 }).coupe) ?? { ...essais[2], lignesMax: 2 };
			const essai = mettreEnPage(ctx, identite.nom, { ...choix, x: 0, y: 0 });
			const gauche = 960 - (LOGO + ESPACE + essai.largeur) / 2;
			const nom = blocCentre(ctx, identite.nom, { ...choix, x: gauche + LOGO + ESPACE }, LIGNE);
			const boite = boiteLogo(s, duree, { x: gauche + LOGO / 2, y: LIGNE, cote: LOGO });

			// le point qui attend, puis les particules
			const point = avancement(s, T.point * duree, 0.15) * (1 - avancement(s, tF - 0.2, 0.2));
			if (point > 0) {
				ctx.fillStyle = avecAlpha(p.blanc, point);
				ctx.fillRect(956, 536, 8, 8);
			}
			const fonduImage = image && grilleIm?.cellules.length ? easeOutCubic(avancement(s, 0.25 * duree, 0.35)) : 0;
			for (const q of particules(grille, boite, s, duree, i.graine, p)) {
				const alpha = q.cellule ? q.alpha * (1 - fonduImage) : q.alpha;
				if (alpha <= 0.01) continue;
				ctx.globalAlpha = alpha;
				ctx.fillStyle = q.couleur;
				ctx.beginPath();
				ctx.roundRect(q.x - q.cote / 2, q.y - q.cote / 2, q.cote, q.cote, q.cote * 0.18);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			if (image && fonduImage > 0) {
				const e = Math.min(boite.cote / image.width, boite.cote / image.height);
				ctx.globalAlpha = fonduImage;
				ctx.drawImage(image, boite.x - (image.width * e) / 2, boite.y - (image.height * e) / 2, image.width * e, image.height * e);
				ctx.globalAlpha = 1;
			}
			dessinerOnde(ctx, p, s, tF);

			// nom devoile depuis le logo
			const devoile = easeOutExpo(avancement(s, T.nom * duree, 0.5));
			if (devoile > 0) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(nom.x - 20, nom.y - 60, (nom.largeur + 60) * devoile, nom.hauteur + 120);
				ctx.clip();
				ctx.translate(-50 * (1 - devoile), 0);
				dessinerBloc(ctx, nom, p.blanc);
				ctx.restore();
			}

			const blocSlogan = blocCentre(ctx, slogan, { niveau: "slogan", echelle: 1.27, ambiance, x: 960, largeur: 1560, lignesMax: 2, alignement: "centre" }, 592);
			const debutSlogan = T.slogan * duree;
			const ecart = Math.min(0.2, (0.28 * duree) / Math.max(1, blocSlogan.mots - 1));
			dessinerMotParMot(ctx, blocSlogan, s, { debut: debutSlogan, ecart, couleur: p.blanc, accent: false });
			dessinerSurlignage(ctx, blocSlogan, s, { debut: finMotParMot(blocSlogan, debutSlogan, ecart) + 0.25, bloc: p.blanc, texte: p.sombre });

			if (signature) {
				const sig = blocCentre(ctx, signature, { niveau: "titre", echelle: 1.26, ambiance, x: 960, largeur: 1500, lignesMax: 1, alignement: "centre" }, blocSlogan.y + blocSlogan.hauteur + 118);
				const debutSig = T.signature * duree;
				const k = avancement(s, debutSig, 0.4);
				if (k > 0) {
					const d = (1 - easeOutExpo(k)) * 90;
					// trainee horizontale de l'arrivee (reference a 20,5 s)
					if (k < 0.6) {
						ctx.save();
						for (const n of [1, 2, 3]) {
							ctx.globalAlpha = 0.14 * (1 - k / 0.6);
							ctx.translate(d + n * 14 * (1 - k), 0);
							dessinerBloc(ctx, sig, p.blanc);
							ctx.translate(-(d + n * 14 * (1 - k)), 0);
						}
						ctx.restore();
					}
					ctx.save();
					ctx.globalAlpha = easeOutCubic(Math.min(1, k * 1.8));
					ctx.translate(d, 0);
					dessinerBloc(ctx, sig, p.blanc);
					ctx.restore();
					dessinerSoulignement(ctx, sig, s, { debut: debutSig + 0.45, couleur: p.accentSombre });
				}
			}
			ctx.restore();
		},
	};
}
