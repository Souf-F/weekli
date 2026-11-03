import { lireNomsMcp } from "./mcp-index";

// Le nom d'un Durable Object WeekliMCP est `streamable-http:<en-tete mcp-session-id>` (bibliotheque agents).
// L'en-tete est choisi par le client : sans ce controle, un utilisateur connecte qui connaitrait l'identifiant
// de session d'un autre atteindrait son objet encore actif. Seuls les noms listes dans `mcp:<id>` sont admis.
// Sans en-tete (initialisation d'une nouvelle session), la bibliotheque cree elle-meme l'identifiant.
// 404 : le client MCP reinitialise alors sa session (specification du transport HTTP).
export async function refuserSessionMcp(env: Env, id: string, request: Request): Promise<Response | null> {
	const session = request.headers.get("mcp-session-id");
	if (!session) return null;
	const noms = await lireNomsMcp(env, id);
	return noms.includes(`streamable-http:${session}`)
		? null
		: Response.json(
				{ jsonrpc: "2.0", error: { code: -32001, message: "Session MCP introuvable, reconnecte le connecteur" }, id: null },
				{ status: 404 },
			);
}
