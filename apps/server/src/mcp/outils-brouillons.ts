import { LIMITES, nettoyerPost, type Post, promptPostsSemaine, texteStyle } from "@weekli/core";
import { z } from "zod";
import { lireBrouillons, sauverPosts } from "../lib/brouillons";
import { lireStyle } from "../lib/style";
import type { Contexte } from "./contexte";

export function outilsBrouillons({ server, env, appel, identite }: Contexte) {
	server.registerTool(
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
			appel(async (p) => {
				const b = await sauverPosts(env, p.id, posts.map(nettoyerPost).filter(Boolean) as Post[]);
				return { enregistres: b.length, ids: b.map((x) => x.id) };
			}),
	);

	server.registerTool(
		"lister_brouillons",
		{
			description: "Liste les brouillons enregistres dans l'historique Weekli, du plus recent au plus ancien.",
			inputSchema: { nonPublies: z.boolean().default(true).describe("Seulement ceux pas encore publies") },
			annotations: { readOnlyHint: true },
		},
		async ({ nonPublies }) =>
			appel(async (p) => {
				const b = await lireBrouillons(env, p.id);
				return nonPublies ? b.filter((x) => !x.publie) : b;
			}),
	);

	server.registerPrompt(
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
		async ({ jours, style }) => {
			// Sans argument, le style memorise est injecte (profil puis exemples)
			const { id } = await identite();
			const texteDuStyle = style?.trim() ? style : texteStyle(await lireStyle(env, id));
			return {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: promptPostsSemaine(Math.min(Math.max(Number(jours) || 7, 1), 30), texteDuStyle),
						},
					},
				],
			};
		},
	);
}
