import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Octokit } from "octokit";
import { chiffrer, dechiffrer } from "../lib/chiffrement";
import { creerPkce, echangerCode, urlAutorisation } from "../lib/github-oauth";
import { pageErreur } from "../lib/pages";
import { creerSession, idAleatoire, supprimerSession } from "../lib/session";
import type { AppEnv } from "../types";

// Connexion GitHub du site web (mode 2). Distincte de l'OAuth MCP, qui sert les clients comme Claude.
export const auth = new Hono<AppEnv>();

const COOKIE_ETAT = "weekli_etat";
const DUREE_ETAT = 600;
const USAGE = "etat-connexion";
const rappel = (url: string) => new URL("/auth/callback", url).href;

auth.get("/login", async (c) => {
	const etat = idAleatoire();
	const { verifieur, defi } = await creerPkce();
	// Le verifieur PKCE reste cote serveur, chiffre ; l'etat est aussi lie au navigateur par cookie
	await c.env.OAUTH_KV.put(`etat:${etat}`, await chiffrer(c.env.COOKIE_ENCRYPTION_KEY, USAGE, { verifieur }), {
		expirationTtl: DUREE_ETAT,
	});
	setCookie(c, COOKIE_ETAT, etat, {
		httpOnly: true,
		secure: new URL(c.req.url).protocol === "https:",
		sameSite: "Lax",
		path: "/auth",
		maxAge: DUREE_ETAT,
	});
	return c.redirect(
		urlAutorisation({ clientId: c.env.GITHUB_CLIENT_ID, redirectUri: rappel(c.req.url), state: etat, defi }),
	);
});

auth.get("/callback", async (c) => {
	const etat = c.req.query("state");
	const code = c.req.query("code");
	const etatCookie = getCookie(c, COOKIE_ETAT);
	deleteCookie(c, COOKIE_ETAT, { path: "/auth" });

	if (!etat || !code || !/^[0-9a-f]{64}$/.test(etat) || etat !== etatCookie) {
		return pageErreur("Connexion expirée ou invalide. Recommence depuis le site.");
	}
	const stocke = await c.env.OAUTH_KV.get(`etat:${etat}`);
	await c.env.OAUTH_KV.delete(`etat:${etat}`); // usage unique
	const donnees = stocke ? await dechiffrer<{ verifieur: string }>(c.env.COOKIE_ENCRYPTION_KEY, USAGE, stocke) : null;
	if (!donnees) return pageErreur("Connexion expirée ou invalide. Recommence depuis le site.");

	try {
		const token = await echangerCode({
			clientId: c.env.GITHUB_CLIENT_ID,
			clientSecret: c.env.GITHUB_CLIENT_SECRET,
			code,
			redirectUri: rappel(c.req.url),
			verifieur: donnees.verifieur,
		});
		const { data: user } = await new Octokit({ auth: token }).rest.users.getAuthenticated();
		await creerSession(c, { login: user.login, nom: user.name ?? user.login, avatar: user.avatar_url, token });
	} catch (err) {
		console.error("Connexion GitHub :", err);
		return pageErreur("GitHub a refusé la connexion. Recommence depuis le site.");
	}
	return c.redirect("/app");
});

auth.post("/logout", async (c) => {
	await supprimerSession(c);
	return c.body(null, 204);
});
