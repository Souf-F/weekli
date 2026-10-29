import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv, Session } from "../types";
import { chiffrer, dechiffrer } from "./chiffrement";
import { ecrireListe, lireListe } from "./listes";

// Alignee sur la duree de vie des tokens GitHub (8 h quand l'app OAuth fait expirer les tokens)
const DUREE = 60 * 60 * 8;
const USAGE = "session";
const cle = (id: string) => `session:${id}`;

// Index `sessions:<id>` : sessions ouvertes d'un compte (autres navigateurs compris), pour l'effacement (ADR-02).
// Entrees expirees retirees a chaque ecriture ; au-dela de 20, les plus anciennes sont fermees.
const USAGE_INDEX = "sessions";
const MAX_SESSIONS = 20;
const cleIndex = (userId: string) => `sessions:${userId}`;
type Entree = { sid: string; exp: number };

async function indexer(env: Env, userId: string, sid: string) {
	const maintenant = Math.floor(Date.now() / 1000);
	const actives = (await lireListe<Entree>(env, USAGE_INDEX, cleIndex(userId))).filter(
		(e) => e.exp > maintenant && e.sid !== sid,
	);
	const gardees = [...actives, { sid, exp: maintenant + DUREE }];
	const fermees = gardees.splice(0, Math.max(0, gardees.length - MAX_SESSIONS));
	await ecrireListe(env, USAGE_INDEX, cleIndex(userId), gardees, DUREE);
	await Promise.all(fermees.map((e) => env.OAUTH_KV.delete(cle(e.sid))));
}

async function desindexer(env: Env, userId: string, sid: string) {
	const entrees = await lireListe<Entree>(env, USAGE_INDEX, cleIndex(userId));
	if (entrees.some((e) => e.sid === sid)) {
		await ecrireListe(env, USAGE_INDEX, cleIndex(userId), entrees.filter((e) => e.sid !== sid), DUREE);
	}
}

// Identifiants des sessions ouvertes d'un compte, pour l'effacement complet
export async function sessionsIndexees(env: Env, userId: string): Promise<string[]> {
	return (await lireListe<Entree>(env, USAGE_INDEX, cleIndex(userId))).map((e) => e.sid);
}

export const supprimerIndexSessions = (env: Env, userId: string) => env.OAUTH_KV.delete(cleIndex(userId));

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
	const donnee = await chiffrer(c.env.COOKIE_ENCRYPTION_KEY, USAGE, session, cle(id));
	await indexer(c.env, session.id, id);
	await c.env.OAUTH_KV.put(cle(id), donnee, { expirationTtl: DUREE });
	setCookie(c, nomCookie(c), id, { httpOnly: true, secure: enHttps(c), sameSite: "Lax", path: "/", maxAge: DUREE });
}

export async function lireSession(c: Context<AppEnv>): Promise<Session | null> {
	const id = getCookie(c, nomCookie(c));
	if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;
	const donnee = await c.env.OAUTH_KV.get(cle(id));
	const session = donnee ? await dechiffrer<Session>(c.env.COOKIE_ENCRYPTION_KEY, USAGE, donnee, cle(id)) : null;
	// Une session creee avant l'identite par id n'est pas reutilisable : reconnexion
	return session && typeof session.id === "string" ? session : null;
}

// Supprime la session du cookie : KV, index du compte (si la session est connue) et cookie.
// Un index qui ne se nettoie pas n'empeche pas la deconnexion : ses entrees expirent seules.
export async function supprimerSession(c: Context<AppEnv>, session: Session | null) {
	const id = getCookie(c, nomCookie(c));
	if (id && /^[0-9a-f]{64}$/.test(id)) {
		await c.env.OAUTH_KV.delete(cle(id));
		if (session) await desindexer(c.env, session.id, id).catch((err) => console.error("Index des sessions :", err));
	}
	deleteCookie(c, nomCookie(c), { path: "/", secure: enHttps(c) });
}
