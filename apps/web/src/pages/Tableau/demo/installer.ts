import {
	type DemandePost,
	type DetailsCommit,
	donneesPost,
	type LectureTuto,
	type Post,
	type TypePost,
} from "@weekli/core";
import type { ParamsPostParType, ResultatPostParType } from "@/lib/generation-type";
import {
	ACTIVITE_DEMO,
	ARBORESCENCE_DEMO,
	commitsDemo,
	MOI_DEMO,
	POSTS_DEMO,
	POSTS_PAR_TYPE,
	PROPOSES_DEMO,
	QUESTIONS_DEMO,
	REPOS_DEMO,
} from "./donnees";

// Mode demonstration : reserve au developpement, active par ?demo dans l'URL.
// Il simule les routes /api du tableau (repos, commits, fichiers du tuto, donnees des posts) et la redaction en flux,
// pour les 5 types de post.
const reponse = (corps: unknown, statut = 200) =>
	new Response(statut === 204 ? null : JSON.stringify(corps), {
		status: statut,
		headers: { "Content-Type": "application/json" },
	});

const pause = (ms: number, signal?: AbortSignal) =>
	new Promise<void>((ok, ko) => {
		const t = setTimeout(ok, ms);
		signal?.addEventListener("abort", () => (clearTimeout(t), ko(new DOMException("Annule", "AbortError"))), {
			once: true,
		});
	});

const styleDemo = { exemples: "", profil: "", maj: null };

const infosRepo = (nom: string) => {
	const r = REPOS_DEMO.find((x) => x.repo === nom);
	return r ? { repo: r.repo, description: r.description, site: r.site, url: r.url, sujets: ["demo"], readme: `# ${r.repo}\n\n${r.description}.\n\n## Utilisation\n\nnpm install, puis npm start.` } : null;
};

function lectureTuto(fichiers: string[]): LectureTuto {
	return {
		branche: "main",
		arborescence: ARBORESCENCE_DEMO,
		arborescenceTronquee: false,
		proposes: PROPOSES_DEMO,
		fichiers: fichiers.map((chemin) => ({ chemin, contenu: `// contenu de ${chemin}`, tronque: false })),
		readme: "# scanner-ssl\n\nAudit des certificats d'un domaine.",
		ecartes: { generes: 4, secrets: 1, binaires: 2, trop_gros: 0, refuses: 0 },
	};
}

function donneesDemo(d: DemandePost) {
	const base = { type: d.type, style: styleDemo, infos: (d.repo && infosRepo(d.repo)) || undefined };
	if (d.type === "tuto") return donneesPost({ ...base, tuto: lectureTuto(d.fichiers ?? PROPOSES_DEMO) });
	if (d.type === "coulisses" || d.type === "lecon") {
		const commits: DetailsCommit[] = (d.commits ?? []).map((sha) => ({ sha, message: "", date: "2026-10-27", fichiers: [] }));
		return donneesPost({ ...base, commits });
	}
	if (d.type === "presentation") return donneesPost({ ...base, domaines: ["scanner-ssl.example"], pub: null });
	return donneesPost({ ...base, depuis: "2026-10-22", activite: ACTIVITE_DEMO.repos });
}

export function installerDemo() {
	const fetchReel = window.fetch.bind(window);
	window.fetch = async (entree, init) => {
		const url = new URL(typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url, location.href);
		if (url.origin !== location.origin) return fetchReel(entree, init);
		const chemin = url.pathname;
		if (chemin.startsWith("/api/moi")) return reponse(MOI_DEMO);
		if (chemin.startsWith("/api/activite")) return reponse(ACTIVITE_DEMO);
		if (chemin === "/api/repos") return reponse(REPOS_DEMO);
		if (chemin === "/api/domaines") return reponse([{ hote: "scanner-ssl.example", verifie: "2026-10-20" }]);
		if (chemin === "/api/pubs") return reponse([]);
		if (chemin === "/api/style") return reponse(styleDemo);
		if (chemin === "/api/posts/donnees") {
			await pause(350);
			return reponse(donneesDemo(JSON.parse(String(init?.body ?? "{}")) as DemandePost));
		}
		const commits = /^\/api\/repos\/([^/]+)\/commits$/.exec(chemin);
		if (commits) {
			await pause(300);
			return reponse(commitsDemo(decodeURIComponent(commits[1]), Number(url.searchParams.get("jours")) || 30));
		}
		const tuto = /^\/api\/repos\/([^/]+)\/fichiers-tuto$/.exec(chemin);
		if (tuto) {
			await pause(300);
			return reponse({
				branche: "main",
				arborescence: ARBORESCENCE_DEMO,
				arborescenceTronquee: false,
				proposes: PROPOSES_DEMO,
				ecartes: { generes: 4, secrets: 1, binaires: 2, trop_gros: 0, refuses: 0 },
			});
		}
		const un = /^\/api\/repos\/([^/]+)$/.exec(chemin);
		if (un) {
			const infos = infosRepo(decodeURIComponent(un[1]));
			return infos ? reponse({ ...infos, langages: ["TypeScript"], etoiles: 3 }) : reponse({ erreur: "Repo introuvable ou privé : Weekli ne lit que les repos publics." }, 404);
		}
		if (chemin.startsWith("/api/repos/")) {
			const sha = decodeURIComponent(chemin.split("/commits/")[1] ?? "");
			return reponse({ sha, message: "", date: "", fichiers: [] });
		}
		if (chemin.startsWith("/api/brouillons")) return reponse([], init?.method === "POST" ? 201 : 200);
		if (chemin.startsWith("/auth/logout")) return reponse(null, 204);
		return fetchReel(entree, init);
	};
}

async function diffuser(cibles: Post[], surProgression: (posts: Post[]) => void, signal: AbortSignal) {
	const courant: Post[] = [];
	for (const cible of cibles) {
		courant.push({ ...cible, texte: "" });
		for (let i = 0; i < cible.texte.length; i += 14) {
			courant[courant.length - 1] = { ...cible, texte: cible.texte.slice(0, i + 14) };
			surProgression(courant.map((p) => ({ ...p })));
			await pause(16, signal);
		}
	}
}

// Meme contrat que genererPostParType : sans notes, Claude pose d'abord sa question (sauf pour la semaine)
export async function genererPostParTypeDemo({ donnees, notes, surProgression, signal }: ParamsPostParType): Promise<ResultatPostParType> {
	const type: TypePost = donnees.type;
	await pause(500, signal);
	if (!notes.trim() && QUESTIONS_DEMO[type]) return { posts: [], question: QUESTIONS_DEMO[type] };
	const cibles = POSTS_PAR_TYPE[type];
	await diffuser(cibles, surProgression, signal);
	return { posts: cibles, question: "" };
}

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
	await diffuser(cibles, surProgression, signal);
	return cibles;
}
