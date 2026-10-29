import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octokit } from "octokit";
import type { Props } from "../types";

export function json(donnees: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(donnees, null, 2) }] };
}

export function erreur(err: unknown) {
	const message = err instanceof Error ? err.message : String(err);
	return { content: [{ type: "text" as const, text: `Erreur : ${message}` }], isError: true };
}

// Ce que WeekliMCP donne a chaque fichier d'outils : le serveur, l'environnement et l'identite relue par appel
export type Contexte = {
	server: McpServer;
	env: Env;
	identite: () => Promise<Props>;
	octokit: (props: Props) => Promise<Octokit>;
	// Execute un outil pour le compte courant et met sa sortie en JSON
	appel: <T>(fn: (props: Props) => Promise<T>) => Promise<ReturnType<typeof json> | ReturnType<typeof erreur>>;
};
