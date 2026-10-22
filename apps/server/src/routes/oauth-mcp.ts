import { AuthorizationError, CimdFetchError, authorizationErrorRedirect } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { Octokit } from "octokit";
import { creerPkce, echangerCode, urlAutorisation } from "../lib/github-oauth";
import { pageConsentement, pageErreur } from "../lib/pages";
import type { AppEnv, Props } from "../types";

// OAuth des clients MCP (Claude...) : Weekli est serveur d'autorisation, GitHub sert a identifier l'utilisateur.
// Les helpers de la bibliotheque gardent la demande cote serveur, lient chaque etape au navigateur
// et protegent du "confused deputy" : consentement par client avant toute redirection vers GitHub.
export const oauthMcp = new Hono<AppEnv>();

const rappel = (url: string) => new URL("/callback", url).href;

// Le secret de memorisation du consentement est derive de COOKIE_ENCRYPTION_KEY
const memoriser = (cle: string) => ({ secret: cle });

async function versGithub(
	c: { env: AppEnv["Bindings"]; req: { url: string } },
	demande: Parameters<AppEnv["Bindings"]["OAUTH_PROVIDER"]["beginUpstream"]>[0],
	headers?: Headers,
) {
	const { verifieur, defi } = await creerPkce();
	const amont = await c.env.OAUTH_PROVIDER.beginUpstream(demande, { data: { verifieur }, headers });
	amont.headers.set(
		"Location",
		urlAutorisation({ clientId: c.env.GITHUB_CLIENT_ID, redirectUri: rappel(c.req.url), state: amont.state, defi }),
	);
	return new Response(null, { status: 302, headers: amont.headers });
}

function gererErreur(err: unknown) {
	if (err instanceof AuthorizationError && err.redirectTo) return Response.redirect(err.redirectTo, 302);
	if (err instanceof AuthorizationError) return pageErreur(err.description ?? "Demande d'autorisation invalide.");
	if (err instanceof CimdFetchError) return pageErreur("Cette application n'a pas pu être vérifiée.");
	console.error("OAuth MCP :", err);
	return pageErreur("Erreur inattendue, réessaie dans un instant.", 500);
}

oauthMcp.get("/authorize", async (c) => {
	try {
		const oauth = c.env.OAUTH_PROVIDER;
		const demande = await oauth.parseAuthRequest(c.req.raw);
		if (await oauth.isConsentRemembered(c.req.raw, demande, memoriser(c.env.COOKIE_ENCRYPTION_KEY))) {
			return versGithub(c, demande);
		}
		const description = await oauth.describeConsent(demande);
		const consentement = await oauth.beginConsent(demande);
		return pageConsentement(description, consentement.handle, consentement.headers);
	} catch (err) {
		return gererErreur(err);
	}
});

oauthMcp.post("/authorize", async (c) => {
	try {
		const oauth = c.env.OAUTH_PROVIDER;
		const formulaire = await c.req.formData();
		const handle = String(formulaire.get("handle") ?? "");

		if (formulaire.get("decision") !== "approve") {
			const refus = await oauth.denyConsent(c.req.raw, handle);
			return new Response(null, { status: 302, headers: refus.headers });
		}
		// La demande vient du stockage serveur, jamais du formulaire
		const accord = await oauth.approveConsent(c.req.raw, handle, { remember: memoriser(c.env.COOKIE_ENCRYPTION_KEY) });
		return versGithub(c, accord.request, accord.headers);
	} catch (err) {
		return gererErreur(err);
	}
});

oauthMcp.get("/callback", async (c) => {
	try {
		const reprise = await c.env.OAUTH_PROVIDER.finishUpstream<{ verifieur: string }>(c.req.raw);
		const code = c.req.query("code");

		if (c.req.query("error") || !code) {
			reprise.headers.set("Location", authorizationErrorRedirect(reprise.request, "access_denied"));
			return new Response(null, { status: 302, headers: reprise.headers });
		}

		const token = await echangerCode({
			clientId: c.env.GITHUB_CLIENT_ID,
			clientSecret: c.env.GITHUB_CLIENT_SECRET,
			code,
			redirectUri: rappel(c.req.url),
			verifieur: reprise.data.verifieur,
		});
		const { data: user } = await new Octokit({ auth: token }).rest.users.getAuthenticated();

		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			request: reprise.request,
			userId: String(user.id),
			metadata: { label: user.login },
			scope: reprise.request.scope,
			props: {
				login: user.login,
				name: user.name ?? user.login,
				email: user.email ?? "",
				accessToken: token,
			} satisfies Props,
		});
		reprise.headers.set("Location", redirectTo);
		return new Response(null, { status: 302, headers: reprise.headers });
	} catch (err) {
		return gererErreur(err);
	}
});
