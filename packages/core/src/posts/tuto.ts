import type { Octokit } from "octokit";
import { estGenere } from "../github";
import { masquerSecrets } from "../masquage";
import { MAX_FICHIERS_TUTO } from "./demande";
import type { EcartsTuto, FichierTuto, LectureTuto } from "./types";

export const LIMITES_TUTO = {
	fichiers: MAX_FICHIERS_TUTO,
	caracteresFichier: 3000,
	caracteresTotal: 24000,
	caracteresReadme: 8000,
	octetsFichier: 100_000,
	cheminsArborescence: 300,
} as const;

const DOSSIERS_EXCLUS =
	/(^|\/)(node_modules|vendor|dist|build|out|coverage|target|__pycache__|\.git|\.next|\.nuxt|\.svelte-kit|\.turbo|\.cache|\.wrangler|\.venv|venv|\.idea|\.vscode)\//;
const GENERES = /\.(min\.(js|css)|map|snap|lock|d\.ts)$|(^|\/)(composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock|go\.sum)$/;
const SECRETS =
	/(^|\/)(\.env(\.(?!example$|sample$|template$)[^/]*)?|\.dev\.vars|\.npmrc|\.netrc|\.pypirc|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|credentials[^/]*|secrets?\.[^/]*|[^/]*\.(pem|key|p12|pfx|keystore|jks|tfstate|tfvars))$/i;
const BINAIRES =
	/\.(png|jpe?g|gif|webp|avif|ico|svg|pdf|zip|gz|tgz|tar|7z|rar|woff2?|ttf|otf|eot|mp3|mp4|wav|webm|mov|ogg|wasm|onnx|bin|exe|dll|so|dylib|db|sqlite3?|psd|fig|sketch)$/i;

const MANIFESTES =
	/^(package\.json|pyproject\.toml|requirements\.txt|Cargo\.toml|go\.mod|composer\.json|Gemfile|pom\.xml|build\.gradle(\.kts)?|deno\.jsonc?|wrangler\.(toml|jsonc?)|Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|Makefile|justfile|vite\.config\.[a-z]+|tsconfig\.json|\.env\.(example|sample|template))$/;
const ENTREES = /^(src\/)?(index|main|app|server|cli|mod|lib)\.[a-z]+$/;
const SOURCES = /\.(tsx?|jsx?|mjs|cjs|py|go|rs|rb|php|java|kt|swift|cs|c|cpp|h|sh|html|css|scss|vue|svelte|md|mdx|ya?ml|toml|json)$/;
const TESTS = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$/;
const README_RACINE = /^readme(\.[a-z]+)?$/i;

type Classe = "ok" | keyof Omit<EcartsTuto, "refuses">;

function classer(chemin: string, taille: number): Classe {
	if (DOSSIERS_EXCLUS.test(chemin) || estGenere(chemin) || GENERES.test(chemin)) return "generes";
	if (SECRETS.test(chemin)) return "secrets";
	if (BINAIRES.test(chemin)) return "binaires";
	if (taille > LIMITES_TUTO.octetsFichier) return "trop_gros";
	return "ok";
}

// Plus le score est haut, plus le fichier aide a comprendre et a expliquer le projet
export function scoreFichierTuto(chemin: string): number {
	const profondeur = chemin.split("/").length - 1;
	let score = 0;
	if (MANIFESTES.test(chemin)) score = profondeur === 0 ? 100 : 55;
	else if (ENTREES.test(chemin)) score = 90;
	else if (/^docs?\/.+\.mdx?$/i.test(chemin)) score = 70;
	else if (/^(examples?|demo|samples?)\//i.test(chemin) && SOURCES.test(chemin)) score = 60;
	else if (SOURCES.test(chemin)) score = 40 - Math.min(profondeur, 4) * 6;
	if (TESTS.test(chemin)) score = Math.min(score, 12);
	return score;
}

type Analyse = {
	branche: string;
	candidats: string[];
	arborescence: string[];
	arborescenceTronquee: boolean;
	proposes: string[];
	ecartes: EcartsTuto;
};

async function analyserRepo(octokit: Octokit, login: string, repo: string): Promise<Analyse> {
	const { data: infos } = await octokit.rest.repos.get({ owner: login, repo });
	if (infos.private) throw new Error("Ce repo est prive : Weekli ne lit que les repos publics.");
	const branche = infos.default_branch;

	const { data: arbre } = await octokit.rest.git.getTree({ owner: login, repo, tree_sha: branche, recursive: "true" });
	const ecartes: EcartsTuto = { generes: 0, secrets: 0, binaires: 0, trop_gros: 0, refuses: 0 };
	const candidats: string[] = [];
	for (const n of arbre.tree) {
		if (n.type !== "blob" || !n.path) continue;
		const classe = classer(n.path, n.size ?? 0);
		if (classe === "ok") candidats.push(n.path);
		else ecartes[classe] += 1;
	}
	candidats.sort();

	const proposes = candidats
		.filter((c) => !README_RACINE.test(c))
		.map((chemin) => ({ chemin, score: scoreFichierTuto(chemin) }))
		.filter((f) => f.score > 0)
		.sort((a, b) => b.score - a.score || a.chemin.length - b.chemin.length || a.chemin.localeCompare(b.chemin))
		.slice(0, LIMITES_TUTO.fichiers)
		.map((f) => f.chemin);

	return {
		branche,
		candidats,
		arborescence: candidats.slice(0, LIMITES_TUTO.cheminsArborescence),
		arborescenceTronquee: Boolean(arbre.truncated) || candidats.length > LIMITES_TUTO.cheminsArborescence,
		proposes,
		ecartes,
	};
}

// Etape 3 de l'interface : ce que Weekli lirait, sans telecharger le moindre fichier
export async function proposerFichiersTuto(octokit: Octokit, login: string, repo: string) {
	const { candidats: _candidats, ...apercu } = await analyserRepo(octokit, login, repo);
	return apercu;
}

// Lecture approfondie pour un mini tuto. Tout ce qui est renvoye vient du repo : contenu non fiable.
// `choisis` (facultatif) remplace la selection automatique ; un chemin absent de l'arbre ou ecarte est refuse.
export async function lireRepoPourTuto(
	octokit: Octokit,
	login: string,
	repo: string,
	choisis?: string[],
): Promise<LectureTuto> {
	const analyse = await analyserRepo(octokit, login, repo);
	const { ecartes } = analyse;

	let retenus = analyse.proposes;
	if (choisis && choisis.length > 0) {
		const permis = new Set(analyse.candidats);
		retenus = [...new Set(choisis)].filter((c) => permis.has(c)).slice(0, LIMITES_TUTO.fichiers);
		ecartes.refuses = new Set(choisis).size - retenus.length;
	}

	const [readme, bruts] = await Promise.all([
		octokit.rest.repos
			.getReadme({ owner: login, repo, mediaType: { format: "raw" } })
			.then((res) => String(res.data))
			.catch(() => ""),
		Promise.all(retenus.map((chemin) => lireFichier(octokit, login, repo, chemin, analyse.branche))),
	]);

	let reste: number = LIMITES_TUTO.caracteresTotal;
	const fichiers: FichierTuto[] = [];
	retenus.forEach((chemin, i) => {
		const texte = bruts[i];
		if (texte === null) return;
		if (texte.includes(String.fromCharCode(0))) {
			ecartes.binaires += 1;
			return;
		}
		if (reste <= 0) return;
		const plafond = Math.min(LIMITES_TUTO.caracteresFichier, reste);
		const propre = masquerSecrets(texte);
		const contenu = propre.slice(0, plafond);
		reste -= contenu.length;
		fichiers.push({ chemin, contenu, tronque: propre.length > contenu.length });
	});

	return {
		branche: analyse.branche,
		arborescence: analyse.arborescence,
		arborescenceTronquee: analyse.arborescenceTronquee,
		proposes: analyse.proposes,
		fichiers,
		readme: masquerSecrets(readme).slice(0, LIMITES_TUTO.caracteresReadme),
		ecartes,
	};
}

async function lireFichier(
	octokit: Octokit,
	login: string,
	repo: string,
	path: string,
	ref: string,
): Promise<string | null> {
	try {
		const { data } = await octokit.rest.repos.getContent({ owner: login, repo, path, ref, mediaType: { format: "raw" } });
		const brut: unknown = data; // le format raw renvoie du texte, les types d'Octokit ne le savent pas
		return typeof brut === "string" ? brut : null;
	} catch {
		return null;
	}
}
