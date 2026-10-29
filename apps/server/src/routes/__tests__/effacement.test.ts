import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ecrireBrouillons } from "../../lib/brouillons";
import { creerPkce } from "../../lib/github-oauth";
import { ajouterNomMcp } from "../../lib/mcp-index";
import { creerPub } from "../../lib/pubs";
import { ecrireStyle } from "../../lib/style";
import { ajouterDomaine } from "../../lib/domaines";
import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { creerSession, sessionsIndexees } from "../../lib/session";
import { api } from "../api";
import { avecSessions, faux, SID } from "./aide";

vi.mock("../../lib/capture", () => ({ capturer: vi.fn(), ErreurCapture: class extends Error {}, verifierUrl: vi.fn() }));

// Durable Objects simules : getAgentByName renvoie un objet dont detruire() est enregistre
const detruits: string[] = [];
let detruireLeve = false;
vi.mock("agents", () => ({
	getAgentByName: async (_ns: unknown, nom: string) => ({
		detruire: async () => {
			detruits.push(nom);
			if (detruireLeve) throw new Error("Durable Object reset because its code was updated");
		},
	}),
}));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	detruits.length = 0;
	detruireLeve = false;
});

const COOKIE_B = `weekli=${SID("b")}`;
const effacer = (env: Env, cookie: string | null = COOKIE_B) =>
	api.request("/moi/donnees", { method: "DELETE", headers: cookie ? { Cookie: cookie } : {} }, env);

type Appel = { url: string; methode: string; auth: string | null; corps: string };
// GitHub simule : enregistre les appels et repond avec `statut`
function simulerGithub(statut: number | "reseau" = 204) {
	const appels: Appel[] = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (entree: string | URL | Request, init?: RequestInit) => {
			const req = new Request(entree, init);
			appels.push({ url: req.url, methode: req.method, auth: req.headers.get("authorization"), corps: await req.text() });
			if (statut === "reseau") throw new TypeError("fetch failed");
			return new Response(null, { status: statut });
		}),
	);
	return appels;
}

// Fournisseur OAuth espion : grants listes sur deux pages
function fournisseur(grants: string[][]) {
	const revoques: [string, string][] = [];
	return {
		revoques,
		OAUTH_PROVIDER: {
			listUserGrants: vi.fn(async (_id: string, o?: { cursor?: string }) => {
				const page = Number(o?.cursor ?? 0);
				return { items: grants[page].map((id) => ({ id })), cursor: page + 1 < grants.length ? String(page + 1) : undefined };
			}),
			revokeGrant: vi.fn(async (g: string, u: string) => void revoques.push([g, u])),
		},
	};
}

async function peupler(env: Env) {
	await avecSessions(env);
	for (const id of ["1", "2"]) {
		await ecrireBrouillons(env, id, [{ id: "b", titre: "t", format: "f", source: "s", texte: "x", cree: new Date().toISOString(), publie: false }]);
		await ajouterDomaine(env, id, "monsite.dev");
		await ecrireStyle(env, id, { profil: "court" });
		await creerPub(env, id, { version: 1, titre: "P", projet: { nom: "N" }, scenes: [] } as never);
		await ajouterNomMcp(env, id, `streamable-http:do-${id}`);
	}
}

describe("DELETE /api/moi/donnees : effacement complet", () => {
	it("appelle chaque etape : KV, grants, Durable Objects, GitHub, sessions, cookie", async () => {
		const { env, donnees } = faux(fournisseur([["g1"], ["g2"]]));
		await peupler(env);
		await ajouterNomMcp(env, "1", "streamable-http:do-1bis");
		const github = simulerGithub(204);
		// Deux sessions du compte (deux navigateurs) ouvertes par le vrai chemin, donc indexees
		const ouvrir = new Hono<AppEnv>();
		ouvrir.get("/", async (c) => (await creerSession(c, { id: "1", login: "alice", nom: "alice", avatar: "", token: "gho_alice" }), c.body(null, 204)));
		const cookies = [];
		for (let i = 0; i < 2; i++) cookies.push(/weekli=([0-9a-f]{64})/.exec((await ouvrir.request("/", {}, env)).headers.get("Set-Cookie") ?? "")![1]);
		expect((await sessionsIndexees(env, "1")).sort()).toEqual([...cookies].sort());

		const res = await effacer(env, `weekli=${cookies[0]}`);
		expect(res.status).toBe(204);

		// 1. KV
		for (const cle of ["brouillons:1", "pubs:1", "style:1", "domaines:1"]) expect(donnees.has(cle)).toBe(false);
		// 2. grants, toutes les pages
		expect((env as never as { OAUTH_PROVIDER: { revokeGrant: unknown } }).OAUTH_PROVIDER.revokeGrant).toHaveBeenCalledTimes(2);
		// 3. Durable Objects puis index
		expect(detruits.sort()).toEqual(["streamable-http:do-1", "streamable-http:do-1bis"]);
		expect(donnees.has("mcp:1")).toBe(false);
		// 4. autorisation GitHub avec le token de la session
		expect(github).toHaveLength(1);
		expect(github[0]).toMatchObject({ methode: "DELETE", corps: JSON.stringify({ access_token: "gho_alice" }) });
		expect(github[0].url).toBe("https://api.github.com/applications/client-id/grant");
		expect(github[0].auth).toBe(`Basic ${btoa("client-id:client-secret")}`);
		// 5. sessions, index, cookie
		for (const sid of cookies) expect(donnees.has(`session:${sid}`)).toBe(false);
		expect(donnees.has("sessions:1")).toBe(false);
		expect(res.headers.get("Set-Cookie")).toMatch(/weekli=;.*(Max-Age=0|Expires=)/);
	});

	it("revoque les grants du compte seulement (userId = id de la session)", async () => {
		const f = fournisseur([["g1", "g2"]]);
		const { env } = faux(f);
		await peupler(env);
		simulerGithub();
		await effacer(env);
		expect(f.revoques).toEqual([["g1", "1"], ["g2", "1"]]);
	});

	it("ne touche jamais aux donnees ni aux sessions d'un autre compte", async () => {
		const { env, donnees } = faux(fournisseur([[]]));
		await peupler(env);
		simulerGithub();
		await effacer(env);
		for (const cle of ["brouillons:2", "pubs:2", "style:2", "domaines:2", "mcp:2", `session:${SID("c")}`]) expect(donnees.has(cle)).toBe(true);
		expect(detruits.every((n) => n.endsWith("do-1"))).toBe(true);
	});

	it.each([[500], [401], ["reseau" as const]])("repond 204 meme si GitHub echoue (%s)", async (statut) => {
		const { env, donnees } = faux(fournisseur([[]]));
		await peupler(env);
		simulerGithub(statut);
		const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
		const res = await effacer(env);
		expect(res.status).toBe(204);
		expect(donnees.has("brouillons:1")).toBe(false);
		expect(donnees.has(`session:${SID("b")}`)).toBe(false);
		expect(JSON.stringify(erreurs.mock.calls)).not.toContain("gho_alice");
	});

	it("repond 204 si les grants echouent ou si destroy() leve (isolat interrompu)", async () => {
		const f = fournisseur([[]]);
		f.OAUTH_PROVIDER.listUserGrants.mockRejectedValue(new Error("KV grants"));
		const { env, donnees } = faux(f);
		await peupler(env);
		simulerGithub();
		detruireLeve = true;
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect((await effacer(env)).status).toBe(204);
		expect(detruits).toEqual(["streamable-http:do-1"]);
		expect(donnees.has("mcp:1")).toBe(false);
		expect(donnees.has("style:1")).toBe(false);
	});

	it("tente quand meme GitHub et les Durable Objects quand les grants echouent", async () => {
		const f = fournisseur([[]]);
		f.OAUTH_PROVIDER.revokeGrant.mockRejectedValue(new Error("x"));
		f.OAUTH_PROVIDER.listUserGrants.mockResolvedValue({ items: [{ id: "g" }] } as never);
		const { env } = faux(f);
		await peupler(env);
		const github = simulerGithub();
		vi.spyOn(console, "error").mockImplementation(() => {});
		await effacer(env);
		expect(github).toHaveLength(1);
		expect(detruits).toHaveLength(1);
	});

	it("repond 500 si KV echoue, sans rien divulguer, et conserve la session pour relancer", async () => {
		const { env, donnees, pannes } = faux(fournisseur([[]]));
		await peupler(env);
		simulerGithub();
		vi.spyOn(console, "error").mockImplementation(() => {});
		pannes.add("delete");
		const res = await effacer(env);
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ erreur: "Suppression incomplete, reessaie" });
		expect(res.headers.get("Set-Cookie")).toBeNull();
		expect(donnees.has(`session:${SID("b")}`)).toBe(true);
		// KV revenu : l'appel est idempotent et termine le travail
		pannes.clear();
		expect((await effacer(env)).status).toBe(204);
		expect(donnees.has("brouillons:1")).toBe(false);
	});

	it("refuse sans session (401) et ne supprime rien", async () => {
		const f = fournisseur([[]]);
		const { env, donnees } = faux(f);
		await peupler(env);
		const github = simulerGithub();
		const avant = donnees.size;
		expect((await effacer(env, null)).status).toBe(401);
		expect(donnees.size).toBe(avant);
		expect(f.OAUTH_PROVIDER.revokeGrant).not.toHaveBeenCalled();
		expect(github).toHaveLength(0);
		expect(detruits).toHaveLength(0);
	});
});

describe("un token MCP emis avant l'effacement", () => {
	it("passe avant, renvoie 401 apres (vrai OAuthProvider, grants revoques)", async () => {
		const { env } = faux();
		await avecSessions(env);
		const apiHandler = { fetch: async () => new Response("ok") };
		const fournisseurOAuth = new OAuthProvider({
			apiRoute: "/mcp",
			apiHandler,
			authorizeEndpoint: "/authorize",
			tokenEndpoint: "/token",
			clientRegistrationEndpoint: "/register",
			defaultHandler: { fetch: async () => new Response("defaut") },
			resourceMetadata: { resource: "https://weekli.test/mcp", authorization_servers: ["https://weekli.test"] },
		});
		const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
		const appeler = (req: Request) => fournisseurOAuth.fetch(req, env as never, ctx);

		await appeler(new Request("https://weekli.test/accueil")); // le gestionnaire par defaut recoit OAUTH_PROVIDER dans env
		const aides = (env as never as { OAUTH_PROVIDER: any }).OAUTH_PROVIDER;
		const client = await aides.createClient({ redirectUris: ["https://claude.test/cb"], tokenEndpointAuthMethod: "none" });
		const pkce = await creerPkce();
		const { redirectTo } = await aides.completeAuthorization({
			request: { responseType: "code", clientId: client.clientId, redirectUri: "https://claude.test/cb", scope: [], state: "s", codeChallenge: pkce.defi, codeChallengeMethod: "S256" },
			userId: "1",
			metadata: {},
			scope: [],
			props: { id: "1" },
		});
		const code = new URL(redirectTo).searchParams.get("code")!;
		const echange = await appeler(
			new Request("https://weekli.test/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: "https://claude.test/cb", client_id: client.clientId, code_verifier: pkce.verifieur }),
			}),
		);
		const { access_token } = (await echange.json()) as { access_token: string };
		const mcp = () => appeler(new Request("https://weekli.test/mcp", { headers: { Authorization: `Bearer ${access_token}` } }));
		expect((await mcp()).status).toBe(200);

		simulerGithub();
		expect((await effacer(env)).status).toBe(204);
		expect((await mcp()).status).toBe(401);
	});
});
