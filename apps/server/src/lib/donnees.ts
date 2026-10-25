import { supprimerBrouillons } from "./brouillons";
import { supprimerDomaines } from "./domaines";
import { revoquerAutorisation } from "./github-oauth";
import { clesParLogin } from "./identite";
import { lireNomsMcp, supprimerIndexMcp } from "./mcp-index";
import { supprimerPubs } from "./pubs";
import { sessionsIndexees, supprimerIndexSessions } from "./session";
import { supprimerStyle } from "./style";


import type { AppEnv, Session } from "../types";

const journal = (etape: string, err: unknown) => console.error(`Effacement, ${etape} :`, err instanceof Error ? err.name : "echec");

// Etape 2 : tokens d'acces et de rafraichissement de Claude invalides, toutes les autorisations du compte
async function revoquerGrants(env: AppEnv["Bindings"], id: string) {
	let cursor: string | undefined;
	do {
		const page = await env.OAUTH_PROVIDER.listUserGrants(id, { cursor });
		for (const grant of page.items) await env.OAUTH_PROVIDER.revokeGrant(grant.id, id);
		cursor = page.cursor;
	} while (cursor);
}

// Etape 3 : destroy() interrompt l'isolat du Durable Object, l'appel RPC peut donc lever : l'index est supprime quand meme
async function detruireObjets(env: Env, id: string) {
	const noms = await lireNomsMcp(env, id);
	if (noms.length) {
		const { getAgentByName } = await import("agents");
		await Promise.allSettled(noms.map(async (nom) => (await getAgentByName(env.MCP_OBJECT, nom)).detruire()));
	}
	await supprimerIndexMcp(env, id);
}

// Etape 5 : toutes les sessions du compte (autres navigateurs compris), puis l'index
async function fermerSessions(env: Env, id: string) {
	const sids = await sessionsIndexees(env, id);
	await Promise.all(sids.map((sid) => env.OAUTH_KV.delete(`session:${sid}`)));
	await supprimerIndexSessions(env, id);
}

// Tente une etape et renvoie son erreur au lieu de la lever, pour que les suivantes soient toujours tentees
const tenter = (fn: () => Promise<unknown>) => fn().then(() => null, (err: unknown) => err ?? new Error("echec"));

// Droit a l'effacement (ADR-02). L'identite vient toujours de la session, jamais d'un parametre de la requete.
// Les etapes se suivent dans l'ordre du contrat et chacune est tentee meme si une autre echoue. Les echecs des etapes
// 2 a 4 sont journalises (l'expiration naturelle prend le relais). Si KV echoue (etape 1 ou 5), une erreur est levee :
// l'appel est idempotent. Dans ce cas la session courante est conservee (etape 5 non tentee apres un echec de l'etape 1)
// pour que l'utilisateur puisse relancer l'effacement.
// Les anciennes cles par login sont aussi supprimees tant que la migration existe (ADR-01, B14).
export async function effacerDonnees(env: AppEnv["Bindings"], session: Session) {
	const { id } = session;
	const echecKv = await tenter(() =>
		Promise.all([
			supprimerBrouillons(env, id),
			supprimerPubs(env, id),
			supprimerDomaines(env, id),
			supprimerStyle(env, id),
			...clesParLogin(session).map((cle) => env.OAUTH_KV.delete(cle)),
		]),
	);
	const optionnelles = [
		["grants", () => revoquerGrants(env, id)],
		["durable objects", () => detruireObjets(env, id)],
		[
			"github",
			() => revoquerAutorisation({ clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET, token: session.token }),
		],
	] as const;
	for (const [etape, fn] of optionnelles) {
		const err = await tenter(fn);
		if (err) journal(etape, err);
	}
	const echecSessions = echecKv ? null : await tenter(() => fermerSessions(env, id));
	for (const err of [echecKv, echecSessions]) if (err) journal("kv", err);
	if (echecKv || echecSessions) throw new Error("Suppression incomplete");
}
