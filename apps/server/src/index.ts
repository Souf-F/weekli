import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { env } from "cloudflare:workers";
import { refuserSessionMcp } from "./lib/acces-mcp";
import { GRANT_MCP_SECONDES } from "./lib/conservation";
import { ajouterEnTetes, limiterAuth, verifierConfiguration, verifierOrigine } from "./lib/securite";
import { WeekliMCP } from "./mcp/agent";
import { app } from "./routes/app";
import type { Props } from "./types";

// Le Durable Object doit etre exporte depuis le point d'entree du Worker
export { WeekliMCP };

const serveurMcp = WeekliMCP.serve("/mcp");

const fournisseur = new OAuthProvider({
	apiRoute: "/mcp",
	// Chaque utilisateur MCP a son propre quota d'appels d'outils
	apiHandler: {
		async fetch(request: Request, env: Env, ctx: ExecutionContext) {
			// Un token emis avant l'identite par id ou avant les props minimales (id, jeton) est inutilisable : reconnexion
			const { id, jeton } = (ctx.props ?? {}) as Partial<Props>;
			if (!id || !jeton) return new Response("Reconnecte le connecteur Weekli", { status: 401 });
			const { success } = await env.LIMITE_API.limit({ key: `mcp:${id}` });
			if (!success) return new Response("Trop de requetes", { status: 429, headers: { "Retry-After": "60" } });
			const refus = await refuserSessionMcp(env, id, request);
			return refus ?? serveurMcp.fetch(request, env, ctx);
		},
	},
	authorizeEndpoint: "/authorize",
	refreshTokenTTL: GRANT_MCP_SECONDES,
	clientRegistrationEndpoint: "/register",
	defaultHandler: app as any,
	tokenEndpoint: "/token",
	// Les tokens ne sont acceptes que pour cette ressource precise (audience), pas pour un autre service
	resourceMetadata: {
		resource: `${env.PUBLIC_URL}/mcp`,
		authorization_servers: [env.PUBLIC_URL],
		resource_name: "Weekli",
	},
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const refus = verifierConfiguration(env) ?? verifierOrigine(request) ?? (await limiterAuth(request, env));
		const reponse = refus ?? (await fournisseur.fetch(request, env, ctx));
		return ajouterEnTetes(reponse, request);
	},
} satisfies ExportedHandler<Env>;
