import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { activiteGithub, detailsCommit, detailsRepo, promptPostsSemaine } from "@weekli/core";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { z } from "zod";
import type { Props } from "../types";

function json(donnees: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(donnees, null, 2) }] };
}

function erreur(err: unknown) {
	const message = err instanceof Error ? err.message : String(err);
	return { content: [{ type: "text" as const, text: `Erreur : ${message}` }], isError: true };
}

// Serveur MCP (mode 1) : Claude appelle ces outils avec l'abonnement de l'utilisateur
export class WeekliMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({ name: "Weekli", version: "0.2.0" });

	get octokit() {
		return new Octokit({ auth: this.props!.accessToken });
	}

	async init() {
		const login = this.props!.login;

		this.server.registerTool(
			"activite_github",
			{
				description:
					"Liste les commits recents de l'utilisateur sur ses repos GitHub publics, sans le bruit (merge, typo, chore). Point de depart pour trouver des sujets de posts.",
				inputSchema: { jours: z.number().int().min(1).max(30).default(7).describe("Periode analysee, en jours") },
				annotations: { readOnlyHint: true },
			},
			async ({ jours }) => activiteGithub(this.octokit, login, jours).then(json, erreur),
		);

		this.server.registerTool(
			"details_repo",
			{
				description:
					"Donne le contexte d'un repo public de l'utilisateur : description, site, sujets, langages et README.",
				inputSchema: { repo: z.string().describe("Nom du repo, sans le proprietaire") },
				annotations: { readOnlyHint: true },
			},
			async ({ repo }) => detailsRepo(this.octokit, login, repo).then(json, erreur),
		);

		this.server.registerTool(
			"details_commit",
			{
				description:
					"Donne le detail d'un commit (message complet, fichiers modifies, extraits du diff) pour expliquer un probleme resolu ou une fonctionnalite.",
				inputSchema: {
					repo: z.string().describe("Nom du repo, sans le proprietaire"),
					sha: z.string().min(7).describe("SHA du commit (7 caracteres suffisent)"),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ repo, sha }) => detailsCommit(this.octokit, login, repo, sha).then(json, erreur),
		);

		this.server.registerPrompt(
			"posts_semaine",
			{
				title: "Posts LinkedIn de la semaine",
				description: "Analyse ton activite GitHub et redige 2 ou 3 posts LinkedIn.",
				argsSchema: {
					jours: z.string().optional().describe("Periode en jours (7 par defaut)"),
					style: z.string().optional().describe("Quelques-uns de tes posts, pour imiter ton style"),
				},
			},
			({ jours, style }) => ({
				messages: [
					{ role: "user", content: { type: "text", text: promptPostsSemaine(Number(jours) || 7, style ?? "") } },
				],
			}),
		);
	}
}
