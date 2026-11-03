import type { MotsAccent } from "@weekli/core";
import type { Ctx2D } from "../scene";

// Typographie de la pub (design.md 8.5) : polices, echelle a 1080p, mise en page mesuree.

export type Ambiance = "nette" | "editoriale";
export type Niveau = "impact" | "affiche" | "grand" | "titre" | "slogan" | "texte" | "carte" | "etiquette" | "filigrane";

export const ECHELLE: Record<Niveau, { taille: number; interligne: number }> = {
	impact: { taille: 240, interligne: 0.9 },
	affiche: { taille: 160, interligne: 0.95 },
	grand: { taille: 104, interligne: 1.02 },
	titre: { taille: 76, interligne: 1.04 },
	slogan: { taille: 44, interligne: 1.2 },
	texte: { taille: 30, interligne: 1.35 },
	carte: { taille: 22, interligne: 1.35 },
	etiquette: { taille: 20, interligne: 1.2 },
	filigrane: { taille: 300, interligne: 1 },
};

const GEIST = `"Geist", ui-sans-serif, system-ui, sans-serif`;
const SERIF = `"Instrument Serif", ui-serif, Georgia, serif`;
const AFFICHAGE = new Set<Niveau>(["impact", "affiche", "grand", "titre", "filigrane"]);

// Proportions de Geist (hauteur de capitale, jambage) : placent le texte dans sa ligne
export const CAPITALE = 0.71;
export const JAMBAGE = 0.22;

type Style = { famille: string; graisse: number; italique: boolean; espacement: number }; // espacement en em

function style(ambiance: Ambiance, niveau: Niveau, accent: boolean): Style {
	if (niveau === "etiquette") return { famille: GEIST, graisse: 600, italique: false, espacement: 0.14 };
	if (niveau === "texte" || niveau === "carte") return { famille: GEIST, graisse: 500, italique: false, espacement: 0 };
	if (ambiance === "editoriale" && (AFFICHAGE.has(niveau) || niveau === "slogan"))
		return { famille: SERIF, graisse: 400, italique: accent, espacement: -0.01 };
	if (niveau === "slogan") return { famille: GEIST, graisse: 600, italique: false, espacement: -0.015 };
	return { famille: GEIST, graisse: 800, italique: false, espacement: -0.045 };
}

// Polices a charger avant le premier dessin (chargerPolices du moteur)
export function policesRequises(ambiance: Ambiance): string[] {
	const geist = ["500 30px Geist", "600 30px Geist", "800 30px Geist"];
	return ambiance === "editoriale" ? [...geist, `400 30px "Instrument Serif"`, `italic 400 30px "Instrument Serif"`] : geist;
}

export type Fragment = {
	texte: string;
	accent: boolean;
	mot: number; // index du mot (unite d'animation)
	ligne: number;
	x: number; // bord gauche
	y: number; // ligne de base
	largeur: number;
};

export type Ligne = { x: number; y: number; largeur: number; haut: number };

export type Bloc = {
	taille: number;
	interligne: number; // en pixels
	ambiance: Ambiance;
	niveau: Niveau;
	majuscules: boolean;
	fragments: Fragment[];
	lignes: Ligne[];
	mots: number;
	x: number;
	y: number; // haut du bloc
	largeur: number; // ligne la plus longue
	hauteur: number;
	reduit: boolean; // taille baissee pour tenir
	coupe: boolean; // texte tronque (points de suspension) : avertir dans l'editeur
};

export type OptionsMiseEnPage = {
	niveau: Niveau;
	ambiance?: Ambiance;
	x: number; // selon l'alignement : bord gauche, centre ou bord droit
	y: number; // haut du bloc
	largeur: number; // largeur disponible
	lignesMax?: number;
	equilibrer?: boolean; // lignes de longueurs voisines (defaut : vrai, sauf texte courant)
	alignement?: "gauche" | "centre" | "droite";
	majuscules?: boolean;
	echelle?: number; // multiplicateur de taille voulu (1 par defaut)
};

// Regle la police du contexte pour un bloc (fragment accentue ou non)
export function appliquerPolice(ctx: Ctx2D, bloc: Pick<Bloc, "ambiance" | "niveau" | "taille">, accent = false) {
	const s = style(bloc.ambiance, bloc.niveau, accent);
	ctx.font = `${s.italique ? "italic " : ""}${s.graisse} ${bloc.taille}px ${s.famille}`;
	if ("letterSpacing" in ctx) ctx.letterSpacing = `${(s.espacement * bloc.taille).toFixed(2)}px`;
}

export function reinitialiserPolice(ctx: Ctx2D) {
	if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

type MotSource = { morceaux: { texte: string; accent: boolean }[] };

// Decoupe en mots ; chaque mot garde ses morceaux accentues ou non ("problème." : accent + ponctuation)
function decouper(contenu: MotsAccent | string, majuscules: boolean): MotSource[] {
	const { texte, accent } = typeof contenu === "string" ? { texte: contenu, accent: undefined } : contenu;
	const marque = new Array<boolean>(texte.length).fill(false);
	if (accent) {
		let debut = texte.indexOf(accent);
		if (debut < 0) debut = texte.toLowerCase().indexOf(accent.toLowerCase());
		if (debut >= 0) marque.fill(true, debut, debut + accent.length);
	}
	const mots: MotSource[] = [];
	let courant: MotSource | null = null;
	for (let i = 0; i < texte.length; i++) {
		const c = majuscules ? texte[i].toLocaleUpperCase("fr") : texte[i];
		if (/\s/.test(c)) {
			courant = null;
			continue;
		}
		if (!courant) {
			courant = { morceaux: [] };
			mots.push(courant);
		}
		const dernier = courant.morceaux[courant.morceaux.length - 1];
		if (dernier && dernier.accent === marque[i]) dernier.texte += c;
		else courant.morceaux.push({ texte: c, accent: marque[i] });
	}
	// ponctuation haute francaise (" ?", " !", " :") : espace insecable, jamais seule en debut de ligne
	return mots.reduce<MotSource[]>((acc, m) => {
		const precedent = acc[acc.length - 1];
		if (precedent && /^[?!:;\u00bb]+$/.test(m.morceaux.map((x) => x.texte).join(""))) {
			const [premier, ...suite] = m.morceaux;
			precedent.morceaux.push({ texte: `\u00a0${premier.texte}`, accent: premier.accent }, ...suite);
		} else acc.push(m);
		return acc;
	}, []);
}

const PAS_REDUCTION = 0.04;
const REDUCTION_MAX = 0.8;
const POINTS = "…";

// Retour a la ligne par mesure ; si le texte deborde (plus de `lignesMax` lignes ou un mot trop long),
// la taille baisse par pas de 4 % jusqu'a 80 %, puis le texte est tronque avec points de suspension.
// Memoire des mises en page : une scene redemande le meme bloc a chaque image. La mise en page ne
// depend que du contenu et des options (polices chargees avant le premier dessin, contrat du moteur).
const memoire = new Map<string, Bloc>();
const MEMOIRE_MAX = 128;

export function mettreEnPage(ctx: Ctx2D, contenu: MotsAccent | string, o: OptionsMiseEnPage): Bloc {
	const cle = JSON.stringify([contenu, o]);
	const connu = memoire.get(cle);
	if (connu) return connu;
	const bloc = calculerMiseEnPage(ctx, contenu, o);
	if (memoire.size >= MEMOIRE_MAX) memoire.delete(memoire.keys().next().value as string);
	memoire.set(cle, bloc);
	return bloc;
}

function calculerMiseEnPage(ctx: Ctx2D, contenu: MotsAccent | string, o: OptionsMiseEnPage): Bloc {
	const ambiance = o.ambiance ?? "nette";
	const majuscules = o.majuscules ?? o.niveau === "etiquette";
	const lignesMax = o.lignesMax ?? 3;
	const { taille: base, interligne } = ECHELLE[o.niveau];
	const voulue = base * (o.echelle ?? 1);
	const sources = decouper(contenu, majuscules);
	ctx.save();

	const essayer = (taille: number, largeurMax = o.largeur) => {
		const mesurer = (texte: string, accent: boolean) => {
			appliquerPolice(ctx, { ambiance, niveau: o.niveau, taille }, accent);
			return ctx.measureText(texte).width;
		};
		const espace = mesurer(" ", false);
		const mots = sources.map((m) => {
			const largeurs = m.morceaux.map((x) => mesurer(x.texte, x.accent));
			return { largeurs, total: largeurs.reduce((a, b) => a + b, 0) };
		});
		const lignes: number[][] = [];
		let largeurLigne = 0;
		mots.forEach((m, i) => {
			const ajout = (lignes.length && lignes[lignes.length - 1].length ? espace : 0) + m.total;
			if (!lignes.length || (largeurLigne + ajout > largeurMax && lignes[lignes.length - 1].length)) {
				lignes.push([i]);
				largeurLigne = m.total;
			} else {
				lignes[lignes.length - 1].push(i);
				largeurLigne += ajout;
			}
		});
		const tient = lignes.length <= lignesMax && mots.every((m) => m.total <= o.largeur);
		return { taille, espace, mots, lignes, tient, mesurer };
	};

	let essai = essayer(voulue);
	for (let f = 1 - PAS_REDUCTION; !essai.tient && f >= REDUCTION_MAX - 1e-9; f -= PAS_REDUCTION) essai = essayer(voulue * f);
	// equilibrage : plus petite largeur qui garde le meme nombre de lignes (pas de mot orphelin)
	const equilibrer = o.equilibrer ?? !(o.niveau === "texte" || o.niveau === "carte");
	if (equilibrer && essai.tient && essai.lignes.length > 1) {
		let bas = Math.max(...essai.mots.map((m) => m.total));
		let haut = o.largeur;
		for (let k = 0; k < 12; k++) {
			const milieu = (bas + haut) / 2;
			if (essayer(essai.taille, milieu).lignes.length <= essai.lignes.length) haut = milieu;
			else bas = milieu;
		}
		essai = essayer(essai.taille, haut);
	}
	const { taille, espace, mesurer } = essai;
	let lignes = essai.lignes;
	const coupe = !essai.tient;
	const fragments: Fragment[] = [];
	const lh = taille * interligne;
	const resultat: Ligne[] = [];

	// troncature : lignes en trop supprimees, puis la derniere ligne raccourcie jusqu'a tenir avec "..."
	const texteMorceaux = sources.map((m) => m.morceaux.map((x) => ({ ...x })));
	if (coupe) {
		lignes = lignes.slice(0, lignesMax);
		const derniere = lignes[lignes.length - 1];
		const largeurDe = (ids: number[]) =>
			ids.reduce((a, id, k) => a + (k ? espace : 0) + texteMorceaux[id].reduce((s, x) => s + mesurer(x.texte, x.accent), 0), 0);
		while (derniere.length) {
			const id = derniere[derniere.length - 1];
			const morceaux = texteMorceaux[id];
			const fin = morceaux[morceaux.length - 1];
			if (!fin.texte.endsWith(POINTS)) fin.texte += POINTS;
			if (largeurDe(derniere) <= o.largeur) break;
			// retire le dernier caractere avant les points ; un morceau vide disparait (le suivant les recoit)
			fin.texte = fin.texte.slice(0, -POINTS.length - 1) + POINTS;
			if (fin.texte === POINTS) {
				morceaux.pop();
				if (!morceaux.length) derniere.pop();
			}
		}
	}

	let indexMot = 0;
	lignes.forEach((ids, n) => {
		const largeurs = ids.map((id) => texteMorceaux[id].map((x) => mesurer(x.texte, x.accent)));
		const largeur = largeurs.reduce((a, l, k) => a + (k ? espace : 0) + l.reduce((s, x) => s + x, 0), 0);
		const alignement = o.alignement ?? "gauche";
		const gauche = alignement === "centre" ? o.x - largeur / 2 : alignement === "droite" ? o.x - largeur : o.x;
		const haut = o.y + n * lh;
		// ligne de base : capitales centrees verticalement dans la hauteur de ligne
		const y = haut + (lh + taille * CAPITALE) / 2;
		let x = gauche;
		ids.forEach((id, k) => {
			if (k) x += espace;
			texteMorceaux[id].forEach((m, j) => {
				fragments.push({ texte: m.texte, accent: m.accent, mot: indexMot, ligne: n, x, y, largeur: largeurs[k][j] });
				x += largeurs[k][j];
			});
			indexMot++;
		});
		resultat.push({ x: gauche, y, largeur, haut });
	});
	ctx.restore();

	return {
		taille,
		interligne: lh,
		ambiance,
		niveau: o.niveau,
		majuscules,
		fragments,
		lignes: resultat,
		mots: indexMot,
		x: Math.min(...resultat.map((l) => l.x)),
		y: o.y,
		largeur: Math.max(0, ...resultat.map((l) => l.largeur)),
		hauteur: resultat.length * lh,
		reduit: taille < voulue - 1e-6,
		coupe,
	};
}

// Dessin statique d'un bloc (texte pose, sans animation)
export function dessinerBloc(ctx: Ctx2D, bloc: Bloc, couleur: string, couleurAccent = couleur) {
	ctx.save();
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	for (const f of bloc.fragments) {
		appliquerPolice(ctx, bloc, f.accent);
		ctx.fillStyle = f.accent ? couleurAccent : couleur;
		ctx.fillText(f.texte, f.x, f.y);
	}
	reinitialiserPolice(ctx);
	ctx.restore();
}
