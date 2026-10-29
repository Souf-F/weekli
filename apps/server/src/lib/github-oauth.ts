// Echanges OAuth avec GitHub, utilises par le connecteur MCP et par le site. Toujours avec PKCE (S256).

const AUTORISATION = "https://github.com/login/oauth/authorize";
const TOKEN = "https://github.com/login/oauth/access_token";
const SCOPE = "read:user";
const API = "https://api.github.com";

export class ErreurGithub extends Error {}

function base64url(octets: Uint8Array) {
	return btoa(String.fromCharCode(...octets))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

// Verifieur PKCE : 32 octets aleatoires, et son defi SHA-256
export async function creerPkce() {
	const verifieur = base64url(crypto.getRandomValues(new Uint8Array(32)));
	const empreinte = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifieur));
	return { verifieur, defi: base64url(new Uint8Array(empreinte)) };
}

export function urlAutorisation(p: { clientId: string; redirectUri: string; state: string; defi: string }) {
	const url = new URL(AUTORISATION);
	url.search = new URLSearchParams({
		client_id: p.clientId,
		redirect_uri: p.redirectUri,
		scope: SCOPE,
		state: p.state,
		code_challenge: p.defi,
		code_challenge_method: "S256",
		allow_signup: "false",
	}).toString();
	return url.href;
}

export async function echangerCode(p: {
	clientId: string;
	clientSecret: string;
	code: string;
	redirectUri: string;
	verifieur: string;
}): Promise<string> {
	const res = await fetch(TOKEN, {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: p.clientId,
			client_secret: p.clientSecret,
			code: p.code,
			redirect_uri: p.redirectUri,
			code_verifier: p.verifieur,
		}),
	});
	const corps = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
	if (!res.ok || !corps.access_token) throw new ErreurGithub(corps.error ?? `GitHub a repondu ${res.status}`);
	return corps.access_token;
}

type Revocation = { clientId: string; clientSecret: string; token: string };

// Revoque un token d'utilisateur chez GitHub sans toucher a l'autorisation de l'application (le grant reste).
// `grant` revoque au contraire l'autorisation entiere : tous les tokens de l'app pour ce compte (effacement des donnees).
// 404 : token ou autorisation deja revoques, ce qui revient au meme.
export const revoquerToken = (p: Revocation) => revoquer(p, "token");
export const revoquerAutorisation = (p: Revocation) => revoquer(p, "grant");

async function revoquer(p: Revocation, cible: "token" | "grant") {
	const res = await fetch(`${API}/applications/${encodeURIComponent(p.clientId)}/${cible}`, {
		method: "DELETE",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Basic ${btoa(`${p.clientId}:${p.clientSecret}`)}`,
			"Content-Type": "application/json",
			"User-Agent": "weekli",
		},
		body: JSON.stringify({ access_token: p.token }),
		signal: AbortSignal.timeout(5000),
	});
	if (res.status !== 204 && res.status !== 404) throw new ErreurGithub(`GitHub a repondu ${res.status}`);
}
