import type { Geste } from "@weekli/core";

// Selection des procedes selon les gestes de la pub (design.md 8.16). Logique pure, sans canvas :
// une scene donne ses procedes par ordre de preference, le premier autorise gagne, sinon le repli
// neutre (mot par mot). `null` : le script ne choisit rien, la scene joue son procede par defaut.

export type Gestes = ReadonlySet<Geste> | null;

export type Apparition = "mot" | "frappe" | "lettres" | "impact" | "glisse";

// Geste(s) qui autorisent un procede ; le mot par mot n'en demande aucun
const REQUIS: Record<Apparition, readonly Geste[]> = {
	mot: [],
	frappe: ["frappe"],
	lettres: ["lettres"],
	impact: ["impact"],
	glisse: ["lettres", "impact"], // entree lettre par lettre en glissade : un projet nerveux
};

export const geste = (gestes: Gestes, nom: Geste): boolean => !gestes || gestes.has(nom);

export function choisirApparition(gestes: Gestes, preferences: readonly Apparition[], defaut: Apparition = preferences[0] ?? "mot"): Apparition {
	if (!gestes) return defaut;
	return preferences.find((p) => REQUIS[p].length === 0 || REQUIS[p].some((g) => gestes.has(g))) ?? "mot";
}

// Option `accent` de dessinerMotParMot : undefined joue le rebond 1,06, -1 pose la couleur sans rebond.
// `rebondParDefaut` : comportement de la scene quand le script ne choisit aucun geste.
export const rebondAccent = (gestes: Gestes, rebondParDefaut = true): boolean => (gestes ? gestes.has("accent") : rebondParDefaut);

export const optionAccent = (gestes: Gestes, rebondParDefaut = true): number | undefined => (rebondAccent(gestes, rebondParDefaut) ? undefined : -1);

export type MiseEnValeur = { surlignage: boolean; soulignement: boolean; impact: boolean };

export function miseEnValeur(gestes: Gestes): MiseEnValeur {
	return { surlignage: geste(gestes, "surlignage"), soulignement: geste(gestes, "soulignement"), impact: geste(gestes, "impact") };
}
