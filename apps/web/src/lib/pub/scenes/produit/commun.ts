import type { MotsAccent, ScriptPub } from "@weekli/core";
import type { Ctx2D } from "../../scene";
import {
	type Ambiance,
	appliquerPolice,
	avancement,
	type Bloc,
	dessinerMotParMot,
	easeOutExpo,
	ECHELLE,
	MOT,
	mettreEnPage,
	type Niveau,
	reinitialiserPolice,
} from "../../visuel";

// Outils partages par les scenes produit et action (design.md 8.9) : grille, titres en deux temps,
// apparitions, pilules et fleche. Fonctions pures : rien ne garde d'etat d'une image a l'autre.

// Grille 1080p (design.md 8.3) : marges de 120 px, 12 colonnes de 120 px, gouttiere de 24 px
export const MARGE = 120;
export const colonne = (n: number) => MARGE + (n - 1) * 144;

// Echelles calquees sur la reference : ses titres sont nettement plus grands que l'echelle 8.5
// (titre d'etape mesure a 100 px, action de l'appel a 228 px). Multiplicateurs de `mettreEnPage`.
export const ECHELLE_TITRE = 1.32; // titre 76 -> 100 px
export const ECHELLE_GRAND = 1.06; // grand 104 -> 110 px
export const ECHELLE_ACTION = 1.4; // affiche 160 -> 224 px

export type Contexte = {
	script: ScriptPub;
	ambiance: Ambiance;
	// Texte qui ne tient pas a 80 % de l'echelle : signale une fois par scene et par texte
	signalerCoupe(idScene: string, bloc: Bloc, texte: string): void;
};

export type OptionsProduit = {
	surCoupe?: (idScene: string, texte: string) => void;
};

export function creerContexteProduit(script: ScriptPub, options: OptionsProduit): Contexte {
	const deja = new Set<string>();
	return {
		script,
		ambiance: script.marque.typo,
		signalerCoupe(idScene, bloc, texte) {
			if (!bloc.coupe || !options.surCoupe) return;
			const cle = `${idScene}\n${texte}`;
			if (deja.has(cle)) return;
			deja.add(cle);
			options.surCoupe(idScene, texte);
		},
	};
}

export const texteDe = (c: MotsAccent | string) => (typeof c === "string" ? c : c.texte);

// Apparition d'un element : opacite et montee, easeOutExpo
export function entree(secondes: number, debut: number, duree = 0.5, montee = 28) {
	const e = easeOutExpo(avancement(secondes, debut, duree));
	return { alpha: e, dy: (1 - e) * montee, e };
}

export type OptionsTitre = {
	niveau: Niveau;
	x: number;
	y: number;
	largeur: number;
	echelle: number;
	ambiance: Ambiance;
	alignement?: "gauche" | "centre";
	lignesMax?: number;
	separer?: boolean; // accent final sur sa propre ligne (defaut : vrai)
	ecart?: number; // espace ajoute entre les deux parties, en em
};

// Titre en deux temps, comme la reference : quand l'accent termine la phrase (« ce qui bloque. »),
// il passe sur sa propre ligne, dans la couleur d'accent, a la meme taille que le debut.
// Sinon, un seul bloc dont la partie accentuee est coloree.
export type Titre = { blocs: Bloc[]; separe: boolean; hauteur: number; coupe: boolean };

export function mettreTitre(ctx: Ctx2D, contenu: MotsAccent, o: OptionsTitre): Titre {
	const base = { niveau: o.niveau, x: o.x, largeur: o.largeur, ambiance: o.ambiance, alignement: o.alignement };
	const lignesMax = o.lignesMax ?? 3;
	const unique = (): Titre => {
		const bloc = mettreEnPage(ctx, contenu, { ...base, y: o.y, echelle: o.echelle, lignesMax });
		return { blocs: [bloc], separe: false, hauteur: bloc.hauteur, coupe: bloc.coupe };
	};
	const texte = contenu.texte.trim();
	const accent = contenu.accent?.trim();
	if (o.separer === false || !accent || !texte.endsWith(accent) || texte.length === accent.length) return unique();
	const debut = texte.slice(0, texte.length - accent.length).trim();
	if (!debut) return unique();

	const poser = (echelle: number) => {
		const premier = mettreEnPage(ctx, debut, { ...base, y: o.y, echelle, lignesMax: 2 });
		const ecart = (o.ecart ?? 0) * premier.taille;
		const second = mettreEnPage(ctx, { texte: accent, accent }, { ...base, y: o.y + premier.hauteur + ecart, echelle, lignesMax: 2 });
		return [premier, second];
	};
	let [premier, second] = poser(o.echelle);
	// les deux parties gardent la meme taille : la plus reduite des deux s'impose
	const taille = Math.min(premier.taille, second.taille);
	if (Math.abs(premier.taille - second.taille) > 0.01) [premier, second] = poser(taille / ECHELLE[o.niveau].taille);
	if (premier.coupe || second.coupe || premier.lignes.length + second.lignes.length > lignesMax) return unique();
	return { blocs: [premier, second], separe: true, hauteur: second.y + second.hauteur - premier.y, coupe: false };
}

// Mot par mot sur un titre (un ou deux blocs) ; l'accent est deja dans sa couleur, sans rebond
export function dessinerTitre(ctx: Ctx2D, titre: Titre, secondes: number, o: { debut: number; couleur: string; accent: string }) {
	let debut = o.debut;
	titre.blocs.forEach((bloc, i) => {
		const accentue = titre.separe && i === 1;
		dessinerMotParMot(ctx, bloc, secondes, {
			debut,
			couleur: accentue ? o.accent : o.couleur,
			couleurAccent: o.accent,
			accent: o.debut - 1, // accent deja pose : la couleur est la bonne des la premiere image
		});
		debut += bloc.mots * MOT.ecart;
	});
}

export const finTitre = (titre: Titre, debut: number) =>
	debut + Math.max(0, titre.blocs.reduce((a, b) => a + b.mots, 0) - 1) * MOT.ecart + MOT.duree;

// Texte statique d'un bloc avec opacite et decalage (texte courant, etiquettes)
export function dessinerBlocVisible(ctx: Ctx2D, bloc: Bloc, couleur: string, alpha: number, dy = 0, couleurAccent = couleur) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	for (const f of bloc.fragments) {
		appliquerPolice(ctx, bloc, f.accent);
		ctx.fillStyle = f.accent ? couleurAccent : couleur;
		ctx.fillText(f.texte, f.x, f.y + dy);
	}
	reinitialiserPolice(ctx);
	ctx.restore();
}

// Fleche des boutons : trait et chevron, dessines (la police n'a pas forcement le glyphe)
export function dessinerFleche(ctx: Ctx2D, x: number, y: number, taille: number, couleur: string) {
	ctx.save();
	ctx.strokeStyle = couleur;
	ctx.lineWidth = Math.max(2, taille * 0.11);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + taille, y);
	ctx.moveTo(x + taille * 0.58, y - taille * 0.4);
	ctx.lineTo(x + taille, y);
	ctx.lineTo(x + taille * 0.58, y + taille * 0.4);
	ctx.stroke();
	ctx.restore();
}

export type Bouton = { x: number; y: number; largeur: number; hauteur: number; centreX: number; centreY: number };

// Bouton pilule centre sur (cx, cy) : texte en Geist 600 et fleche qui glisse
export function mesurerBouton(ctx: Ctx2D, texte: string, cx: number, cy: number, taille: number, largeurMax: number): Bouton & { taille: number } {
	ctx.save();
	let t = taille;
	const largeurDe = (tt: number) => {
		ctx.font = `600 ${tt}px "Geist", ui-sans-serif, system-ui, sans-serif`;
		return ctx.measureText(texte).width + tt * 1.6 + tt * 2.2;
	};
	// le bouton se resserre jusqu'a 80 % de sa taille avant de tronquer
	while (largeurDe(t) > largeurMax && t > taille * 0.8) t -= taille * 0.04;
	const largeur = Math.min(largeurDe(t), largeurMax);
	ctx.restore();
	const hauteur = t * 2.8;
	return { x: cx - largeur / 2, y: cy - hauteur / 2, largeur, hauteur, centreX: cx, centreY: cy, taille: t };
}

export function dessinerBouton(
	ctx: Ctx2D,
	b: Bouton & { taille: number },
	texte: string,
	o: { fond: string; texte: string; glissement: number; alpha: number; dy: number; ombre?: string },
) {
	if (o.alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha *= o.alpha;
	ctx.translate(0, o.dy);
	if (o.ombre) {
		ctx.save();
		const k = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
		ctx.shadowColor = o.ombre;
		ctx.shadowBlur = 40 * k;
		ctx.shadowOffsetY = 16 * k;
		ctx.fillStyle = o.fond;
		ctx.beginPath();
		ctx.roundRect(b.x, b.y, b.largeur, b.hauteur, b.hauteur / 2);
		ctx.fill();
		ctx.restore();
	}
	ctx.fillStyle = o.fond;
	ctx.beginPath();
	ctx.roundRect(b.x, b.y, b.largeur, b.hauteur, b.hauteur / 2);
	ctx.fill();
	const t = b.taille;
	const fleche = t * 0.9;
	ctx.font = `600 ${t}px "Geist", ui-sans-serif, system-ui, sans-serif`;
	ctx.fillStyle = o.texte;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	const xTexte = b.x + t * 1.6;
	ctx.fillText(texte, xTexte, b.centreY + t * 0.04, b.largeur - t * 3.2 - fleche - t * 0.6);
	dessinerFleche(ctx, b.x + b.largeur - t * 1.6 - fleche + o.glissement, b.centreY, fleche, o.texte);
	ctx.restore();
}

// Petit va-et-vient de la fleche (6 px), en boucle de 1,4 s apres l'apparition
export function glissementFleche(secondes: number, debut: number) {
	if (secondes < debut) return 0;
	const phase = ((secondes - debut) % 1.4) / 1.4;
	return 6 * Math.sin(phase * Math.PI) ** 2;
}

