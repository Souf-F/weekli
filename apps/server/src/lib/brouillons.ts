import { ajouterBrouillons, type Brouillon, creerBrouillons, type Post } from "@weekli/core";
import { chiffrer, dechiffrer } from "./chiffrement";

// Historique des brouillons d'un utilisateur : une seule entree KV par compte, chiffree
const USAGE = "brouillons";
const cle = (login: string) => `brouillons:${login.toLowerCase()}`;

export async function lireBrouillons(env: Env, login: string): Promise<Brouillon[]> {
	const donnee = await env.OAUTH_KV.get(cle(login));
	return (donnee && (await dechiffrer<Brouillon[]>(env.COOKIE_ENCRYPTION_KEY, USAGE, donnee))) || [];
}

export async function ecrireBrouillons(env: Env, login: string, brouillons: Brouillon[]) {
	await env.OAUTH_KV.put(cle(login), await chiffrer(env.COOKIE_ENCRYPTION_KEY, USAGE, brouillons));
}

export async function sauverPosts(env: Env, login: string, posts: Post[]): Promise<Brouillon[]> {
	const nouveaux = creerBrouillons(posts);
	await ecrireBrouillons(env, login, ajouterBrouillons(await lireBrouillons(env, login), nouveaux));
	return nouveaux;
}
