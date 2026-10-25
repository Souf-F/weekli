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
export type Carte = { titre: string; detail?: string };

export type Visuel =
	| { type: "capture"; capture: string; cadrage?: Cadrage; focus?: Rect }
	| { type: "liste"; titre: string; elements: string[] };

export type SceneCommune = {
	id: string;
	voix: string;
	duree?: number;
	transition?: Transition;
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
		| { type: "resultat"; titre: MotsAccent; avant: string; tampon: string; apres: string; chute?: MotsAccent }
		| { type: "preuve"; surtitre: string; elements: string[]; cartes?: { titre: string; texte?: string }[] }
		| { type: "appel"; question: MotsAccent; badge?: MotsAccent; action: string; bouton: string }
		| { type: "fin"; slogan?: string; bouton?: string; liens: string[]; mentionWeekli?: boolean }
	);

export type TypeScene = ScenePub["type"];

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
	captures: CaptureRef[];
	scenes: ScenePub[];
};

export type ResultatNettoyage = { script: ScriptPub | null; avertissements: string[]; erreurs: string[] };

// Pub stockee par le serveur (KV chiffre, ADR-05) et sa forme resumee pour les listes
export type PubEnregistree = { id: string; cree: string; maj: string; script: ScriptPub };
export type PubResume = { id: string; titre: string; projet: string; cree: string; maj: string; scenes: number };
