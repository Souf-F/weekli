import { ajouterBrouillons, type Brouillon, creerBrouillons, type Post } from "@weekli/core";
import { chiffrer, dechiffrer } from "./chiffrement";
import { CONSERVATION_SECONDES, perimee } from "./conservation";

// Historique des brouillons d'un utilisateur : une seule entree KV par compte, chiffree
const USAGE = "brouillons";
export const cleBrouillons = (id: string) => `brouillons:${id}`;

// Les brouillons crees il y a plus de 90 jours sont retires, et supprimes de KV s'il y en avait
export async function lireBrouillons(env: Env, id: string): Promise<Brouillon[]> {
	const donnee = await env.OAUTH_KV.get(cleBrouillons(id));
	const tous = (donnee && (await dechiffrer<Brouillon[]>(env.COOKIE_ENCRYPTION_KEY, USAGE, donnee, cleBrouillons(id)))) || [];
	const recents = tous.filter((b) => !perimee(b.cree));
	if (recents.length < tous.length) {
		await (recents.length ? ecrireBrouillons(env, id, recents) : supprimerBrouillons(env, id));
	}
	return recents;
}

export async function ecrireBrouillons(env: Env, id: string, brouillons: Brouillon[]) {
	await env.OAUTH_KV.put(cleBrouillons(id), await chiffrer(env.COOKIE_ENCRYPTION_KEY, USAGE, brouillons, cleBrouillons(id)), {
		expirationTtl: CONSERVATION_SECONDES,
	});
}

export const supprimerBrouillons = (env: Env, id: string) => env.OAUTH_KV.delete(cleBrouillons(id));

export async function sauverPosts(env: Env, id: string, posts: Post[]): Promise<Brouillon[]> {
	const nouveaux = creerBrouillons(posts);
	await ecrireBrouillons(env, id, ajouterBrouillons(await lireBrouillons(env, id), nouveaux));
	return nouveaux;
}
