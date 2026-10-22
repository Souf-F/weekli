import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Octokit } from "octokit";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl } from "../lib/github-oauth";
import { creerSession, idAleatoire, supprimerSession } from "../lib/session";
import type { AppEnv } from "../types";

// Connexion GitHub du site web (mode 2). Distincte de l'OAuth MCP, qui sert les clients comme Claude.
export const auth = new Hono<AppEnv>();

const COOKIE_ETAT = "weekli_etat";
const DUREE_ETAT = 600;

auth.get("/login", async (c) => {
	const etat = idAleatoire();
	await c.env.OAUTH_KV.put(`etat:${etat}`, "1", { expirationTtl: DUREE_ETAT });
	// L'etat est aussi lie au navigateur : un etat vole ne sert a rien sans ce cookie
	setCookie(c, COOKIE_ETAT, etat, {
		httpOnly: true,
		secure: new URL(c.req.url).protocol === "https:",
		sameSite: "Lax",
		path: "/auth",
		maxAge: DUREE_ETAT,
	});

	return c.redirect(
		getUpstreamAuthorizeUrl({
			upstream_url: "https://github.com/login/oauth/authorize",
			client_id: c.env.GITHUB_CLIENT_ID,
			redirect_uri: new URL("/auth/callback", c.req.url).href,
			scope: "read:user",
			state: etat,
		}),
	);
});

auth.get("/callback", async (c) => {
	const etat = c.req.query("state");
	const etatCookie = getCookie(c, COOKIE_ETAT);
	deleteCookie(c, COOKIE_ETAT, { path: "/auth" });

	if (!etat || etat !== etatCookie || !(await c.env.OAUTH_KV.get(`etat:${etat}`))) {
		return c.text("Connexion expiree ou invalide, recommence depuis le site.", 400);
	}
	await c.env.OAUTH_KV.delete(`etat:${etat}`);

	const [token, erreur] = await fetchUpstreamAuthToken({
		upstream_url: "https://github.com/login/oauth/access_token",
		client_id: c.env.GITHUB_CLIENT_ID,
		client_secret: c.env.GITHUB_CLIENT_SECRET,
		code: c.req.query("code"),
		redirect_uri: new URL("/auth/callback", c.req.url).href,
	});
	if (erreur) return erreur;

	const { data: user } = await new Octokit({ auth: token }).rest.users.getAuthenticated();
	await creerSession(c, { login: user.login, nom: user.name ?? user.login, avatar: user.avatar_url, token });

	return c.redirect("/app");
});

auth.post("/logout", async (c) => {
	await supprimerSession(c);
	return c.body(null, 204);
});
