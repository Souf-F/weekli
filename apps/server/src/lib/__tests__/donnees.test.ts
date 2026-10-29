import { describe, expect, it, vi } from "vitest";
import { api } from "../../routes/api";
import { ecrireBrouillons, lireBrouillons } from "../brouillons";
import { chiffrer } from "../chiffrement";
import { CONSERVATION_SECONDES, GRANT_MCP_SECONDES } from "../conservation";
import { ajouterDomaine, lireDomaines } from "../domaines";

// capture.ts depend du runtime Workers (agents/browser), absent sous Node : inutile pour ces tests
vi.mock("../capture", () => ({ capturer: vi.fn(), ErreurCapture: class extends Error {}, verifierUrl: vi.fn() }));

const SECRET = "a".repeat(64);
const ID_SESSION = "b".repeat(64);

// KV minimal en memoire qui garde les options d'ecriture
function faux() {
	const donnees = new Map<string, string>();
	const options = new Map<string, { expirationTtl?: number } | undefined>();
	const kv = {
		get: async (k: string) => donnees.get(k) ?? null,
		put: async (k: string, v: string, o?: { expirationTtl?: number }) => {
			donnees.set(k, v);
			options.set(k, o);
		},
		delete: async (k: string) => void donnees.delete(k),
	};
	const env = {
		OAUTH_KV: kv,
		COOKIE_ENCRYPTION_KEY: SECRET,
		LIMITE_API: { limit: async () => ({ success: true }) },
	} as unknown as Env;
	return { env, donnees, options };
}

const brouillon = { id: "1", texte: "x", publie: false } as never;

describe("conservation 90 jours", () => {
	it("vaut 90 jours en secondes", () => expect(CONSERVATION_SECONDES).toBe(7_776_000));
	it("fixe l'autorisation MCP a 30 jours", () => expect(GRANT_MCP_SECONDES).toBe(2_592_000));

	it("est appliquee a chaque ecriture de brouillons et de domaines", async () => {
		const { env, options } = faux();
		await ecrireBrouillons(env, "42", [brouillon]);
		await ajouterDomaine(env, "42", "monsite.dev");
		expect(options.get("brouillons:42")).toEqual({ expirationTtl: CONSERVATION_SECONDES });
		expect(options.get("domaines:42")).toEqual({ expirationTtl: CONSERVATION_SECONDES });
	});
});

describe("DELETE /moi/donnees", () => {
	async function preparer() {
		const kv = faux();
		await kv.env.OAUTH_KV.put(
			`session:${ID_SESSION}`,
			await chiffrer(SECRET, "session", { id: "1", login: "Souf", nom: "S", avatar: "", token: "t" }, `session:${ID_SESSION}`),
		);
		for (const login of ["1", "2"]) {
			await ecrireBrouillons(kv.env, login, [brouillon]);
			await ajouterDomaine(kv.env, login, "monsite.dev");
		}
		return kv;
	}
	const requete = (env: Env, cookie?: string) =>
		api.request("/moi/donnees", { method: "DELETE", headers: cookie ? { Cookie: cookie } : {} }, env);

	it("supprime tout du compte, detruit la session, efface le cookie et repond 204", async () => {
		const { env, donnees } = await preparer();
		const res = await requete(env, `weekli=${ID_SESSION}`);
		expect(res.status).toBe(204);
		expect(await lireBrouillons(env, "1")).toEqual([]);
		expect(await lireDomaines(env, "1")).toEqual([]);
		expect(donnees.has(`session:${ID_SESSION}`)).toBe(false);
		expect(res.headers.get("Set-Cookie")).toMatch(/weekli=;.*(Max-Age=0|Expires=)/);
	});

	it("ne touche jamais aux donnees d'un autre utilisateur", async () => {
		const { env } = await preparer();
		await requete(env, `weekli=${ID_SESSION}`);
		expect(await lireBrouillons(env, "2")).toHaveLength(1);
		expect(await lireDomaines(env, "2")).toHaveLength(1);
	});

	it("refuse sans session valide et ne supprime rien", async () => {
		const { env, donnees } = await preparer();
		const avant = donnees.size;
		expect((await requete(env)).status).toBe(401);
		expect((await requete(env, `weekli=${"c".repeat(64)}`)).status).toBe(401);
		expect(donnees.size).toBe(avant);
	});
});
