import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv, Session } from "../types";
import { chiffrer, dechiffrer } from "./chiffrement";

const DUREE = 60 * 60 * 24 * 7; // 7 jours
const USAGE = "session";
const cle = (id: string) => `session:${id}`;

const enHttps = (c: Context<AppEnv>) => new URL(c.req.url).protocol === "https:";

// En HTTPS on utilise le prefixe __Host-, qui interdit Domain et impose Secure et Path=/
const nomCookie = (c: Context<AppEnv>) => (enHttps(c) ? "__Host-weekli" : "weekli");

export function idAleatoire() {
	const octets = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
}

// Nouvel identifiant a chaque connexion (pas de fixation de session), contenu chiffre dans KV
export async function creerSession(c: Context<AppEnv>, session: Session) {
	const id = idAleatoire();
	const donnee = await chiffrer(c.env.COOKIE_ENCRYPTION_KEY, USAGE, session);
	await c.env.OAUTH_KV.put(cle(id), donnee, { expirationTtl: DUREE });
	setCookie(c, nomCookie(c), id, { httpOnly: true, secure: enHttps(c), sameSite: "Lax", path: "/", maxAge: DUREE });
}

export async function lireSession(c: Context<AppEnv>): Promise<Session | null> {
	const id = getCookie(c, nomCookie(c));
	if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;
	const donnee = await c.env.OAUTH_KV.get(cle(id));
	return donnee ? dechiffrer<Session>(c.env.COOKIE_ENCRYPTION_KEY, USAGE, donnee) : null;
}

export async function supprimerSession(c: Context<AppEnv>) {
	const id = getCookie(c, nomCookie(c));
	if (id && /^[0-9a-f]{64}$/.test(id)) await c.env.OAUTH_KV.delete(cle(id));
	deleteCookie(c, nomCookie(c), { path: "/", secure: enHttps(c) });
}
