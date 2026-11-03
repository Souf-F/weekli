import { LIMITES_STYLE } from "@weekli/core";
import { z } from "zod";
import { ecrireStyle, lireStyle } from "../lib/style";
import type { Contexte } from "./contexte";

export function outilsStyle({ server, env, appel }: Contexte) {
	server.registerTool(
		"lire_style",
		{
			description:
				"Renvoie le style d'ecriture memorise de l'utilisateur. Appelle cet outil avant de rediger un post, et respecte le profil.",
			inputSchema: {},
			annotations: { readOnlyHint: true },
		},
		async () => appel((p) => lireStyle(env, p.id)),
	);

	server.registerTool(
		"sauver_style",
		{
			description:
				"Memorise le style d'ecriture de l'utilisateur : quelques posts qu'il a ecrits (exemples) et une synthese (profil : ton, longueur, tournures, emojis). A utiliser seulement a sa demande.",
			inputSchema: {
				exemples: z
					.string()
					.max(LIMITES_STYLE.exemples)
					.optional()
					.describe("Quelques posts de l'utilisateur, tels quels"),
				profil: z
					.string()
					.max(LIMITES_STYLE.profil)
					.optional()
					.describe("Synthese du style : ton, longueur, tournures, emojis"),
			},
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
		},
		async (entree) =>
			appel(async (p) => {
				const style = await ecrireStyle(env, p.id, entree);
				if (!style) throw new Error("Style vide");
				return { enregistre: true, maj: style.maj };
			}),
	);
}
