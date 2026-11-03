import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import { avecSessions, faux, SID } from "./aide";

vi.mock("../../lib/capture", () => ({ capturer: vi.fn(), ErreurCapture: class extends Error {}, verifierUrl: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

const depot = (name: string, extra: object = {}) => ({
	name,
	fork: false,
	private: false,
	description: `Description ${name}`,
	homepage: null,
	html_url: `https://github.com/alice/${name}`,
	pushed_at: "2026-10-20T18:02:11Z",
	owner: { login: "alice" },
	...extra,
});

const GET = (env: Env, sid?: string) =>
	api.request("/repos", { headers: sid ? { Cookie: `weekli=${sid}` } : {} }, env);

describe("GET /api/repos", () => {
	it("renvoie les RepoResume, sans fork, avec le token de la session", async () => {
		const { env } = faux();
		await avecSessions(env);
		const fetchMock = vi.fn(async () =>
			Response.json([depot("ancien", { pushed_at: "2026-01-01T00:00:00Z" }), depot("copie", { fork: true }), depot("recent")]),
		);
		vi.stubGlobal("fetch", fetchMock);
		const res = await GET(env, SID("b"));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([
			{ repo: "recent", description: "Description recent", site: "", url: "https://github.com/alice/recent", maj: "2026-10-20T18:02:11Z" },
			{ repo: "ancien", description: "Description ancien", site: "", url: "https://github.com/alice/ancien", maj: "2026-01-01T00:00:00Z" },
		]);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [Request | string, RequestInit | undefined];
		const requete = url instanceof Request ? url : new Request(url, init);
		expect(new URL(requete.url).searchParams.get("visibility")).toBe("public");
		expect(requete.headers.get("authorization")).toContain("gho_alice");
	});

	it("renvoie 502 sans detail interne quand GitHub echoue", async () => {
		const { env } = faux();
		await avecSessions(env);
		vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "secret interne" }, { status: 401 })));
		vi.spyOn(console, "error").mockImplementation(() => {});
		const res = await GET(env, SID("b"));
		expect(res.status).toBe(502);
		expect(await res.json()).toEqual({ erreur: "Erreur lors de la lecture de GitHub" });
	});

	it("refuse sans session (401)", async () => {
		const { env } = faux();
		await avecSessions(env);
		expect((await GET(env)).status).toBe(401);
	});
});
