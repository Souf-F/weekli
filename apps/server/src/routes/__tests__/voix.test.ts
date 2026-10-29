import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import { avecSessions, faux, SID } from "./aide";

vi.mock("../../lib/capture", () => ({
	capturer: vi.fn(),
	ErreurCapture: class extends Error {},
	verifierUrl: vi.fn(),
}));

const MP3 = new Uint8Array([0xff, 0xf3, 0x64, 1, 2, 3, 4, 5]);

// Trame binaire du service : 2 octets de longueur d'en-tete, l'en-tete, puis les donnees
function trameAudio(donnees: Uint8Array, chemin = "audio") {
	const entete = new TextEncoder().encode(`X-RequestId:x\r\nContent-Type:audio/mpeg\r\nPath:${chemin}\r\n`);
	const trame = new Uint8Array(2 + entete.length + donnees.length);
	new DataView(trame.buffer).setUint16(0, entete.length);
	trame.set(entete, 2);
	trame.set(donnees, 2 + entete.length);
	return trame.buffer;
}

type Scenario = "succes" | "sans-audio" | "ferme" | "refuse";
const messages: string[] = [];
let connexions = 0;
let urls: string[] = [];

// WebSocket simule : repond a la requete SSML comme le service de lecture d'Edge
function simuler(scenario: Scenario) {
	connexions = 0;
	messages.length = 0;
	urls = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string) => {
			urls.push(url);
			connexions++;
			if (scenario === "refuse") return { status: 403, webSocket: null };
			const ecouteurs: Record<string, ((e: { data?: unknown }) => void)[]> = {};
			const emettre = (type: string, data?: unknown) => {
				for (const f of ecouteurs[type] ?? []) f({ data });
			};
			const ws = {
				accept: () => {},
				close: () => {},
				addEventListener: (type: string, f: (e: { data?: unknown }) => void) => (ecouteurs[type] ??= []).push(f),
				send: (message: string) => {
					messages.push(message);
					if (!message.includes("Path:ssml")) return;
					setTimeout(() => {
						emettre("message", "X-RequestId:x\r\nPath:turn.start\r\n\r\n{}");
						if (scenario === "ferme") return emettre("close");
						if (scenario === "succes") {
							emettre("message", trameAudio(MP3.subarray(0, 4)));
							emettre("message", trameAudio(new Uint8Array(), "audio.metadata"));
							emettre("message", trameAudio(MP3.subarray(4)));
						}
						emettre("message", "X-RequestId:x\r\nPath:turn.end\r\n\r\n");
					}, 0);
				},
			};
			return { status: 101, webSocket: ws };
		}),
	);
}

function monter() {
	const { env, donnees, options } = faux();
	const cache = new Map<string, Uint8Array>();
	const kv = env.OAUTH_KV as unknown as Record<string, unknown>;
	const get = kv.get as (k: string, o?: unknown) => Promise<unknown>;
	const put = kv.put as (k: string, v: string, o?: { expirationTtl?: number }) => Promise<void>;
	kv.get = async (k: string, o?: unknown) => (o === "arrayBuffer" ? (cache.get(k)?.slice().buffer ?? null) : get(k, o));
	kv.put = async (k: string, v: string | Uint8Array, o?: { expirationTtl?: number }) => {
		if (typeof v === "string") return put(k, v, o);
		cache.set(k, new Uint8Array(v));
		options.set(k, o);
	};
	return { env, donnees, options, cache, ajouterSessions: () => avecSessions(env) };
}

const appeler = (env: Env, corps: unknown, sid: string | null = SID("b")) =>
	api.request(
		"/voix",
		{
			method: "POST",
			headers: { "Content-Type": "application/json", ...(sid && { Cookie: `weekli=${sid}` }) },
			body: JSON.stringify(corps),
		},
		env,
	);

const phrase = (n: number | string) => ({ texte: `Phrase numero ${n}`, scene: "accroche" });

describe("POST /api/voix", () => {
	let monte: ReturnType<typeof monter>;
	beforeEach(async () => {
		monte = monter();
		await monte.ajouterSessions();
		simuler("succes");
		vi.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => vi.restoreAllMocks());

	it("renvoie le MP3 assemble, avec la bonne voix et seulement la phrase", async () => {
		const r = await appeler(monte.env, { texte: "Salut <tout> & tous", scene: "accroche" });
		expect(r.status).toBe(200);
		expect(r.headers.get("Content-Type")).toBe("audio/mpeg");
		expect(new Uint8Array(await r.arrayBuffer())).toEqual(MP3);

		const ssml = messages.find((m) => m.includes("Path:ssml")) ?? "";
		expect(ssml).toContain("fr-FR-VivienneMultilingualNeural");
		expect(ssml).toContain(">Salut &lt;tout&gt; &amp; tous</prosody>");
		const envoye = messages.join("");
		for (const prive of ["accroche", "alice", "gho_", "weekli="]) expect(envoye).not.toContain(prive);
		expect(urls[0]).toMatch(/^https:\/\/speech\.platform\.bing\.com\/.*Sec-MS-GEC=[0-9A-F]{16}-[0-9A-F]{64}&/);
	});

	it("sert la deuxieme demande depuis le cache KV (30 jours), meme pour un autre compte", async () => {
		const corps = phrase("cache");
		await appeler(monte.env, corps);
		const cle = [...monte.cache.keys()][0];
		expect(cle).toMatch(/^voix:[0-9a-f]{64}$/);
		expect(monte.options.get(cle)?.expirationTtl).toBe(60 * 60 * 24 * 30);

		const r = await appeler(monte.env, corps, SID("c"));
		expect(r.status).toBe(200);
		expect(new Uint8Array(await r.arrayBuffer())).toEqual(MP3);
		expect(connexions).toBe(1);
	});

	it("renvoie 502 sans detail interne quand Microsoft echoue, et ne met rien en cache", async () => {
		for (const scenario of ["refuse", "ferme", "sans-audio"] as const) {
			simuler(scenario);
			const r = await appeler(monte.env, phrase(scenario));
			expect(r.status).toBe(502);
			expect(await r.json()).toEqual({ erreur: "Voix indisponible" });
		}
		expect(monte.cache.size).toBe(0);
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Phrase numero");
	});

	it("limite chaque compte a 60 phrases par heure, cache compris, sans bloquer les autres comptes", async () => {
		for (let i = 0; i < 59; i++) expect((await appeler(monte.env, phrase(i))).status).toBe(200);
		expect((await appeler(monte.env, phrase(3))).status).toBe(200);
		expect(connexions).toBe(59);

		expect((await appeler(monte.env, phrase("de-trop"))).status).toBe(429);
		expect((await appeler(monte.env, phrase(3))).status).toBe(429);
		expect((await appeler(monte.env, phrase(3), SID("c"))).status).toBe(200);
	});

	it("rejette les corps invalides et les appels sans session", async () => {
		const mauvais: unknown[] = [
			null,
			[],
			{ scene: "accroche" },
			{ texte: "   ", scene: "accroche" },
			{ texte: "a".repeat(401), scene: "accroche" },
			{ texte: 12, scene: "accroche" },
			{ texte: "ok" },
			{ texte: "ok", scene: "../x" },
			{ texte: "ok", scene: "accroche", voix: "autre" },
		];
		for (const corps of mauvais) expect((await appeler(monte.env, corps)).status).toBe(400);
		expect((await appeler(monte.env, { texte: "a".repeat(400), scene: "accroche" })).status).toBe(200);
		expect((await appeler(monte.env, phrase(1), null)).status).toBe(401);
		expect(connexions).toBe(1);
	});
});
