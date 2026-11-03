// Reglages de l'utilisateur, stockes uniquement dans son navigateur (cle API et modele).
// Le style d'ecriture vit sur le serveur (lib/style.ts) : il n'est plus jamais ecrit ici.
// La cle API va en sessionStorage par defaut (effacee a la fermeture), en localStorage si l'utilisateur le demande.

export type Modele = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";

export type Reglages = {
	cleApi: string;
	memoriser: boolean;
	modele: Modele;
};

export const MODELES: { id: Modele; nom: string; detail: string }[] = [
	{ id: "claude-opus-5-5", nom: "Claude Opus 5.5", detail: "Meilleure qualite d'ecriture" },
	{ id: "claude-sonnet-5-5", nom: "Claude Sonnet 5.5", detail: "Rapide et moins cher" },
	{ id: "claude-haiku-5-5", nom: "Claude Haiku 5.5", detail: "Le plus economique" },
];

const CLE = "weekli.cle";
const PREFS = "weekli.prefs";
export const CLE_DERNIER_REPO = "weekli.dernierRepo";
// Bases IndexedDB : medias du studio de pub (images, logo) et cache des fichiers du modele de voix Kokoro
export const BASES_INDEXEDDB = ["weekli-pub", "weekli-voix"] as const;

// Ancien emplacement du style, lu seulement par la migration de lib/style.ts
export const ANCIEN_STYLE = { cle: PREFS, champ: "style" } as const;

function stockage(type: "local" | "session"): Storage | null {
	try {
		return type === "local" ? localStorage : sessionStorage;
	} catch {
		return null;
	}
}

export function lireReglages(): Reglages {
	let prefs: Partial<Reglages> = {};
	try {
		prefs = JSON.parse(stockage("local")?.getItem(PREFS) ?? "{}");
	} catch {
		/* prefs corrompues : on repart des valeurs par defaut */
	}
	const cleApi = stockage("session")?.getItem(CLE) ?? stockage("local")?.getItem(CLE) ?? "";
	return {
		cleApi,
		memoriser: Boolean(stockage("local")?.getItem(CLE)),
		modele: prefs.modele ?? "claude-opus-5-5",
	};
}

export function enregistrerReglages(r: Reglages) {
	stockage("local")?.setItem(PREFS, JSON.stringify({ modele: r.modele }));
	stockage("local")?.removeItem(CLE);
	stockage("session")?.removeItem(CLE);
	if (r.cleApi) stockage(r.memoriser ? "local" : "session")?.setItem(CLE, r.cleApi);
}

function supprimerBase(nom: string): Promise<void> {
	return new Promise((resoudre, rejeter) => {
		if (typeof indexedDB === "undefined") return resoudre();
		const requete = indexedDB.deleteDatabase(nom);
		requete.onsuccess = () => resoudre();
		// Une autre connexion reste ouverte : le navigateur supprime la base des qu'elle se ferme
		requete.onblocked = () => resoudre();
		requete.onerror = () => rejeter(requete.error ?? new Error(`Suppression de ${nom} impossible`));
	});
}

// Efface tout ce que Weekli garde dans le navigateur : cle API, modele, ancien style, dernier repo, IndexedDB.
// Tente toutes les etapes, puis liste celles qui ont echoue.
export async function effacerDonneesLocales(): Promise<void> {
	const echecs: string[] = [];
	for (const type of ["local", "session"] as const) {
		try {
			for (const cle of [CLE, PREFS, CLE_DERNIER_REPO]) stockage(type)?.removeItem(cle);
		} catch {
			echecs.push(`${type}Storage`);
		}
	}
	const bases = await Promise.allSettled(BASES_INDEXEDDB.map(supprimerBase));
	bases.forEach((r, i) => r.status === "rejected" && echecs.push(BASES_INDEXEDDB[i]));
	if (echecs.length) throw new Error(`Effacement local incomplet : ${echecs.join(", ")}`);
}
