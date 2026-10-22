// Schema d'un script video : une suite de segments, chacun = une phrase de voix off + un visuel.
// Le skill video-projet ecrit ces scripts ; scripts/produire.mjs ajoute les durees mesurees sur la voix.

export type Format = "portrait" | "paysage"; // 1080x1350 (LinkedIn) ou 1920x1080 (YouTube, portfolio)
export type Ambiance = "energique" | "calme";

export type Icone = "github" | "ia" | "video" | "bouclier" | "eclair" | "code" | "camera" | "historique" | "serveur" | "cle";

export type Visuel =
	| { type: "accroche"; texte: string; sousTexte?: string }
	| { type: "probleme"; titre: string; points: string[] }
	| { type: "revelation"; nom: string; slogan: string }
	| { type: "fonctionnalites"; titre: string; elements: { titre: string; texte: string; icone: Icone }[] }
	| { type: "chiffres"; elements: { valeur: number; suffixe?: string; libelle: string }[] }
	| { type: "terminal"; commande: string; lignes: string[] }
	| { type: "capture"; image: string; legende?: string }
	| { type: "architecture"; titre: string; noeuds: { id: string; nom: string; detail?: string }[]; liens: [string, string][] }
	| { type: "chronologie"; titre: string; etapes: { date: string; titre: string; detail?: string }[] }
	| { type: "code"; fichier: string; lignes: string[] }
	| { type: "citation"; texte: string; auteur?: string }
	| { type: "appel"; titre: string; lien: string; sousTexte?: string };

export type Segment = {
	id: string;
	voix: string; // texte dit par la voix off, et affiche en sous-titres
	visuel: Visuel;
	duree?: number; // secondes, mesuree sur le fichier audio par produire.mjs
	audio?: string; // chemin dans public/, ecrit par produire.mjs
};

export type Script = {
	titre: string;
	projet: string;
	format: Format;
	ambiance: Ambiance;
	segments: Segment[];
	musique?: string; // chemin dans public/, ecrit par produire.mjs
	prononciation?: Record<string, string>; // mot affiche -> mot prononce
};
