import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

// Contexte issu de l'OAuth MCP, chiffre dans le token et disponible dans WeekliMCP via this.props
export type Props = {
	login: string;
	name: string;
	email: string;
	accessToken: string;
};

// Session du site web, stockee dans KV et referencee par un cookie HttpOnly
export type Session = {
	login: string;
	nom: string;
	avatar: string;
	token: string;
};

export type AppEnv = {
	Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers };
	Variables: { session: Session };
};
