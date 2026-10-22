// Reglages de l'utilisateur, stockes uniquement dans son navigateur.
// La cle API va en sessionStorage par defaut (effacee a la fermeture), en localStorage si l'utilisateur le demande.

export type Modele = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";

export type Reglages = {
	cleApi: string;
	memoriser: boolean;
	modele: Modele;
	style: string;
};

export const MODELES: { id: Modele; nom: string; detail: string }[] = [
	{ id: "claude-opus-5-5", nom: "Claude Opus 5.5", detail: "Meilleure qualite d'ecriture" },
	{ id: "claude-sonnet-5-5", nom: "Claude Sonnet 5.5", detail: "Rapide et moins cher" },
	{ id: "claude-haiku-5-5", nom: "Claude Haiku 5.5", detail: "Le plus economique" },
];

const CLE = "weekli.cle";
const PREFS = "weekli.prefs";

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
		style: prefs.style ?? "",
	};
}

export function enregistrerReglages(r: Reglages) {
	stockage("local")?.setItem(PREFS, JSON.stringify({ modele: r.modele, style: r.style }));
	stockage("local")?.removeItem(CLE);
	stockage("session")?.removeItem(CLE);
	if (r.cleApi) stockage(r.memoriser ? "local" : "session")?.setItem(CLE, r.cleApi);
}
