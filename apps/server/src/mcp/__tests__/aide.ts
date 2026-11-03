import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { creerProps } from "../../lib/props";
import type { Props } from "../../types";
import { WeekliMCP } from "../agent";

const SECRET = "a".repeat(64);
export const TOKEN = "gho_secret_du_compte_1";

export function faux() {
	const kv = new Map<string, string>();
	const env = {
		OAUTH_KV: {
			get: async (k: string) => kv.get(k) ?? null,
			put: async (k: string, v: string) => void kv.set(k, v),
			delete: async (k: string) => void kv.delete(k),
		},
		COOKIE_ENCRYPTION_KEY: SECRET,
		PUBLIC_URL: "https://weekli.example",
		LIMITE_CAPTURE: { limit: async () => ({ success: true }) },
	} as unknown as Env;
	const donnees = new Map<string, unknown>();
	const storage = {
		get: async (k: string) => donnees.get(k),
		put: async (k: string, v: unknown) => void donnees.set(k, v),
		delete: async (k: string) => donnees.delete(k),
		deleteAll: async () => donnees.clear(),
	};
	return { env, kv, ctx: { storage, planifies: new Map<string, unknown>() } };
}

// Connecte un client MCP en memoire a un WeekliMCP du compte donne
export async function connecter(env: Env, ctx: object, props: Props) {
	const agent = new WeekliMCP(ctx as never, env);
	(agent as unknown as { name: string }).name = "streamable-http:abc";
	agent.props = props;
	await agent.init();
	const client = new Client({ name: "test", version: "1" });
	const [cote_client, cote_serveur] = InMemoryTransport.createLinkedPair();
	await agent.server.server.connect(cote_serveur);
	await client.connect(cote_client);
	return { agent, client };
}

export async function compte(id = "1", login = "alice") {
	const f = faux();
	const props = await creerProps(f.env, { id, login, nom: login }, TOKEN);
	return { ...f, props, ...(await connecter(f.env, f.ctx, props)) };
}

export const texte = (r: unknown) => (r as { content: { text: string }[] }).content[0].text;
export const donnees = (r: unknown) => JSON.parse(texte(r));
