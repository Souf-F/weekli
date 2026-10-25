import type { Octokit } from "octokit";
import { describe, expect, it } from "vitest";
import { detailsCommit } from "./github";
import { masquerSecrets } from "./masquage";

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
});
