import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { ecrireBrouillons } from "../../lib/brouillons";
import { lireNomsMcp } from "../../lib/mcp-index";
import { creerProps, ouvrirJeton } from "../../lib/props";
import type { Props } from "../../types";
import { INACTIVITE_SECONDES, WeekliMCP } from "../agent";

// Sous Node, la bibliotheque agents (runtime Workers) est remplacee par un socle minimal : stockage, alarmes, destroy
vi.mock("agents/mcp", () => ({
	McpAgent: class {
		props?: unknown;
		name = "";
		constructor(
			public ctx: { storage: Map<string, unknown> & { deleteAll(): Promise<void> }; planifies: Map<string, unknown> },
			public env: unknown,
		) {}
		async schedule(secondes: number, callback: string) {
			const id = `alarme-${this.ctx.planifies.size}-${Math.random()}`;
			this.ctx.planifies.set(id, { secondes, callback });
			return { id };
		}
		async cancelSchedule(id: string) {
			return this.ctx.planifies.delete(id);
		}
		async destroy() {
			await this.ctx.storage.deleteAll();
			this.ctx.planifies.clear();
		}
	},
}));
vi.mock("../../lib/capture", () => ({
	capturer: vi.fn(),
	ErreurCapture: class extends Error {},
	verifierUrl: vi.fn(),
}));

const SECRET = "a".repeat(64);
const TOKEN = "gho_secret_du_compte_1";

function faux() {
	const kv = new Map<string, string>();
	const env = {
		OAUTH_KV: {
			get: async (k: string) => kv.get(k) ?? null,
			put: async (k: string, v: string) => void kv.set(k, v),
			delete: async (k: string) => void kv.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: SECRET,
		LIMITE_CAPTURE: { limit: async () => ({ success: true }) },
	} as unknown as Env;
	const donnees = new Map<string, unknown>();
	const storage = {
		get: async (k: string) => donnees.get(k),
		put: async (k: string, v: unknown) => void donnees.set(k, v),
		delete: async (k: string) => donnees.delete(k),
		deleteAll: async () => donnees.clear(),
	};
	const planifies = new Map<string, { secondes: number; callback: string }>();
	return { env, kv, donnees, planifies, ctx: { storage, planifies } };
}

async function demarrer(env: Env, ctx: object, props: Props, nom = "streamable-http:abc") {
	const agent = new WeekliMCP(ctx as never, env);
	(agent as unknown as { name: string }).name = nom;
	agent.props = props;
	await agent.init();
	const client = new Client({ name: "test", version: "1" });
	const [cote_client, cote_serveur] = InMemoryTransport.createLinkedPair();
	await agent.server.server.connect(cote_serveur);
	await client.connect(cote_client);
	return { agent, client };
}

const texte = (r: unknown) => (r as { content: { text: string }[] }).content[0].text;

describe("props MCP", () => {
	it("ne contiennent ni email, ni token en clair", async () => {
		const { env } = faux();
		const props = await creerProps(env, { id: "1", login: "alice", nom: "Alice" }, TOKEN);
		expect(Object.keys(props).sort()).toEqual(["id", "jeton", "login", "nom"]);
		expect(JSON.stringify(props)).not.toContain(TOKEN);
		expect(await ouvrirJeton(env, props)).toBe(TOKEN);
	});

	it("refusent un jeton recopie dans les props d'un autre compte", async () => {
		const { env } = faux();
		const alice = await creerProps(env, { id: "1", login: "alice", nom: "Alice" }, TOKEN);
		await expect(ouvrirJeton(env, { id: "2", jeton: alice.jeton })).rejects.toThrow("Session MCP invalide");
	});
});

describe("Durable Object WeekliMCP", () => {
	async function alice() {
		const f = faux();
		const props = await creerProps(f.env, { id: "1", login: "alice", nom: "Alice" }, TOKEN);
		return { ...f, props, ...(await demarrer(f.env, f.ctx, props)) };
	}

	it("enregistre son proprietaire, son nom dans mcp:<id> et une alarme de 24 h", async () => {
		const { env, donnees, planifies } = await alice();
		expect(donnees.get("proprietaire")).toBe("1");
		expect(await lireNomsMcp(env, "1")).toEqual(["streamable-http:abc"]);
		expect([...planifies.values()]).toEqual([{ secondes: INACTIVITE_SECONDES, callback: "expirer" }]);
		expect(INACTIVITE_SECONDES).toBe(86_400);
	});

	it("repousse l'alarme a chaque appel sans en accumuler", async () => {
		const { client, planifies } = await alice();
		const avant = [...planifies.keys()];
		await client.callTool({ name: "lister_brouillons", arguments: {} });
		await client.callTool({ name: "lister_brouillons", arguments: {} });
		expect(planifies.size).toBe(1);
		expect([...planifies.keys()]).not.toEqual(avant);
	});

	it("garde le proprietaire et l'index apres un redemarrage a froid", async () => {
		const { env, ctx, props } = await alice();
		await demarrer(env, ctx, props);
		expect(await lireNomsMcp(env, "1")).toEqual(["streamable-http:abc"]);
	});

	it("refuse un appel dont les props sont celles d'un autre id, sans rien lire de ses donnees", async () => {
		const { env, agent, client } = await alice();
		await ecrireBrouillons(env, "2", [
			{ id: "x", titre: "", format: "", source: "", texte: "secret de bob", cree: "", publie: false },
		]);
		agent.props = await creerProps(env, { id: "2", login: "bob", nom: "Bob" }, "gho_bob");

		const res = await client.callTool({ name: "lister_brouillons", arguments: { nonPublies: false } });
		expect(res.isError).toBe(true);
		expect(texte(res)).toContain("Session MCP invalide");
		expect(texte(res)).not.toContain("secret de bob");
	});

	it("refuse un appel sans props exploitables", async () => {
		const { agent, client } = await alice();
		agent.props = undefined;
		const res = await client.callTool({ name: "lister_brouillons", arguments: {} });
		expect(res.isError).toBe(true);
	});

	it("detruire() vide tout le stockage et les alarmes", async () => {
		const { agent, donnees, planifies } = await alice();
		expect(donnees.size).toBeGreaterThan(0);
		await agent.detruire();
		expect(donnees.size).toBe(0);
		expect(planifies.size).toBe(0);
	});

	it("expirer() retire le nom de l'index puis vide le stockage", async () => {
		const { env, agent, donnees } = await alice();
		await agent.expirer();
		expect(await lireNomsMcp(env, "1")).toEqual([]);
		expect(donnees.size).toBe(0);
	});

	it("expirer() vide le stockage meme si KV echoue", async () => {
		const { env, agent, donnees } = await alice();
		env.OAUTH_KV.get = async () => {
			throw new Error("KV indisponible");
		};
		vi.spyOn(console, "error").mockImplementation(() => {});
		await agent.expirer();
		expect(donnees.size).toBe(0);
	});
});

describe("style d'ecriture (MCP)", () => {
	async function alice() {
		const f = faux();
		const props = await creerProps(f.env, { id: "1", login: "alice", nom: "Alice" }, TOKEN);
		return { ...f, props, ...(await demarrer(f.env, f.ctx, props)) };
	}
	const prompt = async (client: Client, args: Record<string, string> = {}) =>
		(await client.getPrompt({ name: "posts_semaine", arguments: args })).messages[0].content as { text: string };

	it("lire_style renvoie des champs vides sans style, sauver_style puis lire_style le relit", async () => {
		const { client } = await alice();
		expect(JSON.parse(texte(await client.callTool({ name: "lire_style", arguments: {} })))).toEqual({
			exemples: "",
			profil: "",
			maj: null,
		});

		const sauve = await client.callTool({
			name: "sauver_style",
			arguments: { profil: "Phrases courtes", exemples: "Mon post" },
		});
		const { enregistre, maj } = JSON.parse(texte(sauve));
		expect(enregistre).toBe(true);

		expect(JSON.parse(texte(await client.callTool({ name: "lire_style", arguments: {} })))).toEqual({
			exemples: "Mon post",
			profil: "Phrases courtes",
			maj,
		});
	});

	it("sauver_style garde le champ absent et refuse un style vide", async () => {
		const { client } = await alice();
		await client.callTool({ name: "sauver_style", arguments: { exemples: "Mon post" } });
		await client.callTool({ name: "sauver_style", arguments: { profil: "Tutoiement" } });
		expect(JSON.parse(texte(await client.callTool({ name: "lire_style", arguments: {} })))).toMatchObject({
			exemples: "Mon post",
			profil: "Tutoiement",
		});

		const vide = await client.callTool({ name: "sauver_style", arguments: {} });
		expect(vide.isError).toBe(true);
		expect(texte(vide)).toBe("Erreur : Style vide");
	});

	it("sauver_style est declare non destructif et idempotent, lire_style en lecture seule", async () => {
		const { client } = await alice();
		const outils = Object.fromEntries((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
		expect(outils.lire_style).toMatchObject({ readOnlyHint: true });
		expect(outils.sauver_style).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
	});

	it("le prompt sans argument contient le profil puis les exemples stockes", async () => {
		const { client } = await alice();
		await client.callTool({
			name: "sauver_style",
			arguments: { profil: "Phrases courtes, tutoiement", exemples: "Cette semaine j'ai enfin" },
		});
		const { text } = await prompt(client);
		expect(text).toContain("Phrases courtes, tutoiement");
		expect(text).toContain("Cette semaine j'ai enfin");
		expect(text.indexOf("Phrases courtes")).toBeLessThan(text.indexOf("Cette semaine"));
	});

	it("le prompt sans style stocke ne contient aucune section de style", async () => {
		const { client } = await alice();
		expect((await prompt(client)).text).not.toContain("Profil de style");
	});

	it("l'argument style du prompt prime sur le style stocke", async () => {
		const { client } = await alice();
		await client.callTool({ name: "sauver_style", arguments: { profil: "Profil stocke" } });
		const { text } = await prompt(client, { style: "Exemple fourni a la main" });
		expect(text).toContain("Exemple fourni a la main");
		expect(text).not.toContain("Profil stocke");
	});

	it("refuse l'outil et le prompt avec les props d'un autre id, sans exposer son style", async () => {
		const { env, agent, client } = await alice();
		await client.callTool({ name: "sauver_style", arguments: { profil: "Profil d'Alice" } });
		agent.props = await creerProps(env, { id: "2", login: "bob", nom: "Bob" }, "gho_bob");

		const lecture = await client.callTool({ name: "lire_style", arguments: {} });
		expect(lecture.isError).toBe(true);
		expect(texte(lecture)).not.toContain("Profil d'Alice");
		const ecriture = await client.callTool({ name: "sauver_style", arguments: { profil: "Pirate" } });
		expect(ecriture.isError).toBe(true);
		await expect(prompt(client)).rejects.toThrow();
	});
});
