import { describe, expect, it } from "vitest";
import { refuserSessionMcp } from "../acces-mcp";
import { ajouterNomMcp } from "../mcp-index";

function faux() {
	const kv = new Map<string, string>();
	return {
		OAUTH_KV: {
			get: async (k: string) => kv.get(k) ?? null,
			put: async (k: string, v: string) => void kv.set(k, v),
			delete: async (k: string) => void kv.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: "a".repeat(64),
	} as unknown as Env;
}

const requete = (session?: string) =>
	new Request("https://weekli.test/mcp", { method: "POST", headers: session ? { "mcp-session-id": session } : {} });

describe("controle du mcp-session-id", () => {
	it("laisse passer une session listee dans mcp:<id> du meme compte", async () => {
		const env = faux();
		await ajouterNomMcp(env, "1", "streamable-http:sess-a");
		expect(await refuserSessionMcp(env, "1", requete("sess-a"))).toBeNull();
	});

	it("refuse l'identifiant de session d'un autre utilisateur, sans rien lui reveler", async () => {
		const env = faux();
		await ajouterNomMcp(env, "1", "streamable-http:sess-a");
		await ajouterNomMcp(env, "2", "streamable-http:sess-b");
		const refus = await refuserSessionMcp(env, "2", requete("sess-a"));
		expect(refus?.status).toBe(404);
		expect(await refus?.text()).not.toContain("sess-a");
	});

	it("refuse une session inconnue ou un compte sans index", async () => {
		const env = faux();
		expect((await refuserSessionMcp(env, "1", requete("inconnue")))?.status).toBe(404);
		await ajouterNomMcp(env, "1", "streamable-http:sess-a");
		expect((await refuserSessionMcp(env, "1", requete("sess-a2")))?.status).toBe(404);
	});

	it("laisse passer l'initialisation, qui n'a pas d'en-tete", async () => {
		expect(await refuserSessionMcp(faux(), "1", requete())).toBeNull();
	});
});
