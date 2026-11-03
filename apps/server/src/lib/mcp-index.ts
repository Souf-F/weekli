import { ecrireListe, lireListe } from "./listes";

// Index `mcp:<id>` : noms des Durable Objects WeekliMCP d'un compte (ADR-02, ADR-03), pour pouvoir les detruire
// a l'effacement. Pas de TTL : un DO vivant plus de 90 jours est possible (24 h d'inactivite max), et chaque DO
// retire son nom en expirant. Plafonne : les plus anciens sortent de l'index et expirent seuls apres 24 h.
const USAGE = "mcp-index";
const MAX_DO = 50;
export const cleIndexMcp = (id: string) => `mcp:${id}`;

export const lireNomsMcp = (env: Env, id: string) => lireListe<string>(env, USAGE, cleIndexMcp(id));

export async function ajouterNomMcp(env: Env, id: string, nom: string) {
	const noms = (await lireNomsMcp(env, id)).filter((n) => n !== nom);
	await ecrireListe(env, USAGE, cleIndexMcp(id), [...noms, nom].slice(-MAX_DO));
}

export async function retirerNomMcp(env: Env, id: string, nom: string) {
	const noms = await lireNomsMcp(env, id);
	if (noms.includes(nom)) {
		await ecrireListe(
			env,
			USAGE,
			cleIndexMcp(id),
			noms.filter((n) => n !== nom),
		);
	}
}

export const supprimerIndexMcp = (env: Env, id: string) => env.OAUTH_KV.delete(cleIndexMcp(id));
