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

// Aucune ressource externe et aucun script tiers : la CSP le garantit.
// form-action s'applique aussi aux redirections qui suivent l'envoi : GitHub doit y figurer, et l'application cliente
// aussi, car GitHub renvoie aussitot vers elle quand le compte l'a deja autorise (et le refus va directement chez elle).
// Style et script passent par un nonce a usage unique : ni 'unsafe-inline' ni script libre.
const nonceAleatoire = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
const csp = (nonce: string, script = false, retour = "") =>
	`default-src 'none'; style-src 'nonce-${nonce}'${script ? `; script-src 'nonce-${nonce}'` : ""}; form-action 'self' https://github.com${retour && ` ${retour}`}; frame-ancestors 'none'; base-uri 'none'`;

// Seul script autorise sur la page de consentement : il desactive les boutons apres le premier clic (un formulaire de consentement ne sert qu'une fois)
const SCRIPT_UN_CLIC = `document.querySelector("form").addEventListener("submit", () => setTimeout(() => document.querySelectorAll("button").forEach((b) => (b.disabled = true))));`;

function page(titre: string, corps: string, nonce: string) {
	return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${echapper(titre)}</title><style nonce="${nonce}">${STYLE}</style></head><body><main>${corps}</main></body></html>`;
}

// Origine de l'URI de retour, deja validee par le fournisseur OAuth. Schema seul pour une application native (claude://...)
function sourceRetour(uri: string) {
	const { protocol, origin } = new URL(uri);
	return protocol === "http:" || protocol === "https:" ? origin : protocol;
}

export function pageConsentement(d: ConsentDescription, handle: string, headers: Headers, redirectUri: string) {
	const origine = d.clientDomain
		? `Publiée par <strong>${echapper(d.clientDomain)}</strong>.`
		: "Cette application s'est déclarée elle-même : son nom n'est pas vérifié.";
	const local = d.redirectIsLoopback
		? `<p class="alerte">L'accès sera envoyé à une application de ton ordinateur. Continue seulement si tu viens de lancer la connexion depuis elle.</p>`
		: "";

	const nonce = nonceAleatoire();
	headers.set("Content-Type", "text/html; charset=utf-8");
	headers.set("Content-Security-Policy", csp(nonce, true, sourceRetour(redirectUri)));
	return new Response(
		page(
			"Autoriser l'accès à Weekli",
			`<h1>Autoriser <strong>${echapper(d.clientName)}</strong> à utiliser Weekli ?</h1>
<p>${origine} L'accès sera envoyé à <strong>${echapper(d.redirectHost)}</strong>.</p>
${local}
<p>Sur GitHub, Weekli lira uniquement tes repos publics, sans rien y modifier. Dans Weekli, cette application pourra enregistrer tes brouillons, tes pubs et ton style. Rien ne sera publié.</p>
<form method="post">
<input type="hidden" name="handle" value="${echapper(handle)}">
<div class="actions"><button class="non" name="decision" value="deny">Refuser</button><button class="ok" name="decision" value="approve">Autoriser</button></div>
</form>
<script nonce="${nonce}">${SCRIPT_UN_CLIC}</script>`,
			nonce,
		),
		{ headers },
	);
}

export function pageErreur(message: string, statut = 400) {
	const nonce = nonceAleatoire();
	return new Response(page("Weekli", `<h1>Connexion impossible</h1><p>${echapper(message)}</p>`, nonce), {
		status: statut,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Content-Security-Policy": csp(nonce),
			"Cache-Control": "no-store",
		},
	});
}
