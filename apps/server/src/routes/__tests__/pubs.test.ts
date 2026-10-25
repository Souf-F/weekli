import { describe, expect, it, vi } from "vitest";
import { EXEMPLE } from "../../../../../packages/core/src/pub/exemple.fixture";
import { ecrireBrouillons, lireBrouillons } from "../../lib/brouillons";
import { chiffrer } from "../../lib/chiffrement";
import { CONSERVATION_SECONDES } from "../../lib/conservation";
import { dureeEstimee, lirePubs, MAX_PUBS } from "../../lib/pubs";
import { api } from "../api";
import { avecSessions, faux, SECRET, SID } from "./aide";

vi.mock("../../lib/capture", () => ({ capturer: vi.fn(), ErreurCapture: class extends Error {}, verifierUrl: vi.fn() }));

const script = (titre = "Pub Tablée") => ({ ...(EXEMPLE as object), titre });
const JOUR = 86_400_000;
const ilYa = (jours: number) => new Date(Date.now() - jours * JOUR).toISOString();

const appeler = (env: Env, methode: string, chemin: string, corps?: unknown, sid = SID("b")) =>
	api.request(
		chemin,
		{
			method: methode,
			headers: { Cookie: `weekli=${sid}`, ...(corps !== undefined && { "Content-Type": "application/json" }) },
			body: corps === undefined ? undefined : JSON.stringify(corps),
		},
		env,
	);

async function creer(env: Env, titre?: string, sid = SID("b")) {
	const res = await appeler(env, "POST", "/pubs", { script: script(titre) }, sid);
	expect(res.status).toBe(201);
	return ((await res.json()) as { pub: { id: string } }).pub.id;
}

describe("POST /api/pubs", () => {
	it("cree la pub : 201, pub enregistree, avertissements, stockage chiffre avec 90 jours", async () => {
		const { env, donnees, options } = faux();
		await avecSessions(env);
		const res = await appeler(env, "POST", "/pubs", { script: script() });
		expect(res.status).toBe(201);
		const { pub, avertissements } = (await res.json()) as {
			pub: { id: string; cree: string; maj: string; script: { titre: string } };
			avertissements: string[];
		};
		expect(pub.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(pub.cree).toBe(pub.maj);
		expect(pub.script.titre).toBe("Pub Tablée");
		expect(Array.isArray(avertissements)).toBe(true);
		expect(donnees.get("pubs:1")).not.toContain("Tablée");
		expect(options.get("pubs:1")).toEqual({ expirationTtl: CONSERVATION_SECONDES });
	});

	it("renvoie 400 avec les details de nettoyerScriptPub, sans rien ecrire", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		const res = await appeler(env, "POST", "/pubs", { script: { version: 1, titre: "x" } });
		expect(res.status).toBe(400);
		const corps = (await res.json()) as { erreur: string; details: string[] };
		expect(corps.erreur).toBe("Script invalide");
		expect(corps.details.length).toBeGreaterThan(0);
		expect(donnees.has("pubs:1")).toBe(false);
	});

	it.each([[{}], [null], [{ script: "texte" }], [{ script: null }]])("renvoie 400 pour le corps %j", async (corps) => {
		const { env } = faux();
		await avecSessions(env);
		expect((await appeler(env, "POST", "/pubs", corps)).status).toBe(400);
	});

	it("nettoie le script avant de le stocker (champs inconnus et controles retires)", async () => {
		const { env } = faux();
		await avecSessions(env);
		const sale = { ...script(), titre: "Pub\u0000 Tablée", pirate: "<script>" };
		const res = await appeler(env, "POST", "/pubs", { script: sale });
		const { pub } = (await res.json()) as { pub: { script: Record<string, unknown> } };
		expect(pub.script.titre).toBe("Pub Tablée");
		expect(pub.script).not.toHaveProperty("pirate");
	});

	it("renvoie 409 au-dela de 20 pubs et n'en ecrit pas une 21e", async () => {
		const { env } = faux();
		await avecSessions(env);
		for (let i = 0; i < MAX_PUBS; i++) await creer(env, `Pub ${i}`);
		const res = await appeler(env, "POST", "/pubs", { script: script() });
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ erreur: "20 pubs au maximum, supprime une ancienne pub" });
		expect(await lirePubs(env, "1")).toHaveLength(MAX_PUBS);
		// Un autre compte n'est pas concerne par la limite
		await creer(env, "Pub de Bob", SID("c"));
	});

	it("renvoie 413 au-dela de 64 Ko", async () => {
		const { env } = faux();
		await avecSessions(env);
		expect((await appeler(env, "POST", "/pubs", { script: script(), bourrage: "x".repeat(70_000) })).status).toBe(413);
	});
});

describe("GET /api/pubs", () => {
	it("liste les resumes, du plus recemment modifie au plus ancien", async () => {
		const { env } = faux();
		await avecSessions(env);
		const premiere = await creer(env, "Premiere");
		await creer(env, "Seconde");
		await new Promise((r) => setTimeout(r, 5));
		await appeler(env, "PUT", `/pubs/${premiere}`, { script: script("Premiere revue") });
		const res = await appeler(env, "GET", "/pubs");
		const liste = (await res.json()) as { id: string; titre: string; projet: string; scenes: number }[];
		expect(liste.map((p) => p.titre)).toEqual(["Premiere revue", "Seconde"]);
		expect(liste[0]).toEqual({
			id: premiere,
			titre: "Premiere revue",
			projet: "Tablée",
			cree: expect.any(String),
			maj: expect.any(String),
			scenes: (EXEMPLE as { scenes: unknown[] }).scenes.length,
		});
		expect(liste[0]).not.toHaveProperty("script");
	});

	it("renvoie une liste vide sans pub", async () => {
		const { env } = faux();
		await avecSessions(env);
		expect(await (await appeler(env, "GET", "/pubs")).json()).toEqual([]);
	});
});

describe("GET /api/pubs/:id", () => {
	it("renvoie la pub complete", async () => {
		const { env } = faux();
		await avecSessions(env);
		const id = await creer(env);
		const res = await appeler(env, "GET", `/pubs/${id}`);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ id, script: { version: 1, titre: "Pub Tablée" } });
	});

	it("renvoie 404 pour un id inconnu et 400 pour un id mal forme", async () => {
		const { env } = faux();
		await avecSessions(env);
		expect((await appeler(env, "GET", `/pubs/${crypto.randomUUID()}`)).status).toBe(404);
		const res = await appeler(env, "GET", "/pubs/pas-un-uuid");
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ erreur: "Identifiant invalide" });
	});

	it("ne montre jamais la pub d'un autre compte (404)", async () => {
		const { env } = faux();
		await avecSessions(env);
		const idAlice = await creer(env);
		expect((await appeler(env, "GET", `/pubs/${idAlice}`, undefined, SID("c"))).status).toBe(404);
	});
});

describe("PUT /api/pubs/:id", () => {
	it("remplace le script, garde cree et id, avance maj", async () => {
		const { env } = faux();
		await avecSessions(env);
		const id = await creer(env);
		const avant = (await (await appeler(env, "GET", `/pubs/${id}`)).json()) as { cree: string; maj: string };
		await new Promise((r) => setTimeout(r, 5));
		const res = await appeler(env, "PUT", `/pubs/${id}`, { script: script("Nouveau titre") });
		expect(res.status).toBe(200);
		const { pub, avertissements } = (await res.json()) as {
			pub: { id: string; cree: string; maj: string; script: { titre: string } };
			avertissements: string[];
		};
		expect(pub).toMatchObject({ id, cree: avant.cree, script: { titre: "Nouveau titre" } });
		expect(pub.maj > avant.maj).toBe(true);
		expect(Array.isArray(avertissements)).toBe(true);
		expect(await lirePubs(env, "1")).toHaveLength(1);
	});

	it("renvoie 400 (script ou id invalide), 404 (inconnu ou d'un autre compte), 413", async () => {
		const { env } = faux();
		await avecSessions(env);
		const id = await creer(env);
		const invalide = await appeler(env, "PUT", `/pubs/${id}`, { script: { version: 1 } });
		expect(invalide.status).toBe(400);
		expect(((await invalide.json()) as { details: string[] }).details.length).toBeGreaterThan(0);
		expect((await appeler(env, "PUT", "/pubs/xx", { script: script() })).status).toBe(400);
		expect((await appeler(env, "PUT", `/pubs/${crypto.randomUUID()}`, { script: script() })).status).toBe(404);
		expect((await appeler(env, "PUT", `/pubs/${id}`, { script: script("Vol") }, SID("c"))).status).toBe(404);
		expect(((await (await appeler(env, "GET", `/pubs/${id}`)).json()) as { script: { titre: string } }).script.titre).toBe(
			"Pub Tablée",
		);
		expect((await appeler(env, "PUT", `/pubs/${id}`, { script: script(), bourrage: "x".repeat(70_000) })).status).toBe(413);
	});
});

describe("DELETE /api/pubs/:id", () => {
	it("supprime (204), puis 404 ; une autre pub reste ; l'entree KV disparait avec la derniere", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		const a = await creer(env, "A");
		const b = await creer(env, "B");
		expect((await appeler(env, "DELETE", `/pubs/${a}`)).status).toBe(204);
		expect((await appeler(env, "DELETE", `/pubs/${a}`)).status).toBe(404);
		expect((await lirePubs(env, "1")).map((p) => p.id)).toEqual([b]);
		await appeler(env, "DELETE", `/pubs/${b}`);
		expect(donnees.has("pubs:1")).toBe(false);
	});

	it("renvoie 400 pour un id mal forme et 404 pour la pub d'un autre compte, qui reste intacte", async () => {
		const { env } = faux();
		await avecSessions(env);
		const id = await creer(env);
		expect((await appeler(env, "DELETE", "/pubs/xx")).status).toBe(400);
		expect((await appeler(env, "DELETE", `/pubs/${id}`, undefined, SID("c"))).status).toBe(404);
		expect(await lirePubs(env, "1")).toHaveLength(1);
	});
});

describe("securite /api/pubs", () => {
	it("refuse sans session, quelle que soit la route", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		const id = crypto.randomUUID();
		for (const [methode, chemin] of [
			["GET", "/pubs"],
			["GET", `/pubs/${id}`],
			["POST", "/pubs"],
			["PUT", `/pubs/${id}`],
			["DELETE", `/pubs/${id}`],
		]) {
			const res = await api.request(chemin, { method: methode, headers: { "Content-Type": "application/json" }, body: methode === "POST" || methode === "PUT" ? "{}" : undefined }, env);
			expect(res.status).toBe(401);
		}
		expect(donnees.has("pubs:1")).toBe(false);
	});

	it("ne relit pas des pubs recopiees sous la cle d'un autre compte (AAD)", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		await creer(env);
		donnees.set("pubs:2", donnees.get("pubs:1")!);
		expect(await lirePubs(env, "2")).toEqual([]);
	});
});

describe("purge a la lecture (90 jours)", () => {
	async function ecrirePubs(env: Env, pubs: { id: string; cree: string; maj: string; script: unknown }[]) {
		await env.OAUTH_KV.put("pubs:1", await chiffrer(SECRET, "pubs", pubs, "pubs:1"));
	}

	it("retire les pubs dont maj date de plus de 90 jours, les recentes restent, KV est reecrit", async () => {
		const { env } = faux();
		await avecSessions(env);
		const ancienne = { id: crypto.randomUUID(), cree: ilYa(200), maj: ilYa(91), script: script("Ancienne") };
		const limite = { id: crypto.randomUUID(), cree: ilYa(200), maj: ilYa(89), script: script("Limite") };
		await ecrirePubs(env, [ancienne, limite]);
		const liste = (await (await appeler(env, "GET", "/pubs")).json()) as { id: string }[];
		expect(liste.map((p) => p.id)).toEqual([limite.id]);
		expect((await appeler(env, "GET", `/pubs/${ancienne.id}`)).status).toBe(404);
		expect(await lirePubs(env, "1")).toHaveLength(1);
	});

	it("supprime la cle KV quand toutes les pubs sont perimees", async () => {
		const { env, donnees } = faux();
		await avecSessions(env);
		await ecrirePubs(env, [{ id: crypto.randomUUID(), cree: ilYa(300), maj: ilYa(120), script: script() }]);
		expect(await lirePubs(env, "1")).toEqual([]);
		expect(donnees.has("pubs:1")).toBe(false);
	});

	it("retire les brouillons dont cree date de plus de 90 jours, brouillons recents conserves", async () => {
		const { env, donnees } = faux();
		const b = (id: string, cree: string) => ({ id, titre: "t", format: "retour", source: "s", texte: "x", cree, publie: false });
		await ecrireBrouillons(env, "1", [b("vieux", ilYa(91)), b("recent", ilYa(10))]);
		expect((await lireBrouillons(env, "1")).map((x) => x.id)).toEqual(["recent"]);
		await ecrireBrouillons(env, "1", [b("vieux", ilYa(120))]);
		expect(await lireBrouillons(env, "1")).toEqual([]);
		expect(donnees.has("brouillons:1")).toBe(false);
	});

	it("GET /api/brouillons n'expose pas un brouillon perime", async () => {
		const { env } = faux();
		await avecSessions(env);
		await ecrireBrouillons(env, "1", [
			{ id: "vieux", titre: "t", format: "retour", source: "s", texte: "x", cree: ilYa(95), publie: false },
		]);
		expect(await (await appeler(env, "GET", "/brouillons")).json()).toEqual([]);
	});
});

describe("dureeEstimee", () => {
	it("arrondit la duree de calculerTimeline en secondes", () => {
		expect(dureeEstimee(EXEMPLE as never)).toBeGreaterThan(30);
		expect(Number.isInteger(dureeEstimee(EXEMPLE as never))).toBe(true);
	});
});
