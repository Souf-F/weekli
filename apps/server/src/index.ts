import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { WeekliMCP } from "./mcp/agent";
import { app } from "./routes/app";

// Le Durable Object doit etre exporte depuis le point d'entree du Worker
export { WeekliMCP };

export default new OAuthProvider({
	apiHandler: WeekliMCP.serve("/mcp"),
	apiRoute: "/mcp",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: app as any,
	tokenEndpoint: "/token",
});
