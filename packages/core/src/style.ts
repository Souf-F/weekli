export const LIMITES_STYLE = { exemples: 8000, profil: 2000 } as const;

// Style d'ecriture memorise : posts bruts de l'utilisateur (exemples) et synthese redigee par Claude ou lui (profil)
export type StyleEcriture = {
	exemples: string;
	profil: string;
	maj: string | null;
};

type ChampsStyle = Pick<StyleEcriture, "exemples" | "profil">;

// Nettoie un style venu de l'exterieur (navigateur ou Claude) : types, caracteres de controle, longueurs.
// Ne renvoie que les champs fournis sous forme de texte (une chaine vide efface le champ), les autres sont ignores.
export function nettoyerStyle(entree: unknown): Partial<ChampsStyle> {
	if (!entree || typeof entree !== "object") return {};
	const e = entree as Record<string, unknown>;
	const propre: Partial<ChampsStyle> = {};
	for (const nom of ["exemples", "profil"] as const) {
		const valeur = e[nom];
		if (typeof valeur === "string") {
			propre[nom] = valeur
				.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
				.trim()
				.slice(0, LIMITES_STYLE[nom]);
		}
	}
	return propre;
}

export const styleVide = ({ exemples, profil }: ChampsStyle) => !exemples && !profil;

// Texte injecte dans le prompt : le profil d'abord, puis les exemples. Vide si aucun style n'est memorise.
export function texteStyle({ exemples, profil }: ChampsStyle): string {
	return [profil && `Profil de style :\n${profil}`, exemples && `Exemples de posts de l'auteur :\n${exemples}`]
		.filter(Boolean)
		.join("\n\n");
}
