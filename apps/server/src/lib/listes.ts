import { chiffrer, dechiffrer } from "./chiffrement";

// Petites listes indexees dans KV (sessions d'un compte, Durable Objects d'un compte), chiffrees comme le reste.
// Lecture puis ecriture non atomiques : acceptable pour des index dont l'expiration naturelle sert de filet.
export async function lireListe<T>(env: Env, usage: string, cle: string): Promise<T[]> {
	const brut = await env.OAUTH_KV.get(cle);
	return (brut && (await dechiffrer<T[]>(env.COOKIE_ENCRYPTION_KEY, usage, brut, cle))) || [];
}

// Une liste vide supprime la cle
export async function ecrireListe<T>(env: Env, usage: string, cle: string, liste: T[], expirationTtl?: number) {
	if (liste.length === 0) return env.OAUTH_KV.delete(cle);
	await env.OAUTH_KV.put(cle, await chiffrer(env.COOKIE_ENCRYPTION_KEY, usage, liste, cle), {
		...(expirationTtl && { expirationTtl }),
	});
}
