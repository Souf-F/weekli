import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

// Contexte issu de l'OAuth MCP, chiffre dans le token et disponible dans WeekliMCP via this.props
export type Props = {
	id: string;
	login: string;
	nom: string;
	// Token GitHub chiffre (lib/props.ts) : les props sont recopiees dans le stockage du Durable Object
	jeton: string;
};

// Session du site web, stockee dans KV et referencee par un cookie HttpOnly
export type Session = {
	id: string;
	login: string;
	nom: string;
	avatar: string;
	token: string;
};

export type AppEnv = {
	Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers };
	Variables: { session: Session };
};
