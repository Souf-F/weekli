import type { Props } from "../types";
import { chiffrer, dechiffrer } from "./chiffrement";

// Les props MCP sont recopiees en clair dans le stockage du Durable Object : le token GitHub n'y entre que chiffre,
// lie a l'id du compte (AAD). Un jeton recopie dans les props d'un autre compte ne s'ouvre pas.
const USAGE = "props-mcp";
const aad = (id: string) => `${USAGE}:${id}`;

export async function creerProps(
	env: Env,
	utilisateur: { id: string; login: string; nom: string },
	token: string,
): Promise<Props> {
	return { ...utilisateur, jeton: await chiffrer(env.COOKIE_ENCRYPTION_KEY, USAGE, token, aad(utilisateur.id)) };
}

export async function ouvrirJeton(env: Env, { id, jeton }: Pick<Props, "id" | "jeton">): Promise<string> {
	const token = await dechiffrer<string>(env.COOKIE_ENCRYPTION_KEY, USAGE, jeton, aad(id));
	if (!token) throw new Error("Session MCP invalide, reconnecte le connecteur");
	return token;
}
