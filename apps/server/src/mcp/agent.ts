import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	activiteGithub,
	detailsCommit,
	detailsRepo,
	LIMITES,
	nettoyerPost,
	type Post,
	promptPostsSemaine,
} from "@weekli/core";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { z } from "zod";
import { lireBrouillons, sauverPosts } from "../lib/brouillons";
import { NOM_REPO, SHA } from "../lib/validation";
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
				inputSchema: { repo: z.string().regex(NOM_REPO).describe("Nom du repo, sans le proprietaire") },
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
					repo: z.string().regex(NOM_REPO).describe("Nom du repo, sans le proprietaire"),
					sha: z.string().regex(SHA).describe("SHA du commit (7 caracteres suffisent)"),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ repo, sha }) => detailsCommit(this.octokit, login, repo, sha).then(json, erreur),
		);

		this.server.registerTool(
			"sauver_brouillons",
			{
				description:
					"Enregistre des posts LinkedIn dans l'historique Weekli de l'utilisateur, pour les retrouver sur le site. A utiliser apres avoir redige les posts, si l'utilisateur veut les garder.",
				inputSchema: {
					posts: z
						.array(
							z.object({
								titre: z.string().max(LIMITES.titre),
								format: z.string().max(LIMITES.format),
								source: z.string().max(LIMITES.source),
								texte: z.string().min(1).max(LIMITES.texte),
							}),
						)
						.min(1)
						.max(5),
				},
				annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
			},
			async ({ posts }) =>
				sauverPosts(this.env, login, posts.map(nettoyerPost).filter(Boolean) as Post[])
					.then((b) => json({ enregistres: b.length, ids: b.map((x) => x.id) }))
					.catch(erreur),
		);

		this.server.registerTool(
			"lister_brouillons",
			{
				description: "Liste les brouillons enregistres dans l'historique Weekli, du plus recent au plus ancien.",
				inputSchema: { nonPublies: z.boolean().default(true).describe("Seulement ceux pas encore publies") },
				annotations: { readOnlyHint: true },
			},
			async ({ nonPublies }) =>
				lireBrouillons(this.env, login)
					.then((b) => json(nonPublies ? b.filter((x) => !x.publie) : b))
					.catch(erreur),
		);

		this.server.registerPrompt(
			"posts_semaine",
			{
				title: "Posts LinkedIn de la semaine",
				description: "Analyse ton activite GitHub et redige 2 ou 3 posts LinkedIn.",
				argsSchema: {
					jours: z
						.string()
						.regex(/^\d{1,2}$/)
						.optional()
						.describe("Periode en jours (7 par defaut)"),
					style: z.string().max(8000).optional().describe("Quelques-uns de tes posts, pour imiter ton style"),
				},
			},
			({ jours, style }) => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: promptPostsSemaine(Math.min(Math.max(Number(jours) || 7, 1), 30), style ?? ""),
						},
					},
				],
			}),
		);
	}
}
