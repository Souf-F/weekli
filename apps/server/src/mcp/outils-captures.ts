import { z } from "zod";
import { capturer, ErreurCapture, verifierUrl } from "../lib/capture";
import { domainesRevalides } from "../lib/domaines";
import { type Contexte, erreur } from "./contexte";

export function outilsCaptures({ server, env, identite }: Contexte) {
	server.registerTool(
		"capturer_site",
		{
			description:
				"Prend une capture d'ecran d'une page d'un site dont l'utilisateur a verifie la propriete dans Weekli (reglages du site). Les emails, IP et tokens visibles sont floutes. Utile pour illustrer un post.",
			inputSchema: {
				url: z.string().url().max(2000).describe("Adresse https d'une page d'un domaine verifie"),
				format: z.enum(["bureau", "mobile"]).default("bureau"),
			},
			annotations: { readOnlyHint: true, openWorldHint: true },
		},
		async ({ url, format }) => {
			let id: string;
			try {
				({ id } = await identite());
			} catch (err) {
				return erreur(err);
			}
			const { success } = await env.LIMITE_CAPTURE.limit({ key: `capture:${id}` });
			if (!success) return erreur(new Error("5 captures par minute au maximum"));
			try {
				const domaines = await domainesRevalides(env, id);
				const image = await capturer(env, verifierUrl(url, domaines), format, domaines);
				return { content: [{ type: "image" as const, data: image, mimeType: "image/jpeg" }] };
			} catch (err) {
				if (err instanceof ErreurCapture) return erreur(err);
				console.error("capturer_site :", err);
				return erreur(new Error("La capture a echoue."));
			}
		},
	);
}
