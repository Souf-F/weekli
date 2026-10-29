import type { Octokit } from "octokit";
import { describe, expect, it, vi } from "vitest";
import { MAX_FICHIERS_TUTO } from "./demande";
import { LIMITES_TUTO, lireRepoPourTuto, proposerFichiersTuto, scoreFichierTuto } from "./tuto";

type Noeud = { path: string; size?: number; type?: string };

function faux(noeuds: Noeud[], contenus: Record<string, string> = {}, opts: { prive?: boolean; readme?: string } = {}) {
	const getContent = vi.fn(async ({ path }: { path: string }) => {
		if (!(path in contenus)) throw new Error("404");
		return { data: contenus[path] };
	});
	const octokit = {
		rest: {
			repos: {
				get: vi.fn(async () => ({ data: { private: opts.prive ?? false, default_branch: "main" } })),
				getReadme: vi.fn(async () => {
					if (opts.readme === undefined) throw new Error("404");
					return { data: opts.readme };
				}),
				getContent,
			},
			git: {
				getTree: vi.fn(async () => ({
					data: { truncated: false, tree: noeuds.map((n) => ({ type: "blob", size: 100, ...n })) },
				})),
			},
		},
	} as unknown as Octokit;
	return { octokit, getContent };
}

const arbre: Noeud[] = [
	{ path: "README.md" },
	{ path: "package.json" },
	{ path: "src/index.ts" },
	{ path: "src/lib/outil.ts" },
	{ path: "src/lib/outil.test.ts" },
	{ path: "docs/guide.md" },
	{ path: "package-lock.json" },
	{ path: "dist/app.js" },
	{ path: "node_modules/x/index.js" },
	{ path: ".env" },
	{ path: "config/prod.pem" },
	{ path: "logo.png" },
	{ path: "gros.ts", size: 500_000 },
	{ path: "src", type: "tree" },
];

describe("proposerFichiersTuto", () => {
	it("classe les fichiers par interet et compte ceux qu'il ecarte", async () => {
		const { octokit, getContent } = faux(arbre);
		const r = await proposerFichiersTuto(octokit, "u", "p");
		expect(r.branche).toBe("main");
		expect(r.proposes).toEqual(["package.json", "src/index.ts", "docs/guide.md", "src/lib/outil.ts", "src/lib/outil.test.ts"]);
		expect(r.ecartes).toEqual({ generes: 3, secrets: 2, binaires: 1, trop_gros: 1, refuses: 0 });
		expect(r.arborescence).not.toContain(".env");
		expect(r.arborescence).not.toContain("config/prod.pem");
		expect(getContent).not.toHaveBeenCalled();
	});

	it("refuse un repo prive", async () => {
		const { octokit } = faux(arbre, {}, { prive: true });
		await expect(proposerFichiersTuto(octokit, "u", "p")).rejects.toThrow(/prive/);
	});

	it("garde les exemples d'environnement mais pas les vrais fichiers .env", async () => {
		const { octokit } = faux([{ path: ".env.example" }, { path: ".env.local" }, { path: ".dev.vars" }, { path: "src/id_rsa" }]);
		const r = await proposerFichiersTuto(octokit, "u", "p");
		expect(r.arborescence).toEqual([".env.example"]);
		expect(r.ecartes.secrets).toBe(3);
	});
});

describe("lireRepoPourTuto", () => {
	it("lit les fichiers proposes, masque les jetons et passe tout dans des champs a ranger en non fiable", async () => {
		const jeton = `ghp_${"a".repeat(36)}`;
		const { octokit } = faux(
			arbre,
			{ "package.json": `{"token":"${jeton}"}`, "src/index.ts": "export {}", "docs/guide.md": "# Guide" },
			{ readme: `# Projet ${jeton}` },
		);
		const r = await lireRepoPourTuto(octokit, "u", "p");
		expect(r.fichiers.map((f) => f.chemin)).toEqual(["package.json", "src/index.ts", "docs/guide.md"]);
		expect(JSON.stringify(r)).not.toContain(jeton);
		expect(r.fichiers[0].contenu).toContain("[secret masque]");
		expect(r.readme).toContain("[secret masque]");
	});

	it("plafonne chaque fichier, le total et le nombre de fichiers", async () => {
		const noeuds = Array.from({ length: 30 }, (_, i) => ({ path: `src/m${i}.ts` }));
		const contenus = Object.fromEntries(noeuds.map((n) => [n.path, "x".repeat(10_000)]));
		const { octokit } = faux(noeuds, contenus, { readme: "r".repeat(20_000) });
		const r = await lireRepoPourTuto(octokit, "u", "p");
		expect(r.fichiers).toHaveLength(LIMITES_TUTO.caracteresTotal / LIMITES_TUTO.caracteresFichier);
		expect(r.fichiers.every((f) => f.contenu.length <= LIMITES_TUTO.caracteresFichier && f.tronque)).toBe(true);
		expect(r.fichiers.reduce((t, f) => t + f.contenu.length, 0)).toBeLessThanOrEqual(LIMITES_TUTO.caracteresTotal);
		expect(r.readme).toHaveLength(LIMITES_TUTO.caracteresReadme);
	});

	it("ne lit jamais plus de 12 fichiers, meme petits", async () => {
		const noeuds = Array.from({ length: 30 }, (_, i) => ({ path: `src/m${i}.ts` }));
		const contenus = Object.fromEntries(noeuds.map((n) => [n.path, "x"]));
		const { octokit, getContent } = faux(noeuds, contenus);
		const r = await lireRepoPourTuto(octokit, "u", "p");
		expect(r.fichiers).toHaveLength(MAX_FICHIERS_TUTO);
		expect(getContent).toHaveBeenCalledTimes(MAX_FICHIERS_TUTO);
	});

	it("respecte les fichiers choisis mais refuse secrets, generes et inconnus", async () => {
		const { octokit, getContent } = faux(arbre, { "src/lib/outil.ts": "ok", ".env": "SECRET=1", "package-lock.json": "{}" });
		const r = await lireRepoPourTuto(octokit, "u", "p", ["src/lib/outil.ts", ".env", "package-lock.json", "absent.ts", "src/lib/outil.ts"]);
		expect(r.fichiers.map((f) => f.chemin)).toEqual(["src/lib/outil.ts"]);
		expect(r.ecartes.refuses).toBe(3);
		expect(getContent).toHaveBeenCalledTimes(1);
	});

	it("ignore un contenu binaire et un fichier illisible, sans echouer", async () => {
		const { octokit } = faux(
			[{ path: "src/a.ts" }, { path: "src/b.ts" }, { path: "src/c.ts" }],
			{ "src/a.ts": `ab${String.fromCharCode(0)}cd`, "src/c.ts": "ok" },
		);
		const r = await lireRepoPourTuto(octokit, "u", "p");
		expect(r.fichiers.map((f) => f.chemin)).toEqual(["src/c.ts"]);
		expect(r.ecartes.binaires).toBe(1);
	});

	it("supporte un repo sans README", async () => {
		const { octokit } = faux([{ path: "main.py" }], { "main.py": "print(1)" });
		expect((await lireRepoPourTuto(octokit, "u", "p")).readme).toBe("");
	});
});

describe("scoreFichierTuto", () => {
	it("classe manifeste racine, entree, docs, source, test", () => {
		const s = scoreFichierTuto;
		expect(s("package.json")).toBeGreaterThan(s("src/index.ts"));
		expect(s("src/index.ts")).toBeGreaterThan(s("docs/a.md"));
		expect(s("docs/a.md")).toBeGreaterThan(s("src/a.ts"));
		expect(s("src/a.ts")).toBeGreaterThan(s("src/a.test.ts"));
		expect(s("src/a/b/c/d/e/f.ts")).toBeLessThan(s("src/a.ts"));
		expect(s("LICENSE")).toBe(0);
	});
});
