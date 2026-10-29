import type { Palette, ScenePub } from "@weekli/core";
import { dessinerVisuel } from "../../cartes";
import type { Ctx2D, InstantScene, Scene } from "../../scene";
import { HAUTEUR, LARGEUR } from "../../scene";
import {
	appliquerPolice,
	avancement,
	avecAlpha,
	dessinerFondClair,
	easeInOutCubic,
	ECHELLE,
	interpoler,
	mettreEnPage,
	reinitialiserPolice,
} from "../../visuel";
import { type Contexte, dessinerBlocVisible, dessinerTitre, ECHELLE_TITRE, entree, finTitre, MARGE, mettreTitre } from "./commun";
import { dessinerLogo } from "./logo";

// Scene `etape` (design.md 8.9, reference 22 a 36 s) : gabarit fixe partage par toutes les etapes.
// L'en-tete (logo, nom, onglets) ne bouge pas d'une etape a l'autre : seul le souligne glisse vers
// l'onglet actif. Le contenu (etiquette, titre, texte, carte, filigrane) change et avance doucement.

type DonneesEtape = Extract<ScenePub, { type: "etape" }>;

// Positions mesurees sur la reference (1920 x 1080)
const EN_TETE = { y: 92, logo: 32, nom: 30, onglet: 22, ecartOnglets: 44, souligne: 4, ySouligne: 120 };
const COLONNE = { x: MARGE, largeur: 840, yEtiquette: 300, yTitre: 360, ecartTexte: 28, largeurTexte: 640 };
const ZONE_CARTE = { x: 940, y: 230, largeur: 860, hauteur: 640 };
const FILIGRANE = { echelle: 1.05, ligneDeBase: 965, vitesse: 40, opacite: 0.08, trait: 2 };
const POUSSEE = 0.025; // avancee lente du contenu sur la scene (camera)
const SOULIGNE_DUREE = 0.4;

type Onglet = { numero: string; libelle: string; x: number; largeurNumero: number; largeur: number };
type EnTete = { onglets: Onglet[]; taille: number; gauche: number };

const POLICE = (graisse: number, taille: number) => `${graisse} ${taille}px "Geist", ui-sans-serif, system-ui, sans-serif`;
const deuxChiffres = (n: number) => String(n).padStart(2, "0");

// Onglets alignes a droite sur la marge ; la taille baisse si les libelles sont trop longs
function mesurerEnTete(ctx: Ctx2D, libelles: string[], largeurMax: number): EnTete {
	ctx.save();
	let taille = EN_TETE.onglet;
	let mesures: { numero: number; libelle: number }[] = [];
	const total = () => mesures.reduce((a, m) => a + m.numero + taille * 0.45 + m.libelle, 0) + EN_TETE.ecartOnglets * (taille / EN_TETE.onglet) * (mesures.length - 1);
	for (;;) {
		ctx.font = POLICE(500, taille);
		mesures = libelles.map((l, i) => ({ numero: ctx.measureText(deuxChiffres(i + 1)).width, libelle: ctx.measureText(l).width }));
		if (total() <= largeurMax || taille <= 14) break;
		taille -= 1;
	}
	const ecart = EN_TETE.ecartOnglets * (taille / EN_TETE.onglet);
	let x = LARGEUR - MARGE - total();
	const gauche = x;
	const onglets = libelles.map((libelle, i) => {
		const m = mesures[i];
		const largeur = m.numero + taille * 0.45 + m.libelle;
		const o = { numero: deuxChiffres(i + 1), libelle, x, largeurNumero: m.numero + taille * 0.45, largeur };
		x += largeur + ecart;
		return o;
	});
	ctx.restore();
	return { onglets, taille, gauche };
}

export function creerEtape(c: Contexte): Scene {
	const { script } = c;
	const libelles = script.scenes.filter((s): s is DonneesEtape => s.type === "etape" && !s.masquee).map((s) => s.onglet);
	let enTete: EnTete | null = null; // mesure au premier dessin (polices chargees), identique ensuite

	function dessinerEnTete(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const nom = script.projet.nom;
		const y = EN_TETE.y;
		dessinerLogo(ctx, script, i.contexte, MARGE, y - EN_TETE.logo / 2, EN_TETE.logo, p.accentClair);
		ctx.save();
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.fillStyle = p.encre;
		ctx.font = POLICE(600, EN_TETE.nom);
		if ("letterSpacing" in ctx) ctx.letterSpacing = "-0.3px";
		const xNom = MARGE + EN_TETE.logo + 16;
		enTete ??= mesurerEnTete(ctx, libelles, LARGEUR - MARGE - xNom - 380);
		ctx.fillText(nom, xNom, y + 1, Math.max(120, enTete.gauche - xNom - 60));
		reinitialiserPolice(ctx);

		const { onglets, taille } = enTete;
		const actif = (i.scene.etape?.numero ?? 1) - 1;
		ctx.font = POLICE(500, taille);
		for (const [k, o] of onglets.entries()) {
			ctx.fillStyle = k === actif ? p.encre : avecAlpha(p.encreDouce, 0.85);
			ctx.fillText(o.numero, o.x, y + 1);
			ctx.fillStyle = k === actif ? p.encre : p.encreDouce;
			ctx.fillText(o.libelle, o.x + o.largeurNumero, y + 1);
		}
		// filet discret sous les onglets, souligne qui glisse depuis l'onglet precedent
		if (onglets.length) {
			const premier = onglets[0];
			const dernier = onglets[onglets.length - 1];
			ctx.fillStyle = avecAlpha(p.encre, 0.07);
			ctx.fillRect(premier.x, EN_TETE.ySouligne + EN_TETE.souligne - 1, dernier.x + dernier.largeur - premier.x, 1);
			const cible = onglets[Math.min(actif, onglets.length - 1)];
			const depart = actif > 0 ? onglets[actif - 1] : { x: cible.x, largeur: 0 };
			const e = easeInOutCubic(avancement(i.secondes, 0, SOULIGNE_DUREE));
			ctx.fillStyle = p.accentClair;
			ctx.beginPath();
			ctx.roundRect(interpoler(depart.x, cible.x, e), EN_TETE.ySouligne, Math.max(EN_TETE.souligne, interpoler(depart.largeur, cible.largeur, e)), EN_TETE.souligne, 2);
			ctx.fill();
		}
		ctx.restore();
	}

	// Grand mot en contour, repete avec un rond, qui defile vers la gauche. Le decalage suit le temps
	// global : le defilement ne repart pas de zero a chaque etape.
	function dessinerFiligrane(ctx: Ctx2D, mot: string, i: InstantScene, p: Palette) {
		const texte = mot.trim().toLocaleUpperCase("fr");
		if (!texte) return;
		const taille = ECHELLE.filigrane.taille * FILIGRANE.echelle;
		const bloc = { ambiance: c.ambiance, niveau: "filigrane" as const, taille };
		ctx.save();
		appliquerPolice(ctx, bloc);
		const largeurMot = ctx.measureText(texte).width;
		const rond = taille * 0.1;
		const marge = taille * 0.28;
		const motif = largeurMot + marge * 2 + rond * 2;
		const decalage = (i.temps * FILIGRANE.vitesse) % motif;
		ctx.globalAlpha *= entree(i.secondes, 0, 0.6, 0).alpha;
		ctx.strokeStyle = avecAlpha(p.encre, FILIGRANE.opacite);
		ctx.lineWidth = FILIGRANE.trait;
		ctx.lineJoin = "round";
		ctx.textBaseline = "alphabetic";
		const y = FILIGRANE.ligneDeBase;
		for (let x = -decalage - motif * 0.35; x < LARGEUR + motif; x += motif) {
			ctx.strokeText(texte, x, y);
			ctx.beginPath();
			ctx.arc(x + largeurMot + marge + rond, y - taille * 0.36, rond, 0, Math.PI * 2);
			ctx.stroke();
		}
		reinitialiserPolice(ctx);
		ctx.restore();
	}

	function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
		const d = i.donnees as DonneesEtape;
		const s = i.secondes;
		dessinerFondClair(ctx, p, { secondes: s, temps: i.temps, graine: i.graine });
		const vide = d.visuel.type === "liste" && d.visuel.elements.length === 0;

		// contenu : poussee lente autour du centre, l'en-tete reste fixe (continuite entre etapes)
		ctx.save();
		const k = 1 + POUSSEE * i.t;
		ctx.translate(LARGEUR / 2, HAUTEUR / 2);
		ctx.scale(k, k);
		ctx.translate(-LARGEUR / 2, -HAUTEUR / 2);

		if (!vide) dessinerFiligrane(ctx, d.filigrane, i, p);

		const titre = mettreTitre(ctx, d.titre, {
			niveau: "titre",
			x: COLONNE.x,
			y: COLONNE.yTitre,
			largeur: vide ? LARGEUR - 2 * MARGE : COLONNE.largeur,
			echelle: ECHELLE_TITRE,
			ambiance: c.ambiance,
		});
		for (const b of titre.blocs) c.signalerCoupe(d.id, b, d.titre.texte);

		if (!vide) {
			const numero = i.scene.etape?.numero ?? 1;
			const total = i.scene.etape?.total ?? 1;
			const etiquette = mettreEnPage(ctx, `Étape ${deuxChiffres(numero)} / ${deuxChiffres(total)}`, {
				niveau: "etiquette",
				x: COLONNE.x,
				y: COLONNE.yEtiquette,
				largeur: COLONNE.largeur,
				echelle: 1.1,
				ambiance: c.ambiance,
			});
			const a = entree(s, 0.05, 0.5, 16);
			dessinerBlocVisible(ctx, etiquette, p.accentClair, a.alpha, a.dy);
		}

		const debutTitre = 0.12;
		dessinerTitre(ctx, titre, s, { debut: debutTitre, couleur: p.encre, accent: p.accentClair });

		if (!vide && d.texte) {
			const texte = mettreEnPage(ctx, d.texte, {
				niveau: "texte",
				x: COLONNE.x + 3,
				y: COLONNE.yTitre + titre.hauteur + COLONNE.ecartTexte,
				largeur: COLONNE.largeurTexte,
				lignesMax: 3,
				echelle: 1.04,
				ambiance: c.ambiance,
			});
			c.signalerCoupe(d.id, texte, d.texte);
			const a = entree(s, finTitre(titre, debutTitre) - 0.05, 0.6, 20);
			dessinerBlocVisible(ctx, texte, p.encreDouce, a.alpha, a.dy);
		}

		if (!vide) dessinerVisuel(ctx, i, d.visuel, ZONE_CARTE, { captures: script.captures, fond: "clair", retard: 0.25 });
		ctx.restore();

		dessinerEnTete(ctx, i, p);
	}

	return { dessiner };
}
