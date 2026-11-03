import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { LARGEUR } from "../../scene";
import {
	avecAlpha,
	dessinerCarres,
	dessinerFondSombre,
	dessinerMotParMot,
	easeOutExpo,
	avancement,
	interpoler,
	mettreEnPage,
} from "../../visuel";
import { type Contexte, dessinerBlocVisible, dessinerBouton, entree, mesurerBouton } from "./commun";
import { dessinerLogo } from "./logo";

// Scene `fin` (design.md 8.9, reference 53 a 58 s) : carton final sur fond sombre et rayons. Logo et
// nom au centre (sans reanimer les pixels de la revelation), slogan, bouton pilule blanc, liens.
// Tout est en place avant les 1,5 dernieres secondes : seuls les rayons tournent encore.

type DonneesFin = Extract<ScenePub, { type: "fin" }>;

const LOGO = 160;
const ECART_LOGO = 44;
const IMMOBILE = 1.5;

export function creerFin(c: Contexte): Scene {
	const { script } = c;

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as DonneesFin;
		const s = i.secondes;
		// les carres du decor s'arretent eux aussi avant les 1,5 dernieres secondes
		const gel = Math.min(s, Math.max(0, i.scene.duree - IMMOBILE));
		dessinerFondSombre(ctx, p, { secondes: s, temps: i.temps, graine: i.graine, rayons: {}, carres: false });
		dessinerCarres(ctx, { graine: i.graine, secondes: gel, couleur: p.blanc });

		// logo et nom : groupe centre, apparition en fondu et legere mise a l'echelle
		const nom = mettreEnPage(ctx, script.projet.nom, { niveau: "affiche", x: 0, y: 0, largeur: LARGEUR - 240 - LOGO - ECART_LOGO, lignesMax: 1, ambiance: c.ambiance });
		c.signalerCoupe(d.id, nom, script.projet.nom);
		const largeurGroupe = LOGO + ECART_LOGO + nom.largeur;
		const x0 = (LARGEUR - largeurGroupe) / 2;
		const yCentre = 415;
		const e = easeOutExpo(avancement(s, 0.05, 0.6));
		ctx.save();
		ctx.globalAlpha *= e;
		const ech = interpoler(0.96, 1, e);
		ctx.translate(LARGEUR / 2, yCentre);
		ctx.scale(ech, ech);
		ctx.translate(-LARGEUR / 2, -yCentre);
		dessinerLogo(ctx, script, i.contexte, x0, yCentre - LOGO / 2, LOGO, p.accentSombre);
		const ligne = nom.lignes[0];
		ctx.translate(x0 + LOGO + ECART_LOGO - nom.x, ligne ? yCentre - (ligne.y - (nom.taille * 0.71) / 2) : 0);
		dessinerBlocVisible(ctx, nom, p.blanc, 1);
		ctx.restore();

		let y = 540;
		if (d.slogan) {
			const slogan = mettreEnPage(ctx, d.slogan, { niveau: "slogan", x: LARGEUR / 2, y, largeur: 1400, lignesMax: 2, alignement: "centre", echelle: 1.36, ambiance: c.ambiance });
			c.signalerCoupe(d.id, slogan, d.slogan);
			dessinerMotParMot(ctx, slogan, s, { debut: 0.3, couleur: avecAlpha(p.blanc, 0.85), accent: false });
			y += slogan.hauteur + 52;
		} else y += 30;

		if (d.bouton) {
			const b = mesurerBouton(ctx, d.bouton, LARGEUR / 2, 0, 30, 1000);
			const bouton = { ...b, y, centreY: y + b.hauteur / 2 };
			const eb = entree(s, 0.55, 0.5, 20);
			dessinerBouton(ctx, bouton, d.bouton, { fond: p.blanc, texte: p.sombre, glissement: 0, alpha: eb.alpha, dy: eb.dy });
			y += b.hauteur + 52;
		}

		// liens separes par un point median, espaces larges comme la reference
		const liens = d.liens.slice(0, 2).filter((l) => l.trim());
		if (liens.length) {
			const el = entree(s, 0.75, 0.5, 12);
			ctx.save();
			ctx.globalAlpha *= el.alpha;
			ctx.font = `500 30px "Geist", ui-sans-serif, system-ui, sans-serif`;
			ctx.textBaseline = "middle";
			ctx.textAlign = "left";
			ctx.fillStyle = avecAlpha(p.blanc, 0.7);
			const ecart = 56;
			const max = (LARGEUR - 2 * 160 - ecart) / liens.length;
			const largeurs = liens.map((l) => Math.min(max, ctx.measureText(l).width));
			let x = (LARGEUR - largeurs.reduce((a, b) => a + b, 0) - ecart * (liens.length - 1)) / 2;
			const yl = y + 20 + el.dy;
			liens.forEach((lien, n) => {
				if (n) {
					ctx.beginPath();
					ctx.arc(x - ecart / 2, yl, 2.5, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.fillText(lien, x, yl, max);
				x += largeurs[n] + ecart;
			});
			ctx.restore();
		}

		if (d.mentionWeekli) {
			const mention = mettreEnPage(ctx, "Fait avec Weekli", { niveau: "carte", x: LARGEUR / 2, y: 990, largeur: 600, lignesMax: 1, alignement: "centre", ambiance: "nette" });
			dessinerBlocVisible(ctx, mention, avecAlpha(p.blanc, 0.45), entree(s, 0.9, 0.5, 0).alpha);
		}
	}

	return { dessiner };
}
