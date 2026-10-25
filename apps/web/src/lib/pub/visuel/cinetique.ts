import type { Ctx2D } from "../scene";
import { melanger } from "./couleur";
import { avancement, easeInOutCubic, easeOutCubic, easeOutExpo, rebond } from "./courbes";
import { appliquerPolice, type Bloc, CAPITALE, type Fragment, JAMBAGE, reinitialiserPolice } from "./typo";

// Typographie cinetique (design.md 8.7). Chaque fonction dessine l'etat du procede au temps `secondes`
// (temps local de la scene) ; `debut` place le procede dans la scene. Aucun etat entre deux images.
// Pas de sortie : la transition de scene emporte le texte.

export const MOT = { duree: 0.26, ecart: 0.07, decalage: 0.5 };
export const ACCENT = { duree: 0.18, pic: 1.06 };
export const SURLIGNAGE = { duree: 0.32 };
export const SOULIGNEMENT = { duree: 0.4, epaisseur: 4 };
export const FRAPPE = { pas: 0.04, clignement: 0.53, curseur: 0.6 };

// Instant ou le dernier mot a fini d'entrer (pour enchainer surlignage, soulignement...)
// `ecart` : intervalle entre deux mots (70 ms par defaut ; une phrase calee sur la voix peut l'allonger)
export const finMotParMot = (bloc: Bloc, debut = 0, ecart = MOT.ecart) => debut + Math.max(0, bloc.mots - 1) * ecart + MOT.duree;

// Instant de l'accent : quand le premier mot accentue a fini d'entrer
export function debutAccent(bloc: Bloc, debut = 0, ecart = MOT.ecart): number | null {
	const f = bloc.fragments.find((x) => x.accent);
	return f ? debut + f.mot * ecart + MOT.duree : null;
}

function poser(ctx: Ctx2D, bloc: Bloc, f: Fragment, couleur: string) {
	appliquerPolice(ctx, bloc, f.accent);
	ctx.fillStyle = couleur;
	ctx.fillText(f.texte, f.x, f.y);
}

export type OptionsMotParMot = {
	debut?: number;
	couleur: string;
	couleurAccent?: string; // accentSombre, accentClair, ou alerte dans les scenes de tension
	accent?: number | false; // instant de l'accent (defaut : fin d'entree du premier mot accentue), false : jamais
	ecart?: number; // intervalle entre deux mots (defaut MOT.ecart)
};

// Chaque mot sort d'un masque par le bas (0,5 em, opacite 0 vers 1), 260 ms, 70 ms entre les mots,
// easeOutExpo. Accent : la partie accentuee passe a sa couleur avec un rebond d'echelle 1,06 vers 1.
export function dessinerMotParMot(ctx: Ctx2D, bloc: Bloc, secondes: number, o: OptionsMotParMot) {
	const debut = o.debut ?? 0;
	const ecart = o.ecart ?? MOT.ecart;
	const instantAccent = o.accent === false ? null : (o.accent ?? debutAccent(bloc, debut, ecart));
	const pa = instantAccent === null ? 0 : avancement(secondes, instantAccent, ACCENT.duree);
	const echelleAccent = instantAccent === null ? 1 : rebond(pa, ACCENT.pic);
	const couleurAccent = o.couleurAccent ? melanger(o.couleur, o.couleurAccent, easeOutCubic(pa)) : o.couleur;
	// cadre de l'accent : le rebond se fait autour du centre de la partie accentuee
	const acc = bloc.fragments.filter((f) => f.accent);
	const centreAccent = acc.length
		? { x: (Math.min(...acc.map((f) => f.x)) + Math.max(...acc.map((f) => f.x + f.largeur))) / 2, y: acc[0].y - (bloc.taille * CAPITALE) / 2 }
		: null;

	ctx.save();
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	for (const f of bloc.fragments) {
		const p = avancement(secondes, debut + f.mot * ecart, MOT.duree);
		if (p <= 0) continue;
		const e = easeOutExpo(p);
		ctx.save();
		if (p < 1) {
			// masque de la ligne : le mot monte depuis sous la ligne de base
			const ligne = bloc.lignes[f.ligne];
			ctx.beginPath();
			ctx.rect(f.x - bloc.taille * 0.1, ligne.y - bloc.taille * 1.05, f.largeur + bloc.taille * 0.2, bloc.taille * (1.05 + JAMBAGE + 0.06));
			ctx.clip();
			ctx.translate(0, (1 - e) * MOT.decalage * bloc.taille);
			ctx.globalAlpha = e;
		}
		if (f.accent && centreAccent && echelleAccent !== 1) {
			ctx.translate(centreAccent.x, centreAccent.y);
			ctx.scale(echelleAccent, echelleAccent);
			ctx.translate(-centreAccent.x, -centreAccent.y);
		}
		poser(ctx, bloc, f, f.accent ? couleurAccent : o.couleur);
		ctx.restore();
	}
	reinitialiserPolice(ctx);
	ctx.restore();
}

// Rectangles des parties accentuees, ligne par ligne (surlignage)
function zonesAccent(bloc: Bloc) {
	const zones: { x: number; y: number; l: number; h: number }[] = [];
	const marge = bloc.taille * 0.1;
	for (let n = 0; n < bloc.lignes.length; n++) {
		const acc = bloc.fragments.filter((f) => f.accent && f.ligne === n);
		if (!acc.length) continue;
		const gauche = Math.min(...acc.map((f) => f.x));
		const droite = Math.max(...acc.map((f) => f.x + f.largeur));
		const y = bloc.lignes[n].y;
		zones.push({ x: gauche - marge, y: y - bloc.taille * (CAPITALE + 0.16), l: droite - gauche + marge * 2, h: bloc.taille * (CAPITALE + 0.16 + JAMBAGE + 0.04) });
	}
	return zones;
}

export type OptionsSurlignage = {
	debut: number;
	bloc: string; // `clair` sur fond sombre, `accentClair` a 14 % sur fond clair
	texte: string; // couleur du texte une fois surligne (`sombre` sur fond sombre, `accentClair` sur clair)
};

// Bloc qui balaie de gauche a droite derriere la partie accentuee en 320 ms ; le texte change de couleur
// au passage. A dessiner APRES le texte : le bloc le recouvre puis la partie balayee est redessinee.
export function dessinerSurlignage(ctx: Ctx2D, bloc: Bloc, secondes: number, o: OptionsSurlignage) {
	const p = avancement(secondes, o.debut, SURLIGNAGE.duree);
	if (p <= 0) return;
	const zones = zonesAccent(bloc);
	const total = zones.reduce((a, z) => a + z.l, 0);
	let reste = easeInOutCubic(p) * total;
	ctx.save();
	ctx.textBaseline = "alphabetic";
	for (const z of zones) {
		const l = Math.min(reste, z.l);
		reste -= l;
		if (l <= 0) break;
		ctx.save();
		ctx.fillStyle = o.bloc;
		ctx.beginPath();
		ctx.rect(z.x, z.y, l, z.h);
		ctx.fill();
		ctx.clip();
		for (const f of bloc.fragments) if (f.accent) poser(ctx, bloc, f, o.texte);
		ctx.restore();
	}
	reinitialiserPolice(ctx);
	ctx.restore();
}

export type OptionsSoulignement = {
	debut: number;
	couleur: string;
	cible?: "bloc" | "accent"; // sous tout le bloc (signature) ou sous la partie accentuee
};

// Filet de 4 px qui se dessine de gauche a droite sous la derniere ligne en 400 ms
export function dessinerSoulignement(ctx: Ctx2D, bloc: Bloc, secondes: number, o: OptionsSoulignement) {
	const p = avancement(secondes, o.debut, SOULIGNEMENT.duree);
	if (p <= 0 || !bloc.lignes.length) return;
	const n = bloc.lignes.length - 1;
	const ligne = bloc.lignes[n];
	let gauche = ligne.x;
	let largeur = ligne.largeur;
	if (o.cible === "accent") {
		const acc = bloc.fragments.filter((f) => f.accent && f.ligne === n);
		if (acc.length) {
			gauche = Math.min(...acc.map((f) => f.x));
			largeur = Math.max(...acc.map((f) => f.x + f.largeur)) - gauche;
		}
	}
	const e = SOULIGNEMENT.epaisseur;
	ctx.save();
	ctx.fillStyle = o.couleur;
	ctx.beginPath();
	ctx.roundRect(gauche, ligne.y + bloc.taille * 0.2, Math.max(e, largeur * easeInOutCubic(p)), e, e / 2);
	ctx.fill();
	ctx.restore();
}

export type OptionsFrappe = {
	debut?: number;
	couleur: string;
	couleurAccent?: string;
	curseur: string; // accentClair
};

// Nombre de caracteres de la frappe (les espaces entre mots comptent pour un caractere)
export function caracteresFrappe(bloc: Bloc): number {
	return bloc.fragments.reduce((a, f) => a + [...f.texte].length, 0) + Math.max(0, bloc.mots - 1);
}

export const finFrappe = (bloc: Bloc, debut = 0) => debut + caracteresFrappe(bloc) * FRAPPE.pas;

// Caractere par caractere (40 ms), curseur carre plein de 0,6 em qui suit le texte et saute a la ligne
// avec lui ; il reste plein pendant la frappe et clignote (530 ms) avant et apres.
export function dessinerFrappe(ctx: Ctx2D, bloc: Bloc, secondes: number, o: OptionsFrappe) {
	const debut = o.debut ?? 0;
	const tapes = secondes < debut ? 0 : Math.floor((secondes - debut) / FRAPPE.pas) + 1;
	const total = caracteresFrappe(bloc);
	ctx.save();
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	let reste = tapes;
	let curseur = { x: bloc.lignes[0]?.x ?? bloc.x, y: bloc.lignes[0]?.y ?? bloc.y };
	let motPrecedent = -1;
	for (const f of bloc.fragments) {
		if (f.mot !== motPrecedent && motPrecedent >= 0) {
			if (reste <= 0) break;
			reste--; // l'espace entre deux mots
			if (reste <= 0) {
				// espace tape : le curseur attend au debut du mot suivant (a la ligne si le mot y passe)
				curseur = { x: f.x, y: f.y };
				break;
			}
		}
		motPrecedent = f.mot;
		const lettres = [...f.texte];
		const n = Math.min(reste, lettres.length);
		if (n <= 0) break;
		const visible = lettres.slice(0, n).join("");
		appliquerPolice(ctx, bloc, f.accent);
		ctx.fillStyle = f.accent && o.couleurAccent ? o.couleurAccent : o.couleur;
		ctx.fillText(visible, f.x, f.y);
		curseur = { x: f.x + (n === lettres.length ? f.largeur : ctx.measureText(visible).width), y: f.y };
		reste -= n;
	}
	const enCours = tapes > 0 && tapes < total;
	const fin = debut + total * FRAPPE.pas;
	const repere = secondes < debut ? secondes : secondes - fin;
	const allume = enCours || Math.floor(Math.max(0, repere) / FRAPPE.clignement) % 2 === 0;
	if (allume) {
		const cote = bloc.taille * FRAPPE.curseur;
		ctx.fillStyle = o.curseur;
		ctx.fillRect(curseur.x + bloc.taille * 0.08, curseur.y - cote, cote, cote);
	}
	reinitialiserPolice(ctx);
	ctx.restore();
}
