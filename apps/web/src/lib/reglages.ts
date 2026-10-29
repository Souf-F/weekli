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

// Efface tout ce que Weekli garde dans le navigateur (cle API, modele, ancien style)
export function effacerReglages() {
	for (const type of ["local", "session"] as const) {
		stockage(type)?.removeItem(CLE);
		stockage(type)?.removeItem(PREFS);
	}
}
