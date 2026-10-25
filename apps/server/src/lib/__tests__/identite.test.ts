import { describe, expect, it, vi } from "vitest";
import { api } from "../../routes/api";
import { ecrireBrouillons, lireBrouillons } from "../brouillons";
import { chiffrer } from "../chiffrement";
import { effacerDonnees } from "../donnees";
import { ecrireDomaines, jeton, lireDomaines } from "../domaines";
import { migrerIdentite } from "../identite";
import { githubRepond204, sansAutorisations } from "../../routes/__tests__/aide";

vi.mock("../capture", () => ({ capturer: vi.fn(), ErreurCapture: class extends Error {}, verifierUrl: vi.fn() }));

const SECRET = "a".repeat(64);
const brouillon = { id: "1", texte: "secret d'Alice", publie: false } as never;
const domaine = { hote: "alice.dev", verifie: "2026-10-01T00:00:00.000Z" };

function faux() {
	const donnees = new Map<string, string>();
	const env = {
		OAUTH_KV: {
			get: async (k: string) => donnees.get(k) ?? null,
			put: async (k: string, v: string) => void donnees.set(k, v),
			delete: async (k: string) => void donnees.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: SECRET,
		LIMITE_API: { limit: async () => ({ success: true }) },
	} as unknown as Env;
	return { env, donnees };
}

// Donnees telles que l'ancienne version les stockait : cle par login, AAD de l'ancienne cle
async function avecDonneesParLogin(login: string) {
	const kv = faux();
	await kv.env.OAUTH_KV.put(`brouillons:${login}`, await chiffrer(SECRET, "brouillons", [brouillon], `brouillons:${login}`));
	await kv.env.OAUTH_KV.put(`domaines:${login}`, await chiffrer(SECRET, "domaines", [domaine], `domaines:${login}`));
	return kv;
}

describe("migration d'identite (ADR-01)", () => {
	it("migre les brouillons et les domaines vers l'id, garde la date et supprime les cles par login", async () => {
		const { env, donnees } = await avecDonneesParLogin("alice");
		await migrerIdentite(env, { id: "100", login: "Alice" });

		expect(await lireBrouillons(env, "100")).toEqual([brouillon]);
		expect(await lireDomaines(env, "100")).toEqual([domaine]);
		expect([...donnees.keys()].sort()).toEqual(["brouillons:100", "domaines:100"]);
	});

	it("un login renomme garde ses donnees", async () => {
		const { env } = await avecDonneesParLogin("alice");
		await migrerIdentite(env, { id: "100", login: "alice" });
		await migrerIdentite(env, { id: "100", login: "alice-renomme" });

		expect(await lireBrouillons(env, "100")).toEqual([brouillon]);
		expect(await lireDomaines(env, "100")).toEqual([domaine]);
	});

	it("un nouveau compte qui reprend le login n'accede a rien", async () => {
		const { env } = await avecDonneesParLogin("alice");
		await migrerIdentite(env, { id: "100", login: "alice" });
		await migrerIdentite(env, { id: "200", login: "alice" });

		expect(await lireBrouillons(env, "200")).toEqual([]);
		expect(await lireDomaines(env, "200")).toEqual([]);
		expect(await lireBrouillons(env, "100")).toEqual([brouillon]);
	});

	it("ne remplace pas des donnees deja presentes sous l'id", async () => {
		const { env } = await avecDonneesParLogin("alice");
		await ecrireBrouillons(env, "100", []);
		await migrerIdentite(env, { id: "100", login: "alice" });
		expect(await lireBrouillons(env, "100")).toEqual([]);
	});

	it("lit aussi l'ancien format de chiffrement (sans version ni AAD)", async () => {
		const { env } = faux();
		// L'ancien format est fabrique a la main : meme derivation HKDF, aucun AAD
		const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), "HKDF", false, ["deriveKey"]);
		const aes = await crypto.subtle.deriveKey(
			{ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("weekli"), info: new TextEncoder().encode("brouillons") },
			cle,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt"],
		);
		const ivAncien = new Uint8Array(12);
		const chiffre = new Uint8Array(
			await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivAncien }, aes, new TextEncoder().encode(JSON.stringify([brouillon]))),
		);
		const b64 = (o: Uint8Array) => btoa(String.fromCharCode(...o));
		await env.OAUTH_KV.put("brouillons:alice", `${b64(ivAncien)}.${b64(chiffre)}`);

		await migrerIdentite(env, { id: "100", login: "alice" });
		expect(await lireBrouillons(env, "100")).toEqual([brouillon]);
	});

	it("laisse une donnee illisible sous l'ancienne cle sans planter", async () => {
		const { env, donnees } = faux();
		await env.OAUTH_KV.put("brouillons:alice", "corrompu");
		await migrerIdentite(env, { id: "100", login: "alice" });
		expect(donnees.has("brouillons:100")).toBe(false);
	});
});

describe("jeton de domaine lie a l'id", () => {
	it("un compte qui reprend le login obtient un autre jeton", async () => {
		expect(await jeton(SECRET, "100", "alice.dev")).not.toBe(await jeton(SECRET, "200", "alice.dev"));
	});
});

describe("effacement avec les nouvelles cles", () => {
	it("supprime les cles par id et par login, jamais celles d'un autre", async () => {
		const { env, donnees } = await avecDonneesParLogin("alice");
		await ecrireBrouillons(env, "100", [brouillon]);
		await ecrireDomaines(env, "100", [domaine]);
		await ecrireBrouillons(env, "200", [brouillon]);

		githubRepond204();
		await effacerDonnees({ ...env, OAUTH_PROVIDER: sansAutorisations } as never, { id: "100", login: "Alice", nom: "A", avatar: "", token: "t" });
		expect([...donnees.keys()]).toEqual(["brouillons:200"]);
	});
});

describe("routes liees a l'id de session", () => {
	it("GET /moi expose l'id et une session sans id est refusee", async () => {
		const { env } = faux();
		const avec = "d".repeat(64);
		const sans = "e".repeat(64);
		await env.OAUTH_KV.put(`session:${avec}`, await chiffrer(SECRET, "session", { id: "100", login: "a", nom: "A", avatar: "", token: "t" }, `session:${avec}`));
		await env.OAUTH_KV.put(`session:${sans}`, await chiffrer(SECRET, "session", { login: "a", nom: "A", avatar: "", token: "t" }, `session:${sans}`));

		const ok = await api.request("/moi", { headers: { Cookie: `weekli=${avec}` } }, env);
		expect(await ok.json()).toMatchObject({ id: "100", login: "a" });
		expect((await api.request("/moi", { headers: { Cookie: `weekli=${sans}` } }, env)).status).toBe(401);
	});
});
