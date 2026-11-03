import Anthropic from "@anthropic-ai/sdk";
import { type DonneesPost, lirePosts, messagePost, type Post, systemePost } from "@weekli/core";
import type { Modele } from "./reglages";

export type ParamsPostParType = {
	cleApi: string;
	modele: Modele;
	// Reponse de POST /api/posts/donnees
	donnees: DonneesPost;
	// Ce que l'utilisateur a ecrit lui-meme (sujet, pourquoi, probleme, reponses a Claude)
	notes: string;
	surProgression: (posts: Post[]) => void;
	signal: AbortSignal;
};

// Soit des posts, soit une question de Claude (sortie sans bloc "### ", comme le demandent les regles)
export type ResultatPostParType = { posts: Post[]; question: string };

export function lireSortie(texte: string): ResultatPostParType {
	const posts = lirePosts(texte);
	return posts.length > 0 ? { posts, question: "" } : { posts: [], question: texte.trim() };
}

// Appel direct du navigateur vers l'API Anthropic : la cle ne transite jamais par le serveur Weekli
export async function genererPostParType({
	cleApi,
	modele,
	donnees,
	notes,
	surProgression,
	signal,
}: ParamsPostParType): Promise<ResultatPostParType> {
	const client = new Anthropic({ apiKey: cleApi, dangerouslyAllowBrowser: true });
	const repli =
		modele === "claude-haiku-5-5" ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

	const flux = client.beta.messages.stream(
		{
			model: modele,
			max_tokens: 16000,
			output_config: { effort: "medium" },
			system: systemePost(donnees),
			messages: [{ role: "user", content: messagePost(donnees, notes) }],
			...repli,
		},
		{ signal },
	);

	flux.on("text", (_delta, texte) => surProgression(lirePosts(texte)));
	const message = await flux.finalMessage();

	if (message.stop_reason === "refusal") throw new Error("Le modèle a refusé cette demande.");
	if (message.stop_reason === "max_tokens") throw new Error("Réponse tronquée, essaie avec moins de matière.");

	return lireSortie(message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""));
}
