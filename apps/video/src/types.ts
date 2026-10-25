// Schema d'un script video : une suite de segments, chacun = une phrase de voix off + un visuel.
// Le skill video-projet ecrit ces scripts ; scripts/produire.mjs ajoute les durees mesurees sur la voix.

export type Format = "paysage" | "portrait"; // 1920x1080 (16:9, defaut) ou 1080x1350 (LinkedIn)
export type Ambiance = "energique" | "calme";

export type Icone = "github" | "ia" | "video" | "bouclier" | "eclair" | "code" | "camera" | "historique" | "serveur" | "cle";

export type Visuel =
	| { type: "accroche"; texte: string; sousTexte?: string }
	| { type: "probleme"; titre: string; points: string[] }
	| { type: "revelation"; nom: string; slogan: string }
	| { type: "fonctionnalites"; titre: string; elements: { titre: string; texte: string; icone: Icone }[] }
	| { type: "chiffres"; elements: { valeur: number; suffixe?: string; libelle: string }[] }
	| { type: "capture"; image: string; legende?: string }
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
	format?: Format; // paysage par defaut
	ambiance: Ambiance;
	segments: Segment[];
	musique?: string; // chemin dans public/, ecrit par produire.mjs
	prononciation?: Record<string, string>; // mot affiche -> mot prononce
};
