// Echanges OAuth avec GitHub, utilises par le connecteur MCP et par le site. Toujours avec PKCE (S256).

const AUTORISATION = "https://github.com/login/oauth/authorize";
const TOKEN = "https://github.com/login/oauth/access_token";
const SCOPE = "read:user";

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
