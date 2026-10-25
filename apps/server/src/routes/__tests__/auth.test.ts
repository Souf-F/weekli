import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chiffrer } from "../../lib/chiffrement";
import { creerSession, sessionsIndexees } from "../../lib/session";
import type { AppEnv, Session } from "../../types";
import { auth } from "../auth";

const SECRET = "a".repeat(64);
const TOKEN = "gho_token_alice";
const alice: Session = { id: "1", login: "alice", nom: "Alice", avatar: "", token: TOKEN };

function faux() {
	const donnees = new Map<string, string>();
	const env = {
		OAUTH_KV: {
			get: async (k: string) => donnees.get(k) ?? null,
			put: async (k: string, v: string) => void donnees.set(k, v),
			delete: async (k: string) => void donnees.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: SECRET,
		GITHUB_CLIENT_ID: "client-id",
		GITHUB_CLIENT_SECRET: "client-secret",
	} as unknown as Env;
	return { env, donnees };
}

// Ouvre une session par le vrai chemin (creerSession) et renvoie son identifiant de cookie
async function ouvrir(env: Env, session: Session) {
	const app = new Hono<AppEnv>();
	app.get("/", async (c) => {
		await creerSession(c, session);
		return c.body(null, 204);
	});
	const res = await app.request("/", {}, env);
	return /weekli=([0-9a-f]{64})/.exec(res.headers.get("Set-Cookie") ?? "")![1];
}

const deconnecter = (env: Env, sid?: string) =>
	auth.request("/logout", { method: "POST", headers: sid ? { Cookie: `weekli=${sid}` } : {} }, env);

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("index sessions:<id>", () => {
	it("est alimente a chaque connexion, par compte, et chiffre", async () => {
		const { env, donnees } = faux();
		const a1 = await ouvrir(env, alice);
		const a2 = await ouvrir(env, alice);
		const b1 = await ouvrir(env, { ...alice, id: "2", login: "bob" });
		expect((await sessionsIndexees(env, "1")).sort()).toEqual([a1, a2].sort());
		expect(await sessionsIndexees(env, "2")).toEqual([b1]);
		expect(donnees.get("sessions:1")).not.toContain(a1);
		expect(donnees.has(`session:${a1}`)).toBe(true);
	});

	it("retire les entrees expirees a l'ecriture", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		const { env } = faux();
		const ancienne = await ouvrir(env, alice);
		vi.setSystemTime(Date.now() + 8 * 3600 * 1000 + 1000);
		const recente = await ouvrir(env, alice);
		expect(await sessionsIndexees(env, "1")).toEqual([recente]);
		expect(ancienne).not.toBe(recente);
	});

	it("est plafonne a 20 sessions : la plus ancienne est fermee", async () => {
		const { env, donnees } = faux();
		const sids: string[] = [];
		for (let i = 0; i < 21; i++) sids.push(await ouvrir(env, alice));
		const indexees = await sessionsIndexees(env, "1");
		expect(indexees).toHaveLength(20);
		expect(indexees).not.toContain(sids[0]);
		expect(donnees.has(`session:${sids[0]}`)).toBe(false);
		expect(donnees.has(`session:${sids[20]}`)).toBe(true);
	});
});

describe("POST /auth/logout", () => {
	it("revoque le token chez GitHub, supprime la session et la desindexe, sans toucher aux autres sessions", async () => {
		const { env, donnees } = faux();
		const sid = await ouvrir(env, alice);
		const autre = await ouvrir(env, alice);
		const fetchSimule = vi.fn(async () => new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchSimule);

		const res = await deconnecter(env, sid);

		expect(res.status).toBe(204);
		expect(fetchSimule).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSimule.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://api.github.com/applications/client-id/token");
		expect(init.method).toBe("DELETE");
		expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa("client-id:client-secret")}`);
		expect(JSON.parse(init.body as string)).toEqual({ access_token: TOKEN });

		expect(donnees.has(`session:${sid}`)).toBe(false);
		expect(donnees.has(`session:${autre}`)).toBe(true);
		expect(await sessionsIndexees(env, "1")).toEqual([autre]);
		expect(res.headers.get("Set-Cookie")).toMatch(/weekli=;.*(Max-Age=0|Expires=)/);
	});

	it.each([
		["GitHub repond 500", async () => new Response("erreur", { status: 500 })],
		["le reseau echoue", async () => Promise.reject(new TypeError("reseau coupe"))],
	])("se deconnecte quand %s, sans journaliser le token", async (_cas, reponse) => {
		const { env, donnees } = faux();
		const sid = await ouvrir(env, alice);
		vi.stubGlobal("fetch", vi.fn(reponse));
		const journal = vi.spyOn(console, "error").mockImplementation(() => {});

		const res = await deconnecter(env, sid);

		expect(res.status).toBe(204);
		expect(donnees.has(`session:${sid}`)).toBe(false);
		expect(await sessionsIndexees(env, "1")).toEqual([]);
		expect(res.headers.get("Set-Cookie")).toMatch(/weekli=;/);
		expect(journal).toHaveBeenCalled();
		expect(JSON.stringify(journal.mock.calls)).not.toContain(TOKEN);
	});

	it("accepte un token deja invalide (404 de GitHub) sans rien journaliser", async () => {
		const { env } = faux();
		const sid = await ouvrir(env, alice);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 404 })),
		);
		const journal = vi.spyOn(console, "error").mockImplementation(() => {});
		expect((await deconnecter(env, sid)).status).toBe(204);
		expect(journal).not.toHaveBeenCalled();
	});

	it("repond 204 sans appeler GitHub quand il n'y a pas de session valide", async () => {
		const { env } = faux();
		const fetchSimule = vi.fn();
		vi.stubGlobal("fetch", fetchSimule);
		expect((await deconnecter(env)).status).toBe(204);
		expect((await deconnecter(env, "c".repeat(64))).status).toBe(204);
		expect(fetchSimule).not.toHaveBeenCalled();
	});

	it("ne revoque pas le token d'une session illisible (chiffree sous une autre cle KV)", async () => {
		const { env, donnees } = faux();
		const sid = "d".repeat(64);
		donnees.set(`session:${sid}`, await chiffrer(SECRET, "session", alice, "session:autre"));
		const fetchSimule = vi.fn();
		vi.stubGlobal("fetch", fetchSimule);
		expect((await deconnecter(env, sid)).status).toBe(204);
		expect(fetchSimule).not.toHaveBeenCalled();
		expect(donnees.has(`session:${sid}`)).toBe(false);
	});
});
