// Messages de commit qui ne racontent rien d'interessant pour un post
const BRUIT = [
	/^merge\b/i,
	/^wip\b/i,
	/^(fix )?typos?\b/i,
	/^update readme/i,
	/^(chore|style|format|lint|bump)\b/i,
	/^initial commit$/i,
];

const MAX_REPOS = 10;
const MAX_COMMITS = 30;

export type ActiviteRepo = {
	repo: string;
	description: string;
	langage: string;
	url: string;
	site: string;
	commits: { sha: string; message: string; date: string }[];
};

export function estBruit(message: string): boolean {
	const m = message.trim();
	return m.length < 8 || BRUIT.some((re) => re.test(m));
}

// Retire le bruit, garde les repos les plus actifs et plafonne la taille de la reponse
export function filtrerActivite(repos: ActiviteRepo[]): ActiviteRepo[] {
	return repos
		.map((r) => {
			const vus = new Set<string>();
			const commits = r.commits.filter((c) => {
				if (estBruit(c.message) || vus.has(c.message)) return false;
				vus.add(c.message);
				return true;
			});
			return { ...r, commits };
		})
		.filter((r) => r.commits.length > 0)
		.sort((a, b) => b.commits.length - a.commits.length)
		.slice(0, MAX_REPOS)
		.map((r) => ({ ...r, commits: r.commits.slice(0, MAX_COMMITS) }));
}
