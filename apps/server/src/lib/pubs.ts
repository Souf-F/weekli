import { calculerTimeline, type PubEnregistree, type PubResume, type ScriptPub } from "@weekli/core";
import { chiffrer, dechiffrer } from "./chiffrement";
import { CONSERVATION_SECONDES, perimee } from "./conservation";

// Scripts de pub d'un utilisateur : une entree KV chiffree par compte, 20 pubs au plus (ADR-05)
const USAGE = "pubs";
export const MAX_PUBS = 20;
export const clePubs = (id: string) => `pubs:${id}`;

export class LimitePubs extends Error {}

// Duree de la pub en secondes, voix comptee au debit estime (api-contract.md, outil sauver_pub)
export const dureeEstimee = (script: ScriptPub) => Math.round(calculerTimeline(script).duree);

export const resume = ({ id, cree, maj, script }: PubEnregistree): PubResume => ({
	id,
	titre: script.titre,
	projet: script.projet.nom,
	cree,
	maj,
	scenes: script.scenes.filter((sc) => !sc.masquee).length,
});

async function ecrire(env: Env, id: string, pubs: PubEnregistree[]) {
	if (pubs.length === 0) return env.OAUTH_KV.delete(clePubs(id));
	await env.OAUTH_KV.put(clePubs(id), await chiffrer(env.COOKIE_ENCRYPTION_KEY, USAGE, pubs, clePubs(id)), {
		expirationTtl: CONSERVATION_SECONDES,
	});
}

// Du plus recemment modifie au plus ancien. Les pubs non modifiees depuis plus de 90 jours sont retirees de KV.
export async function lirePubs(env: Env, id: string): Promise<PubEnregistree[]> {
	const donnee = await env.OAUTH_KV.get(clePubs(id));
	const toutes =
		(donnee && (await dechiffrer<PubEnregistree[]>(env.COOKIE_ENCRYPTION_KEY, USAGE, donnee, clePubs(id)))) || [];
	const recentes = toutes.filter((p) => !perimee(p.maj));
	if (recentes.length < toutes.length) await ecrire(env, id, recentes);
	return recentes.sort((a, b) => b.maj.localeCompare(a.maj));
}

export async function lirePub(env: Env, id: string, pubId: string) {
	return (await lirePubs(env, id)).find((p) => p.id === pubId) ?? null;
}

// Lance LimitePubs au-dela de 20 pubs
export async function creerPub(env: Env, id: string, script: ScriptPub): Promise<PubEnregistree> {
	const pubs = await lirePubs(env, id);
	if (pubs.length >= MAX_PUBS) throw new LimitePubs();
	const maintenant = new Date().toISOString();
	const pub = { id: crypto.randomUUID(), cree: maintenant, maj: maintenant, script };
	await ecrire(env, id, [pub, ...pubs]);
	return pub;
}

// Null si la pub n'existe pas pour ce compte
export async function remplacerPub(
	env: Env,
	id: string,
	pubId: string,
	script: ScriptPub,
): Promise<PubEnregistree | null> {
	const pubs = await lirePubs(env, id);
	const cible = pubs.find((p) => p.id === pubId);
	if (!cible) return null;
	const pub = { ...cible, maj: new Date().toISOString(), script };
	await ecrire(
		env,
		id,
		pubs.map((p) => (p.id === pubId ? pub : p)),
	);
	return pub;
}

export async function supprimerPub(env: Env, id: string, pubId: string): Promise<boolean> {
	const pubs = await lirePubs(env, id);
	const restantes = pubs.filter((p) => p.id !== pubId);
	if (restantes.length === pubs.length) return false;
	await ecrire(env, id, restantes);
	return true;
}

export const supprimerPubs = (env: Env, id: string) => env.OAUTH_KV.delete(clePubs(id));
