// Script de pub, version 1 : voir docs/api-contract.md section 2.1

export type Hex = `#${string}`; // #rrggbb uniquement

export type CaptureRef = {
	id: string;
	source: "site" | "importee";
	url?: string;
	format: "bureau" | "mobile";
	legende?: string;
};

export type Rect = { x: number; y: number; largeur: number; hauteur: number }; // fractions de 0 a 1
export type Cadrage = "haut" | "milieu" | "bas" | "complet" | Rect;
export type MotsAccent = { texte: string; accent?: string };
export type Transition = "coupe" | "glitch" | "flou" | "pixels";

// Gestes de la bibliotheque de mouvement (design.md 8.7 et 8.8) : une pub en retient 2 ou 3
export const GESTES = [
	"accent",
	"surlignage",
	"soulignement",
	"frappe",
	"impact",
	"lettres",
	"glitch",
	"pixels",
	"flou",
	"rayons",
] as const;
export type Geste = (typeof GESTES)[number];
export const GESTES_PUB = { min: 2, max: 3 } as const;

// But d'une scene : regle sa pause de lecture (design.md 8.16)
export const BUTS = ["lire", "comprendre", "montrer"] as const;
export type But = (typeof BUTS)[number];
export type Carte = { titre: string; detail?: string };

// Icones disponibles pour les scenes d'explication (design.md 8.17) : glyphes geometriques dessines par le moteur
export const ICONES = [
	"document",
	"message",
	"video",
	"image",
	"calendrier",
	"horloge",
	"personne",
	"equipe",
	"cadenas",
	"bouclier",
	"eclair",
	"etoile",
	"coeur",
	"panier",
	"lien",
	"dossier",
	"courrier",
	"telephone",
	"graphique",
	"coche",
	"nuage",
	"engrenage",
	"loupe",
	"crayon",
	"micro",
	"musique",
	"cle",
	"maison",
] as const;
export type Icone = (typeof ICONES)[number];
export const ICONE_DEFAUT: Icone = "etoile";
export type ObjetIcone = { icone: Icone; libelle: string };
export type NoeudFlux = { icone: Icone; libelle: string; detail?: string };
export type PaireAvantApres = { avant: string; apres: string };

export type Visuel =
	| { type: "capture"; capture: string; cadrage?: Cadrage; focus?: Rect }
	| { type: "liste"; titre: string; elements: string[] };

export type SceneCommune = {
	id: string;
	voix: string;
	duree?: number;
	transition?: Transition;
	but?: But;
	masquee?: boolean;
};

export type ScenePub = SceneCommune &
	(
		| { type: "ouverture"; moment: string; detail?: string }
		| { type: "repetition"; lignes: MotsAccent[]; impact: string; carte?: Carte }
		| { type: "boucle"; phrase: MotsAccent; reperes: string[]; carte: Carte }
		| { type: "chorus"; titre: MotsAccent; chute: MotsAccent; bulles: string[] }
		| { type: "rupture"; texte: MotsAccent }
		| { type: "revelation"; slogan: MotsAccent; signature?: string }
		| { type: "etape"; titre: MotsAccent; texte?: string; filigrane: string; onglet: string; visuel: Visuel }
		| { type: "transformation"; titre: MotsAccent; entree: ObjetIcone; operateur: string; sortie: ObjetIcone; texte?: string }
		| { type: "flux"; titre: MotsAccent; noeuds: NoeudFlux[] }
		| { type: "avantapres"; titre: MotsAccent; avant?: string; apres?: string; paires: PaireAvantApres[] }
		| { type: "resultat"; titre: MotsAccent; avant: string; tampon: string; apres: string; chute?: MotsAccent }
		| { type: "preuve"; surtitre: string; elements: string[]; cartes?: { titre: string; texte?: string }[] }
		| { type: "appel"; question: MotsAccent; badge?: MotsAccent; action: string; bouton: string }
		| { type: "fin"; slogan?: string; bouton?: string; liens: string[]; mentionWeekli?: boolean }
	);

export type TypeScene = ScenePub["type"];

// But par defaut de chaque type de scene
export const BUT_DEFAUT: Record<TypeScene, But> = {
	ouverture: "lire",
	repetition: "lire",
	boucle: "comprendre",
	chorus: "lire",
	rupture: "lire",
	revelation: "lire",
	etape: "comprendre",
	transformation: "comprendre",
	flux: "comprendre",
	avantapres: "comprendre",
	resultat: "comprendre",
	preuve: "lire",
	appel: "lire",
	fin: "montrer",
};

// Trames narratives (design.md 8.13) : l'ordre des scenes est choisi selon le projet, jamais copie d'une reference
export const TRAMES = ["probleme-qui-revient", "demonstration-directe", "vision-manifeste"] as const;
export type Trame = (typeof TRAMES)[number];

export type ScriptPub = {
	version: 1;
	titre: string;
	projet: { nom: string; repo: string; lien: string };
	reponses: { pourQui: string; probleme: string; promesse: string };
	marque: {
		primaire: Hex;
		accent?: Hex;
		alerte?: Hex;
		logo: "monogramme" | "image";
		monogramme?: string;
		typo: "nette" | "editoriale";
	};
	voix: { mode: "synthese" | "importee" | "aucune"; vitesse: number; prononciation: Record<string, string> };
	musique: "energique" | "calme" | "aucune";
	trame?: Trame;
	gestes?: Geste[];
	captures: CaptureRef[];
	scenes: ScenePub[];
};

export type ResultatNettoyage = { script: ScriptPub | null; avertissements: string[]; erreurs: string[] };

// Pub stockee par le serveur (KV chiffre, ADR-05) et sa forme resumee pour les listes
export type PubEnregistree = { id: string; cree: string; maj: string; script: ScriptPub };
export type PubResume = { id: string; titre: string; projet: string; cree: string; maj: string; scenes: number };
