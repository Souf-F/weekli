import { nettoyerStyle, type StyleEcriture, styleVide } from "@weekli/core";
import { chiffrer, dechiffrer } from "./chiffrement";
import { CONSERVATION_SECONDES } from "./conservation";

// Style d'ecriture d'un utilisateur, partage entre Claude (MCP) et le site : une entree KV chiffree par compte (ADR-04)
const USAGE = "style";
export const cleStyle = (id: string) => `style:${id}`;

export async function lireStyle(env: Env, id: string): Promise<StyleEcriture> {
	const donnee = await env.OAUTH_KV.get(cleStyle(id));
	const style = donnee && (await dechiffrer<StyleEcriture>(env.COOKIE_ENCRYPTION_KEY, USAGE, donnee, cleStyle(id)));
	return style
		? { exemples: style.exemples, profil: style.profil, maj: style.maj }
		: { exemples: "", profil: "", maj: null };
}

// Fusionne les champs fournis avec le style existant. Renvoie null si le resultat serait vide (il faut alors supprimer).
export async function ecrireStyle(env: Env, id: string, entree: unknown): Promise<StyleEcriture | null> {
	const propre = nettoyerStyle(entree);
	if (Object.keys(propre).length === 0) return null;
	const { exemples, profil } = { ...(await lireStyle(env, id)), ...propre };
	if (styleVide({ exemples, profil })) return null;
	const style = { exemples, profil, maj: new Date().toISOString() };
	await env.OAUTH_KV.put(cleStyle(id), await chiffrer(env.COOKIE_ENCRYPTION_KEY, USAGE, style, cleStyle(id)), {
		expirationTtl: CONSERVATION_SECONDES,
	});
	return style;
}

export const supprimerStyle = (env: Env, id: string) => env.OAUTH_KV.delete(cleStyle(id));
