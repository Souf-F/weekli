import { describe, expect, it } from "vitest";
import { ajouterNomMcp, cleIndexMcp, lireNomsMcp, retirerNomMcp, supprimerIndexMcp } from "../mcp-index";

function faux() {
	const donnees = new Map<string, string>();
	const env = {
		OAUTH_KV: {
			get: async (k: string) => donnees.get(k) ?? null,
			put: async (k: string, v: string) => void donnees.set(k, v),
			delete: async (k: string) => void donnees.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: "a".repeat(64),
	} as unknown as Env;
	return { env, donnees };
}

describe("index mcp:<id>", () => {
	it("est vide par defaut, chiffre, et sans doublon", async () => {
		const { env, donnees } = faux();
		expect(await lireNomsMcp(env, "1")).toEqual([]);
		await ajouterNomMcp(env, "1", "streamable-http:aaa");
		await ajouterNomMcp(env, "1", "streamable-http:aaa");
		await ajouterNomMcp(env, "1", "streamable-http:bbb");
		expect(await lireNomsMcp(env, "1")).toEqual(["streamable-http:aaa", "streamable-http:bbb"]);
		expect(donnees.get(cleIndexMcp("1"))).not.toContain("aaa");
	});

	it("retire un nom, supprime la cle quand il n'en reste plus, et reste propre a chaque compte", async () => {
		const { env, donnees } = faux();
		await ajouterNomMcp(env, "1", "a");
		await ajouterNomMcp(env, "2", "b");
		await retirerNomMcp(env, "1", "inconnu");
		await retirerNomMcp(env, "1", "a");
		expect(donnees.has("mcp:1")).toBe(false);
		expect(await lireNomsMcp(env, "2")).toEqual(["b"]);
		await supprimerIndexMcp(env, "2");
		expect(donnees.has("mcp:2")).toBe(false);
	});

	it("est plafonne a 50 noms, les plus recents restent", async () => {
		const { env } = faux();
		for (let i = 0; i < 55; i++) await ajouterNomMcp(env, "1", `n${i}`);
		const noms = await lireNomsMcp(env, "1");
		expect(noms).toHaveLength(50);
		expect(noms.at(-1)).toBe("n54");
		expect(noms[0]).toBe("n5");
	});
});
