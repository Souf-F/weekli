import { cleBrouillons } from "./brouillons";
import { chiffrer, dechiffrer, dechiffrerAncien } from "./chiffrement";
import { CONSERVATION_SECONDES } from "./conservation";
import { cleDomaines } from "./domaines";

// Migration ADR-01 : les donnees rattachees au login GitHub (renommable, reattribuable) passent sous l'id
// numerique. A chaque connexion (site et MCP), pour chaque famille de cles : si `<prefixe>:<login>` existe et
// `<prefixe>:<id>` non, le contenu est dechiffre, rechiffre pour la nouvelle cle (AAD) puis l'ancienne cle est supprimee.
// A RETIRER avant le deploiement public (B14) : en production, un login ne doit jamais ouvrir de donnees.

export type Identite = { id: string; login: string };

const FAMILLES = [
	{ usage: "brouillons", cle: cleBrouillons },
	{ usage: "domaines", cle: cleDomaines },
];

// Cles par login encore possibles pour ce compte, pour l'effacement
export const clesParLogin = ({ login }: Identite) => FAMILLES.map((f) => f.cle(login.toLowerCase()));

async function migrerFamille(env: Env, { id, login }: Identite, { usage, cle }: (typeof FAMILLES)[number]) {
	const ancienne = cle(login.toLowerCase());
	const nouvelle = cle(id);
	const brut = await env.OAUTH_KV.get(ancienne);
	if (!brut || (await env.OAUTH_KV.get(nouvelle))) return;

	const secret = env.COOKIE_ENCRYPTION_KEY;
	const valeur = (await dechiffrer(secret, usage, brut, ancienne)) ?? (await dechiffrerAncien(secret, usage, brut));
	if (valeur === null) return;
	await env.OAUTH_KV.put(nouvelle, await chiffrer(secret, usage, valeur, nouvelle), {
		expirationTtl: CONSERVATION_SECONDES,
	});
	await env.OAUTH_KV.delete(ancienne);
}

// Une migration en echec ne bloque pas la connexion : les donnees restent sous l'ancienne cle, reprise a la suivante
export async function migrerIdentite(env: Env, identite: Identite) {
	for (const famille of FAMILLES) {
		try {
			await migrerFamille(env, identite, famille);
		} catch (err) {
			console.error(`Migration ${famille.usage} :`, err);
		}
	}
}
