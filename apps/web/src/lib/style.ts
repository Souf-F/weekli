import { type StyleEcriture, styleVide, texteStyle } from "@weekli/core";
import { api } from "./api";
import { ANCIEN_STYLE } from "./reglages";

// Lit l'ancien style stocke dans le navigateur, sans le garder en memoire ailleurs
function lireAncienStyle(): string {
	try {
		const prefs = JSON.parse(localStorage.getItem(ANCIEN_STYLE.cle) ?? "{}");
		const ancien = prefs?.[ANCIEN_STYLE.champ];
		return typeof ancien === "string" ? ancien.trim() : "";
	} catch {
		return "";
	}
}

function oublierAncienStyle() {
	try {
		const prefs = JSON.parse(localStorage.getItem(ANCIEN_STYLE.cle) ?? "null");
		if (!prefs || typeof prefs !== "object" || !(ANCIEN_STYLE.champ in prefs)) return;
		delete prefs[ANCIEN_STYLE.champ];
		localStorage.setItem(ANCIEN_STYLE.cle, JSON.stringify(prefs));
	} catch {
		/* stockage indisponible ou corrompu : rien a migrer */
	}
}

let migration: Promise<StyleEcriture> | null = null;

// Charge le style du serveur. Migration unique : si le navigateur garde un ancien style et que le serveur n'en a pas,
// il est envoye au serveur ; dans tous les cas l'ancienne copie locale est ensuite supprimee.
export function chargerStyle(): Promise<StyleEcriture> {
	migration ??= (async () => {
		let style = await api.style();
		const ancien = lireAncienStyle();
		if (ancien) {
			if (styleVide(style)) style = await api.sauverStyle({ exemples: ancien });
			oublierAncienStyle();
		}
		return style;
	})().finally(() => {
		migration = null;
	});
	return migration;
}

// Texte injecte dans le prompt de generation ; vide si aucun style n'est memorise ou si le serveur ne repond pas
export async function texteStyleServeur(): Promise<string> {
	try {
		return texteStyle(await chargerStyle());
	} catch {
		return "";
	}
}
