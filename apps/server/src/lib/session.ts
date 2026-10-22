import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv, Session } from "../types";

const DUREE = 60 * 60 * 24 * 7; // 7 jours
const cle = (id: string) => `session:${id}`;

// En HTTPS on utilise le prefixe __Host-, qui interdit Domain et impose Secure et Path=/
function nomCookie(c: Context<AppEnv>) {
	return new URL(c.req.url).protocol === "https:" ? "__Host-weekli" : "weekli";
}

export function idAleatoire() {
	const octets = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
}

export async function creerSession(c: Context<AppEnv>, session: Session) {
	const id = idAleatoire();
	await c.env.OAUTH_KV.put(cle(id), JSON.stringify(session), { expirationTtl: DUREE });
	setCookie(c, nomCookie(c), id, {
		httpOnly: true,
		secure: new URL(c.req.url).protocol === "https:",
		sameSite: "Lax",
		path: "/",
		maxAge: DUREE,
	});
}

export async function lireSession(c: Context<AppEnv>): Promise<Session | null> {
	const id = getCookie(c, nomCookie(c));
	if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;
	return c.env.OAUTH_KV.get<Session>(cle(id), "json");
}

export async function supprimerSession(c: Context<AppEnv>) {
	const id = getCookie(c, nomCookie(c));
	if (id) await c.env.OAUTH_KV.delete(cle(id));
	deleteCookie(c, nomCookie(c), { path: "/", secure: new URL(c.req.url).protocol === "https:" });
}
