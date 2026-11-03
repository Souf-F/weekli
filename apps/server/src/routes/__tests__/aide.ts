import { vi } from "vitest";
import { chiffrer } from "../../lib/chiffrement";

export const SECRET = "a".repeat(64);
export const SID = (n: string) => n.repeat(64);

// KV en memoire ; `pannes` liste les operations a faire echouer ("get", "put", "delete")
export function faux(extra: Record<string, unknown> = {}) {
	const donnees = new Map<string, string>();
	const options = new Map<string, { expirationTtl?: number } | undefined>();
	const pannes = new Set<string>();
	const verifier = (op: string) => {
		if (pannes.has(op)) throw new Error("KV indisponible");
	};
	const env = {
		OAUTH_KV: {
			get: async (k: string, o?: { type?: string }) => {
				verifier("get");
				const v = donnees.get(k) ?? null;
				return v !== null && o?.type === "json" ? JSON.parse(v) : v;
			},
			list: async ({ prefix = "" }: { prefix?: string } = {}) => ({
				keys: [...donnees.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
				list_complete: true,
			}),
			put: async (k: string, v: string, o?: { expirationTtl?: number }) => {
				verifier("put");
				donnees.set(k, v);
				options.set(k, o);
			},
			delete: async (k: string) => (verifier("delete"), void donnees.delete(k)),
		},
		COOKIE_ENCRYPTION_KEY: SECRET,
		GITHUB_CLIENT_ID: "client-id",
		GITHUB_CLIENT_SECRET: "client-secret",
		LIMITE_API: { limit: async () => ({ success: true }) },
		...extra,
	} as unknown as Env;
	return { env, donnees, options, pannes };
}

// Sessions de test : cookie `b...` = compte 1 (alice), `c...` = compte 2 (bob)
export async function avecSessions(env: Env) {
	for (const [sid, id, login] of [
		[SID("b"), "1", "alice"],
		[SID("c"), "2", "bob"],
	]) {
		await env.OAUTH_KV.put(
			`session:${sid}`,
			await chiffrer(SECRET, "session", { id, login, nom: login, avatar: "", token: `gho_${login}` }, `session:${sid}`),
		);
	}
}

// Fournisseur OAuth sans aucune autorisation, et GitHub qui repond 204 : pour les tests qui n'etudient pas ces etapes
export const sansAutorisations = { listUserGrants: async () => ({ items: [] }), revokeGrant: async () => {} };
export const githubRepond204 = () => vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
