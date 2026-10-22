import type { ConsentDescription } from "@cloudflare/workers-oauth-provider";

// Pages HTML servies par le Worker lui-meme (consentement MCP, erreurs).
// Tout ce qui vient du client OAuth est choisi par un attaquant potentiel : on echappe tout.

export const echapper = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLE = `
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;
background:#e6e0f0;color:#2a1c13;font:16px/1.6 system-ui,sans-serif}
main{max-width:460px;width:100%;padding:40px;border-radius:24px;background:#fff;box-shadow:0 30px 80px -30px rgba(42,28,19,.35)}
h1{font:400 2rem/1.1 Georgia,serif;margin:0 0 16px}p{margin:0 0 14px;color:#6a5a4f}strong{color:#2a1c13}
.alerte{padding:12px 14px;border-radius:12px;background:#fbeaea;color:#8a2b20}
.actions{display:flex;gap:10px;margin-top:24px}button{flex:1;padding:14px;border-radius:12px;border:1px solid #2a1c13;font:500 .95rem system-ui;cursor:pointer}
.ok{background:#2a1c13;color:#e5e4e2}.non{background:#fff;color:#2a1c13}`;

// Aucune ressource externe, aucun script : la CSP le garantit
const CSP =
	"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

function page(titre: string, corps: string) {
	return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${echapper(titre)}</title><style>${STYLE}</style></head><body><main>${corps}</main></body></html>`;
}

export function pageConsentement(d: ConsentDescription, handle: string, headers: Headers) {
	const origine = d.clientDomain
		? `Publiée par <strong>${echapper(d.clientDomain)}</strong>.`
		: "Cette application s'est déclarée elle-même : son nom n'est pas vérifié.";
	const local = d.redirectIsLoopback
		? `<p class="alerte">L'accès sera envoyé à une application de ton ordinateur. Continue seulement si tu viens de lancer la connexion depuis elle.</p>`
		: "";

	headers.set("Content-Type", "text/html; charset=utf-8");
	headers.set("Content-Security-Policy", CSP);
	return new Response(
		page(
			"Autoriser l'accès à Weekli",
			`<h1>Autoriser <strong>${echapper(d.clientName)}</strong> à utiliser Weekli ?</h1>
<p>${origine} L'accès sera envoyé à <strong>${echapper(d.redirectHost)}</strong>.</p>
${local}
<p>Weekli lira uniquement tes repos GitHub publics, en lecture seule. Rien ne sera publié.</p>
<form method="post">
<input type="hidden" name="handle" value="${echapper(handle)}">
<div class="actions"><button class="non" name="decision" value="deny">Refuser</button><button class="ok" name="decision" value="approve">Autoriser</button></div>
</form>`,
		),
		{ headers },
	);
}

export function pageErreur(message: string, statut = 400) {
	return new Response(page("Weekli", `<h1>Connexion impossible</h1><p>${echapper(message)}</p>`), {
		status: statut,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Content-Security-Policy": CSP,
			"Cache-Control": "no-store",
		},
	});
}
