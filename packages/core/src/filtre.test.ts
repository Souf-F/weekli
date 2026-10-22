import { describe, expect, it } from "vitest";
import { estBruit, filtrerActivite, MAX_COMMITS, MAX_REPOS } from "./filtre";
import { estGenere } from "./github";
import type { ActiviteRepo } from "./types";

const repo = (nom: string, messages: string[]): ActiviteRepo => ({
	repo: nom,
	description: "",
	langage: "",
	url: "",
	site: "",
	commits: messages.map((message, i) => ({ sha: String(i), message, date: "" })),
});

describe("estBruit", () => {
	it.each(["Merge branch main", "fix typo", "wip", "chore: deps", "update readme", "Initial commit", "ok"])(
		"ecarte « %s »",
		(m) => expect(estBruit(m)).toBe(true),
	);

	it("garde un vrai message", () => {
		expect(estBruit("Ajout de la verification DMARC")).toBe(false);
	});
});

describe("filtrerActivite", () => {
	it("retire le bruit, les doublons et les repos vides", () => {
		const res = filtrerActivite([
			repo("a", ["Ajout du scanner SSL", "Ajout du scanner SSL", "fix typo"]),
			repo("b", ["Merge branch x"]),
		]);
		expect(res).toHaveLength(1);
		expect(res[0].commits.map((c) => c.message)).toEqual(["Ajout du scanner SSL"]);
	});

	it("trie par activite et plafonne repos et commits", () => {
		const repos = Array.from({ length: 15 }, (_, i) =>
			repo(
				`r${i}`,
				Array.from({ length: i * 5 }, (_, j) => `Fonctionnalite numero ${j}`),
			),
		);
		const res = filtrerActivite(repos);
		expect(res).toHaveLength(MAX_REPOS);
		expect(res[0].repo).toBe("r14");
		expect(res[0].commits).toHaveLength(MAX_COMMITS);
	});
});

describe("estGenere", () => {
	it.each([
		"package-lock.json",
		"apps/web/package-lock.json",
		"yarn.lock",
		"apps/server/worker-configuration.d.ts",
		"apps/web/dist/index.js",
	])("ecarte %s", (f) => expect(estGenere(f)).toBe(true));
	it.each(["src/index.ts", "README.md", "apps/web/src/App.tsx", "distance.ts"])("garde %s", (f) =>
		expect(estGenere(f)).toBe(false),
	);
});
