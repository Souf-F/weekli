import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { LARGEUR } from "../../scene";
import {
	avancement,
	avecAlpha,
	dessinerFondClair,
	dessinerMotParMot,
	easeInOutCubic,
	easeOutCubic,
	easeOutExpo,
	interpoler,
	mettreEnPage,
} from "../../visuel";
import { type Contexte, dessinerBlocVisible, dessinerTitre, ECHELLE_TITRE, entree, MARGE, mettreTitre } from "./commun";

// Scene `resultat` (design.md 8.9, reference 36 a 42 s). Une frise de semaines entre carte par carte :
// le probleme revient (`avant`), un tampon tombe sur la quatrieme, la cinquieme passe a la suite
// (`apres`), puis la frise glisse vers la gauche et la chute conclut.

type DonneesResultat = Extract<ScenePub, { type: "resultat" }>;

const CARTE = { largeur: 250, hauteur: 210, pas: 274, x0: 150, rayon: 16 };
const FRISE = { yEtiquette: 412, yCartes: 490, yPoints: 772 };
const NOMBRE = 8; // 6 cartes de la frise + 2 emplacements vides qui entrent en glissant
const AVANT = 3; // index 0 a 2 : avant ; 3 : tamponnee ; 4 : apres ; 5 et suivantes : a venir
const T = { cartes: 0.02, ecartCartes: 0.055, tampon: 0.3, titre: 0.34, glisse: 0.46, apres: 0.6, chute: 0.7 };
const GLISSEMENT = 1.45; // en pas de carte
const POLICE = (graisse: number, taille: number) => `${graisse} ${taille}px "Geist", ui-sans-serif, system-ui, sans-serif`;

function horloge(ctx: Ctx2D, x: number, y: number, r: number, couleur: string) {
	ctx.save();
	ctx.strokeStyle = couleur;
	ctx.lineWidth = 2.5;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.moveTo(x, y - r * 0.55);
	ctx.lineTo(x, y);
	ctx.lineTo(x + r * 0.45, y + r * 0.3);
	ctx.stroke();
	ctx.restore();
}

function coche(ctx: Ctx2D, x: number, y: number, t: number, couleur: string, epaisseur: number) {
	ctx.save();
	ctx.strokeStyle = couleur;
	ctx.lineWidth = epaisseur;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(x - t * 0.5, y);
	ctx.lineTo(x - t * 0.15, y + t * 0.35);
	ctx.lineTo(x + t * 0.5, y - t * 0.35);
	ctx.stroke();
	ctx.restore();
}

function drapeau(ctx: Ctx2D, x: number, y: number, t: number, couleur: string) {
	ctx.save();
	ctx.fillStyle = couleur;
	ctx.fillRect(x - t * 0.35, y - t * 0.5, t * 0.12, t);
	ctx.beginPath();
	ctx.moveTo(x - t * 0.23, y - t * 0.5);
	ctx.lineTo(x + t * 0.45, y - t * 0.27);
	ctx.lineTo(x - t * 0.23, y - t * 0.04);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

export function creerResultat(c: Contexte): Scene {
	function carte(ctx: Ctx2D, x: number, y: number, fond: string, bord: string, ombre: boolean) {
		if (ombre) {
			ctx.save();
			const k = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
			ctx.shadowColor = "rgba(8, 10, 40, 0.07)";
			ctx.shadowBlur = 30 * k;
			ctx.shadowOffsetY = 12 * k;
			ctx.fillStyle = fond;
			ctx.beginPath();
			ctx.roundRect(x, y, CARTE.largeur, CARTE.hauteur, CARTE.rayon);
			ctx.fill();
			ctx.restore();
		}
		ctx.fillStyle = fond;
		ctx.strokeStyle = bord;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(x + 0.5, y + 0.5, CARTE.largeur - 1, CARTE.hauteur - 1, CARTE.rayon);
		ctx.fill();
		ctx.stroke();
	}

	function texteCarte(ctx: Ctx2D, texte: string, x: number, y: number, couleur: string, d: DonneesResultat) {
		const bloc = mettreEnPage(ctx, texte, { niveau: "slogan", x, y, largeur: CARTE.largeur - 40, lignesMax: 2, echelle: 0.62, ambiance: "nette" });
		c.signalerCoupe(d.id, bloc, texte);
		dessinerBlocVisible(ctx, bloc, couleur, 1);
	}

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as DonneesResultat;
		const s = i.secondes;
		const duree = i.scene.duree;
		const aS = (t: number) => t * duree; // instant de la scene en secondes
		dessinerFondClair(ctx, p, { secondes: s, temps: i.temps, graine: i.graine });

		// surtitre et titre
		const sur = mettreEnPage(ctx, "Résultat", { niveau: "etiquette", x: MARGE, y: 150, largeur: 800, echelle: 1.1, ambiance: c.ambiance });
		const a = entree(s, 0.05, 0.5, 14);
		dessinerBlocVisible(ctx, sur, p.accentClair, a.alpha, a.dy);
		const titre = mettreTitre(ctx, d.titre, { niveau: "titre", x: MARGE, y: 196, largeur: LARGEUR - 2 * MARGE, echelle: ECHELLE_TITRE, ambiance: c.ambiance, lignesMax: 2, separer: false });
		for (const b of titre.blocs) c.signalerCoupe(d.id, b, d.titre.texte);
		dessinerTitre(ctx, titre, s, { debut: aS(T.titre), couleur: p.encre, accent: p.accentClair });
		const bas = 196 + titre.hauteur;
		const decalageY = Math.max(0, bas + 70 - FRISE.yEtiquette);

		// tampon : ecrasement 1,3 vers 1 en 160 ms, petite secousse de la frise sur 6 images
		const tTampon = aS(T.tampon);
		const pt = avancement(s, tTampon, 0.16);
		const secousse = s >= tTampon + 0.16 && s < tTampon + 0.36 ? Math.sin((s - tTampon) * 90) * 5 * (1 - (s - tTampon - 0.16) / 0.2) : 0;
		const glisse = -easeInOutCubic(avancement(s, aS(T.glisse), Math.max(0.6, aS(0.36)))) * GLISSEMENT * CARTE.pas;
		const tApres = aS(T.apres);
		const pApres = easeOutExpo(avancement(s, tApres, 0.45));

		ctx.save();
		ctx.translate(glisse + secousse, decalageY);
		// ligne de temps : filet et points sous les cartes
		ctx.fillStyle = avecAlpha(p.encre, 0.07);
		ctx.fillRect(-glisse - 10, FRISE.yPoints, LARGEUR + 20, 1);

		for (let k = 0; k < NOMBRE; k++) {
			const x = CARTE.x0 + k * CARTE.pas;
			if (x + glisse > LARGEUR + 20 || x + CARTE.largeur + glisse < -20) continue;
			const e = entree(s, aS(T.cartes + k * T.ecartCartes), 0.5, 40);
			if (e.alpha <= 0) continue;
			const y = FRISE.yCartes + e.dy;
			ctx.save();
			ctx.globalAlpha *= e.alpha;
			const actif = k >= AVANT && pt > 0;
			// etiquette de semaine
			ctx.font = POLICE(600, 20);
			if ("letterSpacing" in ctx) ctx.letterSpacing = "2.4px";
			ctx.textBaseline = "alphabetic";
			ctx.textAlign = "left";
			ctx.fillStyle = k === AVANT + 1 && pApres > 0 ? p.accentClair : p.encreDouce;
			ctx.fillText(`SEMAINE ${String(k + 1).padStart(2, "0")}`, x + 4, FRISE.yEtiquette + 20 + e.dy);
			if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
			// point de la ligne de temps
			ctx.fillStyle = actif ? p.accentClair : avecAlpha(p.encre, 0.16);
			ctx.beginPath();
			ctx.arc(x + CARTE.largeur / 2, FRISE.yPoints + 0.5, actif ? 7 : 6, 0, Math.PI * 2);
			ctx.fill();

			if (k < AVANT || k === AVANT) {
				// le probleme revient ; les cartes passees palissent quand le tampon tombe
				const pali = k < AVANT ? 1 - 0.45 * easeOutCubic(avancement(s, tTampon, 0.4)) : 1;
				const tamponnee = k === AVANT && pt > 0;
				carte(ctx, x, y, tamponnee ? avecAlpha(p.accentClair, 0.05) : p.surface, tamponnee ? p.accentClair : avecAlpha(p.encre, 0.07), true);
				if (tamponnee) {
					ctx.lineWidth = 3;
					ctx.strokeStyle = p.accentClair;
					ctx.beginPath();
					ctx.roundRect(x + 1.5, y + 1.5, CARTE.largeur - 3, CARTE.hauteur - 3, CARTE.rayon);
					ctx.stroke();
				}
				ctx.globalAlpha *= pali;
				ctx.fillStyle = avecAlpha(p.alerteClair, 0.12);
				ctx.beginPath();
				ctx.roundRect(x + 20, y + 20, 48, 48, 12);
				ctx.fill();
				horloge(ctx, x + 44, y + 44, 12, p.alerteClair);
				ctx.save();
				ctx.globalAlpha *= tamponnee ? 0.35 : 1;
				texteCarte(ctx, d.avant, x + 20, y + 86, avecAlpha(p.encre, 0.82), d);
				ctx.restore();
				ctx.fillStyle = tamponnee ? p.accentClair : p.alerteClair;
				ctx.beginPath();
				ctx.arc(x + 26, y + CARTE.hauteur - 30, 5, 0, Math.PI * 2);
				ctx.fill();
			} else if (k === AVANT + 1) {
				// emplacement vide, puis la suite : carte pleine d'accent
				carte(ctx, x, y, avecAlpha(p.encre, 0.025), avecAlpha(p.encre, 0.1), false);
				ctx.save();
				ctx.globalAlpha *= 1 - pApres;
				interrogation(ctx, x, y, p);
				ctx.restore();
				if (pApres > 0) {
					const ech = interpoler(0.9, 1, pApres);
					ctx.save();
					ctx.globalAlpha *= pApres;
					ctx.translate(x + CARTE.largeur / 2, y + CARTE.hauteur / 2);
					ctx.scale(ech, ech);
					ctx.translate(-(x + CARTE.largeur / 2), -(y + CARTE.hauteur / 2));
					ctx.save();
					const kk = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
					ctx.shadowColor = avecAlpha(p.accentClair, 0.35);
					ctx.shadowBlur = 36 * kk;
					ctx.shadowOffsetY = 14 * kk;
					ctx.fillStyle = p.accentClair;
					ctx.beginPath();
					ctx.roundRect(x, y, CARTE.largeur, CARTE.hauteur, CARTE.rayon);
					ctx.fill();
					ctx.restore();
					ctx.fillStyle = avecAlpha(p.blanc, 0.16);
					ctx.beginPath();
					ctx.roundRect(x + 20, y + 20, 48, 48, 12);
					ctx.fill();
					drapeau(ctx, x + 44, y + 44, 24, p.blanc);
					texteCarte(ctx, d.apres, x + 20, y + 86, p.blanc, d);
					ctx.restore();
				}
			} else {
				carte(ctx, x, y, avecAlpha(p.encre, 0.025), avecAlpha(p.encre, 0.1), false);
				interrogation(ctx, x, y, p);
			}
			ctx.restore();
		}

		// libelle du tampon en bas de la carte tamponnee
		const xT = CARTE.x0 + AVANT * CARTE.pas;
		if (pt > 0) {
			ctx.font = POLICE(600, 20);
			ctx.fillStyle = p.accentClair;
			ctx.textBaseline = "middle";
			ctx.fillText(d.tampon, xT + 40, FRISE.yCartes + CARTE.hauteur - 30, CARTE.largeur - 60);
		}

		// cercle de focus fin autour du tampon
		const cx = xT + CARTE.largeur / 2;
		const cy = FRISE.yCartes + CARTE.hauteur / 2;
		const pf = avancement(s, tTampon, 0.9);
		if (pf > 0 && pf < 1) {
			ctx.save();
			ctx.strokeStyle = avecAlpha(p.accentClair, 0.4 * Math.sin(pf * Math.PI));
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(cx, cy, interpoler(420, 240, easeOutCubic(pf)), 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		if (pt > 0) dessinerTampon(ctx, d.tampon, cx - 8, cy - 4, pt, p);
		ctx.restore();

		// chute
		if (d.chute) {
			const chute = mettreEnPage(ctx, d.chute, { niveau: "slogan", x: LARGEUR / 2, y: 906 + decalageY * 0.4, largeur: 1500, lignesMax: 2, alignement: "centre", echelle: 1.05, ambiance: c.ambiance });
			c.signalerCoupe(d.id, chute, d.chute.texte);
			dessinerMotParMot(ctx, chute, s, { debut: aS(T.chute), couleur: p.encre, couleurAccent: p.accentClair });
		}
	}

	function interrogation(ctx: Ctx2D, x: number, y: number, p: Palette) {
		ctx.font = POLICE(800, 64);
		ctx.fillStyle = avecAlpha(p.encre, 0.12);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("?", x + CARTE.largeur / 2, y + CARTE.hauteur / 2 + 4);
		ctx.textAlign = "left";
	}

	// Tampon : capitales dans un cadre arrondi incline de -8 degres, qui s'ecrase de 1,3 a 1
	function dessinerTampon(ctx: Ctx2D, texte: string, cx: number, cy: number, pt: number, p: Palette) {
		const majuscules = texte.toLocaleUpperCase("fr");
		ctx.save();
		ctx.font = POLICE(800, 54);
		if ("letterSpacing" in ctx) ctx.letterSpacing = "2.5px";
		const largeurTexte = Math.min(ctx.measureText(majuscules).width, 420);
		const l = largeurTexte + 62 + 56;
		const h = 100;
		const ech = interpoler(1.3, 1, easeOutCubic(pt));
		ctx.translate(cx, cy);
		ctx.rotate((-8 * Math.PI) / 180);
		ctx.scale(ech, ech);
		ctx.globalAlpha *= Math.min(1, pt * 3);
		const k = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
		ctx.shadowColor = avecAlpha(p.sombre, 0.18);
		ctx.shadowBlur = 24 * k;
		ctx.shadowOffsetY = 10 * k;
		ctx.fillStyle = p.surface;
		ctx.beginPath();
		ctx.roundRect(-l / 2, -h / 2, l, h, 16);
		ctx.fill();
		ctx.shadowColor = "transparent";
		ctx.strokeStyle = p.accentClair;
		ctx.lineWidth = 4;
		ctx.stroke();
		coche(ctx, -l / 2 + 46, 0, 26, p.accentClair, 5);
		ctx.fillStyle = p.accentClair;
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.fillText(majuscules, -l / 2 + 76, 3, 420);
		if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
		ctx.restore();
	}

	return { dessiner };
}
