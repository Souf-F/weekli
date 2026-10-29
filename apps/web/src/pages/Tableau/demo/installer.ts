import { ACTIVITE_DEMO, MOI_DEMO, POSTS_DEMO } from "./donnees";
import type { Post } from "@weekli/core";

// Mode demonstration : reserve au developpement, active par ?demo dans l'URL.
// Il remplace les appels /api par des donnees factices et simule la redaction en flux.
const reponse = (corps: unknown, statut = 200) =>
	new Response(statut === 204 ? null : JSON.stringify(corps), {
		status: statut,
		headers: { "Content-Type": "application/json" },
	});

export function installerDemo() {
	const fetchReel = window.fetch.bind(window);
	window.fetch = async (entree, init) => {
		const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.pathname : entree.url;
		if (url.startsWith("/api/moi")) return reponse(MOI_DEMO);
		if (url.startsWith("/api/activite")) return reponse(ACTIVITE_DEMO);
		if (url.startsWith("/api/repos/")) {
			const sha = decodeURIComponent(url.split("/commits/")[1] ?? "");
			return reponse({ sha, message: "", date: "", fichiers: [] });
		}
		if (url.startsWith("/api/brouillons")) return reponse([], init?.method === "POST" ? 201 : 200);
		if (url.startsWith("/auth/logout")) return reponse(null, 204);
		return fetchReel(entree, init);
	};
}

const pause = (ms: number, signal: AbortSignal) =>
	new Promise<void>((ok, ko) => {
		const t = setTimeout(ok, ms);
		signal.addEventListener("abort", () => (clearTimeout(t), ko(new DOMException("Annule", "AbortError"))), {
			once: true,
		});
	});

// Meme contrat que genererPosts : appelle surProgression au fil du texte
export async function genererPostsDemo({
	options,
	surProgression,
	signal,
}: {
	options: { nombre: number };
	surProgression: (posts: Post[]) => void;
	signal: AbortSignal;
}): Promise<Post[]> {
	const cibles = POSTS_DEMO.slice(0, Math.max(1, options.nombre));
	await pause(500, signal);
	const courant: Post[] = [];
	for (const cible of cibles) {
		courant.push({ ...cible, texte: "" });
		for (let i = 0; i < cible.texte.length; i += 14) {
			courant[courant.length - 1] = { ...cible, texte: cible.texte.slice(0, i + 14) };
			surProgression(courant.map((p) => ({ ...p })));
			await pause(16, signal);
		}
	}
	return cibles;
}
