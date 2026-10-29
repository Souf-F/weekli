import { describe, expect, it, vi } from "vitest";
import { chiffrer } from "../../lib/chiffrement";
import { CONSERVATION_SECONDES } from "../../lib/conservation";
import { effacerDonnees } from "../../lib/donnees";
import { lireStyle } from "../../lib/style";
import { api } from "../api";
import { githubRepond204, sansAutorisations } from "./aide";

vi.mock("../../lib/capture", () => ({
	capturer: vi.fn(),
	ErreurCapture: class extends Error {},
	verifierUrl: vi.fn(),
}));

const SECRET = "a".repeat(64);
const SID = (n: string) => n.repeat(64);

function faux() {
	const donnees = new Map<string, string>();
	const options = new Map<string, { expirationTtl?: number } | undefined>();
	const env = {
		OAUTH_KV: {
			get: async (k: string) => donnees.get(k) ?? null,
			put: async (k: string, v: string, o?: { expirationTtl?: number }) => {
				donnees.set(k, v);
				options.set(k, o);
			},
			delete: async (k: string) => void donnees.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: SECRET,
		LIMITE_API: { limit: async () => ({ success: true }) },
	} as unknown as Env;
	return { env, donnees, options };
}

async function avecSessions(env: Env) {
	for (const [sid, id] of [
		[SID("b"), "1"],
		[SID("c"), "2"],
	]) {
		await env.OAUTH_KV.put(
			`session:${sid}`,
			await chiffrer(SECRET, "session", { id, login: `u${id}`, nom: "N", avatar: "", token: "t" }, `session:${sid}`),
		);
	}
}

const appeler = (env: Env, methode: string, corps?: unknown, sid = SID("b")) =>
	api.request(
		"/style",
		{
			method: methode,
			headers: { Cookie: `weekli=${sid}`, ...(corps !== undefined && { "Content-Type": "application/json" }) },
			body: corps === undefined ? undefined : JSON.stringify(corps),
		},
		env,
	);

describe("/api/style", () => {
	it("GET renvoie un style vide (jamais 404) quand rien n'est enregistre", async () => {
		const { env } = faux();
		await avecSessions(env);
		const res = await appeler(env, "GET");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ exemples: "", profil: "", maj: null });
	});

	it("PUT enregistre chiffre avec 90 jours de conservation, GET le relit", async () => {
		const { env, donnees, options } = faux();
		await avecSessions(env);
		const res = await appeler(env, "PUT", { exemples: "Mon post", profil: "Phrases courtes" });
		expect(res.status).toBe(200);
		const ecrit = (await res.json()) as { exemples: string; profil: string; maj: string };
		expect(ecrit).toMatchObject({ exemples: "Mon post", profil: "Phrases courtes" });
		expect(new Date(ecrit.maj).toISOString()).toBe(ecrit.maj);
		expect(donnees.get("style:1")).not.toContain("Mon post");
		expect(options.get("style:1")).toEqual({ expirationTtl: CONSERVATION_SECONDES });
		expect(await (await appeler(env, "GET")).json()).toEqual(ecrit);
	});

	it("PUT conserve les champs absents, nettoie et tronque", async () => {
		const { env } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { exemples: "Mon post", profil: "Phrases courtes" });
		const res = await appeler(env, "PUT", { profil: `Neuf\u0000${"x".repeat(3000)}`, admin: true });
		const style = (await res.json()) as { exemples: string; profil: string };
		expect(style.exemples).toBe("Mon post");
		expect(style.profil).toHaveLength(2000);
		expect(style.profil).not.toContain("\u0000");
		expect(style).not.toHaveProperty("admin");
	});

	it("PUT peut vider un champ tant que l'autre reste renseigne", async () => {
		const { env } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { exemples: "Mon post", profil: "Phrases courtes" });
		const res = await appeler(env, "PUT", { exemples: "" });
		expect(await res.json()).toMatchObject({ exemples: "", profil: "Phrases courtes" });
	});

	it.each([[{}], [{ exemples: "  ", profil: "" }], [{ exemples: 42 }], [null], [[1]]])(
		"PUT %j renvoie 400 Style vide et n'ecrit rien",
		async (corps) => {
			const { env, donnees } = faux();
			await avecSessions(env);
			const res = await appeler(env, "PUT", corps);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ erreur: "Style vide" });
			expect(donnees.has("style:1")).toBe(false);
		},
	);

	it("PUT refuse de vider les deux champs d'un style existant", async () => {
		const { env } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { profil: "Phrases courtes" });
		expect((await appeler(env, "PUT", { profil: "" })).status).toBe(400);
		expect((await lireStyle(env, "1")).profil).toBe("Phrases courtes");
	});

	it("PUT repond 413 au-dela de 64 Ko", async () => {
		const { env } = faux();
		await avecSessions(env);
		expect((await appeler(env, "PUT", { exemples: "x".repeat(70_000) })).status).toBe(413);
	});

	it("DELETE repond 204, est idempotent", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { profil: "Phrases courtes" });
		expect((await appeler(env, "DELETE")).status).toBe(204);
		expect(donnees.has("style:1")).toBe(false);
		expect((await appeler(env, "DELETE")).status).toBe(204);
	});

	it("isole les comptes : chacun ne voit et ne supprime que son style", async () => {
		const { env } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { profil: "Style d'Alice" });
		await appeler(env, "PUT", { profil: "Style de Bob" }, SID("c"));
		expect((await lireStyle(env, "1")).profil).toBe("Style d'Alice");
		await appeler(env, "DELETE", undefined, SID("c"));
		expect((await lireStyle(env, "1")).profil).toBe("Style d'Alice");
		expect((await lireStyle(env, "2")).profil).toBe("");
	});

	it("refuse sans session, quelle que soit la methode", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		for (const methode of ["GET", "PUT", "DELETE"]) {
			const res = await api.request(
				"/style",
				{
					method: methode,
					headers: { "Content-Type": "application/json" },
					body: methode === "PUT" ? "{}" : undefined,
				},
				env,
			);
			expect(res.status).toBe(401);
		}
		expect(donnees.has("style:1")).toBe(false);
	});

	it("ne relit pas un style recopie sous la cle d'un autre compte (AAD)", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { profil: "Style d'Alice" });
		donnees.set("style:2", donnees.get("style:1")!);
		expect((await lireStyle(env, "2")).profil).toBe("");
	});
});

describe("effacerDonnees", () => {
	it("supprime le style du compte sans toucher aux autres", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		await appeler(env, "PUT", { profil: "Style d'Alice" });
		await appeler(env, "PUT", { profil: "Style de Bob" }, SID("c"));
		githubRepond204();
		await effacerDonnees({ ...env, OAUTH_PROVIDER: sansAutorisations } as never, { id: "1", login: "u1", nom: "N", avatar: "", token: "t" });
		expect(donnees.has("style:1")).toBe(false);
		expect(donnees.has("style:2")).toBe(true);
	});
});
