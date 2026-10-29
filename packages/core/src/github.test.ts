import type { Octokit } from "octokit";
import { describe, expect, it, vi } from "vitest";
import { commitsRepo, listerRepos } from "./github";

type Brut = { name: string; fork?: boolean; description?: string | null; homepage?: string | null; pushed_at?: string | null };

function faux(repos: Brut[]) {
	const liste = vi.fn(async () => ({
		data: repos.map((r) => ({ html_url: `https://github.com/u/${r.name}`, updated_at: "2020-01-01T00:00:00Z", ...r })),
	}));
	return { octokit: { rest: { repos: { listForAuthenticatedUser: liste } } } as unknown as Octokit, liste };
}

describe("listerRepos", () => {
	it("demande les repos publics dont l'utilisateur est proprietaire, sans rien d'autre", async () => {
		const { octokit, liste } = faux([]);
		await listerRepos(octokit);
		expect(liste).toHaveBeenCalledWith(expect.objectContaining({ affiliation: "owner", visibility: "public" }));
	});

	it("retire les forks, trie par maj decroissante et complete les champs vides", async () => {
		const { octokit } = faux([
			{ name: "vieux", pushed_at: "2026-01-01T00:00:00Z", description: "Ancien", homepage: "https://vieux.dev" },
			{ name: "copie", fork: true, pushed_at: "2026-12-01T00:00:00Z" },
			{ name: "recent", pushed_at: "2026-10-20T18:02:11Z", description: null, homepage: null },
		]);
		expect(await listerRepos(octokit)).toEqual([
			{ repo: "recent", description: "", site: "", url: "https://github.com/u/recent", maj: "2026-10-20T18:02:11Z" },
			{ repo: "vieux", description: "Ancien", site: "https://vieux.dev", url: "https://github.com/u/vieux", maj: "2026-01-01T00:00:00Z" },
		]);
	});

	it("se rabat sur updated_at sans pushed_at et plafonne a 30 repos", async () => {
		const { octokit } = faux([
			{ name: "sans-push", pushed_at: null },
			...Array.from({ length: 40 }, (_, i) => ({ name: `r${i}`, pushed_at: `2026-02-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z` })),
		]);
		const repos = await listerRepos(octokit);
		expect(repos).toHaveLength(30);
		expect(repos.map((r) => r.maj)).toEqual([...repos.map((r) => r.maj)].sort().reverse());
		expect(repos.some((r) => r.repo === "sans-push")).toBe(false);
	});
});

describe("commitsRepo", () => {
	it("retire le bruit et les doublons, garde l'ordre et lit les commits de l'utilisateur", async () => {
		const listCommits = vi.fn(async () => ({
			data: [
				{ sha: "aaaaaaaa1", commit: { message: "feat: ajoute le tri\n\ncorps", author: { date: "2026-10-20T10:00:00Z" } } },
				{ sha: "bbbbbbbb2", commit: { message: "Merge branch main", author: { date: "2026-10-19T10:00:00Z" } } },
				{ sha: "cccccccc3", commit: { message: "feat: ajoute le tri", author: { date: "2026-10-18T10:00:00Z" } } },
				{ sha: "dddddddd4", commit: { message: "fix: corrige le fuseau", author: null } },
			],
		}));
		const octokit = { rest: { repos: { listCommits } } } as unknown as Octokit;
		expect(await commitsRepo(octokit, "u", "r", 14)).toEqual([
			{ sha: "aaaaaaa", message: "feat: ajoute le tri", date: "2026-10-20" },
			{ sha: "ddddddd", message: "fix: corrige le fuseau", date: "" },
		]);
		expect(listCommits).toHaveBeenCalledWith(expect.objectContaining({ owner: "u", repo: "r", author: "u" }));
	});
});
