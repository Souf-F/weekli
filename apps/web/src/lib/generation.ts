import Anthropic from "@anthropic-ai/sdk";
import {
	type ActiviteRepo,
	type DetailsCommit,
	lirePosts,
	messageGeneration,
	type OptionsGeneration,
	type Post,
	systemeGeneration,
} from "@weekli/core";
import type { Modele } from "./reglages";

type Params = {
	cleApi: string;
	modele: Modele;
	repos: ActiviteRepo[];
	details: DetailsCommit[];
	options: OptionsGeneration;
	surProgression: (posts: Post[]) => void;
	signal: AbortSignal;
};

// Appel direct du navigateur vers l'API Anthropic : la cle ne transite jamais par le serveur Weekli
export async function genererPosts({ cleApi, modele, repos, details, options, surProgression, signal }: Params) {
	const client = new Anthropic({ apiKey: cleApi, dangerouslyAllowBrowser: true });

	// Le repli serveur automatique (refus de securite) existe pour Opus et Sonnet, pas pour Haiku
	const repli =
		modele === "claude-haiku-5-5" ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

	const flux = client.beta.messages.stream(
		{
			model: modele,
			max_tokens: 16000,
			output_config: { effort: "medium" },
			system: systemeGeneration(options),
			messages: [{ role: "user", content: messageGeneration(repos, details) }],
			...repli,
		},
		{ signal },
	);

	flux.on("text", (_delta, texte) => surProgression(lirePosts(texte)));
	const message = await flux.finalMessage();

	if (message.stop_reason === "refusal") throw new Error("Le modele a refuse cette demande.");
	if (message.stop_reason === "max_tokens") throw new Error("Reponse tronquee, essaie avec moins de posts.");

	const texte = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
	return lirePosts(texte);
}

export function messageErreur(err: unknown): string {
	if (err instanceof Anthropic.AuthenticationError) return "Cle API invalide. Verifie-la dans les reglages.";
	if (err instanceof Anthropic.PermissionDeniedError) return "Cette cle n'a pas acces a ce modele.";
	if (err instanceof Anthropic.RateLimitError) return "Limite de requetes atteinte, reessaie dans un instant.";
	if (err instanceof Anthropic.APIConnectionError) return "Impossible de joindre l'API Anthropic.";
	if (err instanceof Anthropic.APIError) return `Erreur de l'API (${err.status ?? "inconnue"}).`;
	return err instanceof Error ? err.message : "Erreur inattendue.";
}
