import type { But, Transition, TypeScene } from "./types";

// Longueurs maximales des champs texte (api-contract.md 2.1)
export const LIMITES_PUB = {
	titre: 80,
	nom: 40,
	lien: 120,
	reponse: 300,
	legende: 60,
	voix: 220,
	monogramme: 2,
	prononciation: { entrees: 20, texte: 40 },
	captures: { min: 0, max: 6 },
	scenes: { min: 8, max: 14 },
	vitesse: { min: 0.85, max: 1.2, defaut: 1 },
	etapes: { max: 4 },
	// Une capture est un but "montrer" bref et rare (design.md 8.10 et 8.17)
	capturesScene: { max: 2, dureeMax: 2.5, motsVoix: 5 },
	// Un meme argument (mot significatif) ne revient pas dans plus de 2 scenes (design.md 8.18)
	repetition: { scenesParMot: 3, scenesParIdee: 2, longueurMot: 5 },
	motsVoix: { min: 120, max: 170 },
	dureeTotale: { min: 50, max: 65 },
	tailleJsonOctets: 24 * 1024,
} as const;

export const REGEX_ID = /^[a-z0-9-]{1,24}$/;
// Meme motif que NOM_REPO dans apps/server/src/lib/validation.ts (core ne depend pas du serveur)
export const REGEX_NOM_REPO = /^[A-Za-z0-9._-]{1,100}$/;
export const COULEUR_HEX = /^#[0-9a-fA-F]{6}$/;

export const ALERTE_DEFAUT = "#e5484d";
export const ACCENT_GRIS_DEFAUT = "#3d4bff";

// Debit de la voix a vitesse 1 (api-contract.md 3.5) et marge ajoutee a la voix (architecture.md section 7)
export const MOTS_PAR_MINUTE = 170;
export const MARGE_VOIX = 0.35;
// Delai entre le debut d'une scene et le debut de sa voix
export const DECALAGE_VOIX = 0.15;

// Durees en secondes par type de scene (design.md 8.9)
export const DUREES_SCENE: Record<TypeScene, { min: number; defaut: number; max: number }> = {
	ouverture: { min: 1.8, defaut: 2.5, max: 3.5 },
	repetition: { min: 2.5, defaut: 3.5, max: 5 },
	boucle: { min: 3, defaut: 4, max: 5.5 },
	chorus: { min: 3, defaut: 4, max: 5.5 },
	rupture: { min: 2.5, defaut: 3.5, max: 4.5 },
	revelation: { min: 4.5, defaut: 6, max: 7.5 },
	etape: { min: 3.5, defaut: 4.5, max: 6 },
	transformation: { min: 3.5, defaut: 4.5, max: 6 },
	flux: { min: 4, defaut: 5, max: 6.5 },
	avantapres: { min: 3.5, defaut: 4.5, max: 6 },
	resultat: { min: 4, defaut: 5, max: 6.5 },
	preuve: { min: 3.5, defaut: 4.5, max: 6 },
	appel: { min: 4, defaut: 5, max: 6.5 },
	fin: { min: 3, defaut: 4, max: 5 },
};

// Duree de chaque transition d'entree, en secondes (design.md 8.8)
export const DUREES_TRANSITION: Record<Transition, number> = { coupe: 0, glitch: 0.3, flou: 0.5, pixels: 0.6 };

export const TRANSITIONS: readonly Transition[] = ["coupe", "glitch", "flou", "pixels"];

// Pause de lecture par but, en secondes : temps immobile apres la fin des gestes d'entree (design.md 8.16)
export const PAUSE_LECTURE: Record<But, number> = { lire: 1.2, comprendre: 0.8, montrer: 0.5 };

// Duree des gestes d'entree de chaque type de scene, en secondes (estimation lue dans les scenes du moteur) ;
// une etape portee par une capture entre en 1 s
export const DUREE_GESTES: Record<TypeScene, number> = {
	ouverture: 0.8,
	repetition: 1.8,
	boucle: 1.8,
	chorus: 2,
	rupture: 1.2,
	revelation: 3,
	etape: 1.6,
	transformation: 2,
	flux: 2.4,
	avantapres: 2,
	resultat: 2.4,
	preuve: 1.8,
	appel: 2.4,
	fin: 1.6,
};
export const DUREE_GESTES_CAPTURE = 1;
