import { Octokit } from "octokit";
import { type ActiviteRepo, filtrerActivite } from "./filtre";

const TAILLE_README = 6000;
const TAILLE_PATCH = 1500;
const MAX_FICHIERS = 15;

// Activite filtree de l'utilisateur sur ses repos publics depuis `jours`
export async function activiteGithub(octokit: Octokit, login: string, jours: number) {
	const depuis = new Date(Date.now() - jours * 86_400_000);

	const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
		affiliation: "owner",
		visibility: "public",
		sort: "pushed",
		per_page: 50,
	});

	const actifs = repos.filter((r) => !r.fork && r.pushed_at && new Date(r.pushed_at) >= depuis);

	const activite = await Promise.all(
		actifs.map(async (r): Promise<ActiviteRepo> => {
			const commits = await octokit.rest.repos
				.listCommits({ owner: r.owner.login, repo: r.name, author: login, since: depuis.toISOString(), per_page: 100 })
				.then((res) => res.data)
				.catch(() => []); // repo vide : GitHub repond 409

			return {
				repo: r.name,
				description: r.description ?? "",
				langage: r.language ?? "",
				url: r.html_url,
				site: r.homepage ?? "",
				commits: commits.map((c) => ({
					sha: c.sha.slice(0, 7),
					message: c.commit.message.split("\n")[0],
					date: c.commit.author?.date?.slice(0, 10) ?? "",
				})),
			};
		}),
	);

	return { depuis: depuis.toISOString().slice(0, 10), repos: filtrerActivite(activite) };
}

// Contexte complet d'un repo : description, site, sujets, langages et README
export async function detailsRepo(octokit: Octokit, login: string, repo: string) {
	const [{ data: infos }, { data: langages }, readme] = await Promise.all([
		octokit.rest.repos.get({ owner: login, repo }),
		octokit.rest.repos.listLanguages({ owner: login, repo }),
		octokit.rest.repos
			.getReadme({ owner: login, repo, mediaType: { format: "raw" } })
			.then((res) => String(res.data))
			.catch(() => ""),
	]);

	if (infos.private) throw new Error("Ce repo est prive : Weekli ne lit que les repos publics.");

	return {
		repo: infos.name,
		description: infos.description ?? "",
		site: infos.homepage ?? "",
		url: infos.html_url,
		sujets: infos.topics ?? [],
		langages: Object.keys(langages),
		etoiles: infos.stargazers_count,
		readme: readme.slice(0, TAILLE_README),
	};
}

// Detail d'un commit : message complet et extraits du diff, pour raconter un probleme resolu
export async function detailsCommit(octokit: Octokit, login: string, repo: string, sha: string) {
	const { data } = await octokit.rest.repos.getCommit({ owner: login, repo, ref: sha });

	return {
		sha: data.sha.slice(0, 7),
		message: data.commit.message,
		date: data.commit.author?.date?.slice(0, 10) ?? "",
		stats: data.stats,
		fichiers: (data.files ?? []).slice(0, MAX_FICHIERS).map((f) => ({
			nom: f.filename,
			statut: f.status,
			ajouts: f.additions,
			suppressions: f.deletions,
			extrait: f.patch?.slice(0, TAILLE_PATCH) ?? "",
		})),
	};
}
