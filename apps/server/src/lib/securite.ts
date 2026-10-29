// Protections appliquees a toutes les reponses du Worker (hors fichiers du front, couverts par _headers)

// Toutes les cles de chiffrement et de signature derivent de ce secret : trop court, il ne protege plus rien.
// `openssl rand -hex 32` en donne 64 caracteres.
const LONGUEUR_MIN_CLE = 32;

export function verifierConfiguration(env: Env): Response | null {
	if ((env.COOKIE_ENCRYPTION_KEY ?? "").length >= LONGUEUR_MIN_CLE) return null;
	console.error(`COOKIE_ENCRYPTION_KEY absente ou trop courte (${LONGUEUR_MIN_CLE} caracteres minimum)`);
	return new Response("Configuration du serveur invalide", { status: 500 });
}

const ROUTES_SENSIBLES = /^\/(authorize|token|register|callback|auth\/)/;

// Limite par adresse IP les routes d'authentification, cibles classiques de force brute et d'abus
export async function limiterAuth(request: Request, env: Env): Promise<Response | null> {
	if (!ROUTES_SENSIBLES.test(new URL(request.url).pathname)) return null;
	const ip = request.headers.get("CF-Connecting-IP") ?? "local";
	const { success } = await env.LIMITE_AUTH.limit({ key: `auth:${ip}` });
	return success
		? null
		: new Response("Trop de tentatives, reessaie dans une minute.", { status: 429, headers: { "Retry-After": "60" } });
}

// Une requete qui modifie l'etat doit venir du site lui-meme (defense contre le CSRF, en plus de SameSite)
export function verifierOrigine(request: Request): Response | null {
	if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
	const chemin = new URL(request.url).pathname;
	// /token et /register sont appeles par des clients MCP hors navigateur, proteges par OAuth lui-meme
	if (!/^\/(auth\/|api\/|authorize$)/.test(chemin)) return null;
	const origine = request.headers.get("Origin");
	if (origine && origine === new URL(request.url).origin) return null;
	return new Response("Origine refusee", { status: 403 });
}

export function ajouterEnTetes(reponse: Response, request: Request): Response {
	if (reponse.status === 101 || reponse.webSocket) return reponse; // une connexion WebSocket ne se recopie pas
	const r = new Response(reponse.body, reponse);
	const h = r.headers;
	h.set("X-Content-Type-Options", "nosniff");
	h.set("Referrer-Policy", "strict-origin-when-cross-origin");
	if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", "DENY");
	if (new URL(request.url).protocol === "https:") {
		h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	}
	if (/^\/(api|auth)\//.test(new URL(request.url).pathname)) h.set("Cache-Control", "no-store");
	return r;
}
