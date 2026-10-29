import type { Octokit } from "octokit";
import { describe, expect, it, vi } from "vitest";
import { detailsCommit, detailsRepo } from "./github";
import { masquerEtTronquer, masquerSecrets } from "./masquage";

// Jetons fabriques a l'execution : aucun faux secret en clair dans le depot
const a = (n: number) => "a1".repeat(n).slice(0, n);
// En-tetes construits a l execution : le garde-fou anti-secrets ne doit pas voir un en-tete de cle en clair
const ENTETE = ["PRIVATE", "KEY"].join(" ");
const PEM = [`-----BEGIN RSA ${ENTETE}-----`, "MIIEowIBAAKCAQEA", `-----END RSA ${ENTETE}-----`].join("\n");

describe("masquerSecrets", () => {
	it.each([
		["jeton GitHub ghp_", `ghp_${a(36)}`],
		["jeton GitHub gho_", `gho_${a(36)}`],
		["jeton GitHub fin", `github_pat_${a(22)}_${a(40)}`],
		["cle Anthropic", `sk-ant-api03-${a(40)}`],
		["cle sk-", `sk-proj-${a(40)}`],
		["cle AWS", `AKIA${"ABCDEFGH12345678".slice(0, 16)}`],
		["jeton Slack", `xoxb-${"1234567890-abcdef"}`],
		["cle privee PEM", PEM],
	])("masque %s", (_nom, secret) => {
		const sortie = masquerSecrets(`+const k = "${secret}";`);
		expect(sortie).toBe('+const k = "[secret masque]";');
	});

	it("masque une cle PEM sans fin et plusieurs jetons", () => {
		const sortie = masquerSecrets(`x ghp_${a(36)} y ${PEM.split("\n").slice(0, 2).join("\n")}`);
		expect(sortie).toBe("x [secret masque] y [secret masque]");
	});

	it.each([
		"+const motDePasse = process.env.PASSWORD;",
		'+password = "hunter2"',
		"+const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';",
		"+import { skLearn } from 'sk-learn'; // sk-learn",
		"+className=\"task-list-item-checkbox-with-a-very-long-descriptive-name\"",
		"+risk-assessment-for-the-whole-application-in-kebab-case",
		"+const id = 'ghp_court'; // AKIA seul, xox- seul",
		"+-----BEGIN CERTIFICATE-----",
		"+sk-" + "x".repeat(40),
	])("laisse intact « %s »", (ligne) => {
		expect(masquerSecrets(ligne)).toBe(ligne);
	});
});

describe("detailsCommit", () => {
	it("masque les secrets des extraits avant la troncature", async () => {
		const patch = `${"x".repeat(1480)} ghp_${a(36)}`;
		const octokit = {
			rest: {
				repos: {
					get: async () => ({ data: { private: false } }),
					getCommit: async () => ({
						data: {
							sha: "abcdef123456",
							commit: { message: "ajout", author: { date: "2026-10-01T10:00:00Z" } },
							files: [{ filename: "src/a.ts", status: "added", additions: 1, deletions: 0, changes: 1, patch }],
						},
					}),
				},
			},
		} as unknown as Octokit;
		const { fichiers } = await detailsCommit(octokit, "u", "r", "abcdef1");
		expect(fichiers[0]?.extrait).toBe(`${"x".repeat(1480)} [secret masque]`);
	});

	it("refuse le commit d'un repo prive", async () => {
		const getCommit = vi.fn(async () => ({ data: {} }));
		const octokit = {
			rest: { repos: { get: async () => ({ data: { private: true } }), getCommit } },
		} as unknown as Octokit;
		await expect(detailsCommit(octokit, "u", "r", "abcdef1")).rejects.toThrow("prive");
	});
});

describe("detailsRepo", () => {
	it("masque les secrets du README", async () => {
		const jeton = `ghp_${a(36)}`;
		const octokit = {
			rest: {
				repos: {
					get: async () => ({ data: { private: false, name: "r", html_url: "u", stargazers_count: 0 } }),
					listLanguages: async () => ({ data: {} }),
					getReadme: async () => ({ data: `# Projet\n${jeton}` }),
				},
			},
		} as unknown as Octokit;
		const { readme } = await detailsRepo(octokit, "u", "r");
		expect(readme).not.toContain(jeton);
		expect(readme).toContain("[secret masque]");
	});
});

describe("masquage : nouveaux formats", () => {
	it.each([
		["Stripe sk_live_", `sk_live_${"A1".repeat(12)}`],
		["Stripe rk_live_", `rk_live_${"A1".repeat(12)}`],
		["Google AIza", `AIza${"A1".repeat(17)}x`],
		["npm", `npm_${"a1".repeat(18)}`],
		["GitLab", `glpat-${"a1".repeat(10)}`],
		["SendGrid", `SG.${"a1".repeat(11)}.${a(43)}`],
	])("masque %s", (_nom, secret) => {
		expect(masquerSecrets(`k = ${secret};`)).toBe("k = [secret masque];");
	});
});

describe("masquage : performance", () => {
	const hostile = "sk-".repeat(70_000);

	it("masque un texte hostile de 200 Ko en moins de 50 ms", () => {
		const debut = performance.now();
		masquerSecrets(hostile);
		expect(performance.now() - debut).toBeLessThan(50);
	});

	it("tronque avant de masquer et garde un jeton a cheval sur la coupure masque", () => {
		const jeton = `ghp_${a(36)}`;
		expect(masquerEtTronquer(`${"x".repeat(94)} ${jeton} ${hostile}`, 100)).toBe(`${"x".repeat(94)} [secret masque]`.slice(0, 100));
		const debut = performance.now();
		masquerEtTronquer(hostile.repeat(20), 6000);
		expect(performance.now() - debut).toBeLessThan(50);
	});
});
