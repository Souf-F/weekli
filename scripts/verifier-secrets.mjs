#!/usr/bin/env node
// Bloque tout commit ou push qui contiendrait un secret ou un fichier sensible.
// Usage : node scripts/verifier-secrets.mjs          (fichiers indexes pour le prochain commit)
//         node scripts/verifier-secrets.mjs --tout   (tous les fichiers suivis, utilise en CI)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FICHIERS_INTERDITS = [/(^|\/)\.dev\.vars$/, /(^|\/)\.env(\.[\w-]+)?$/, /\.(pem|key|p12|pfx)$/i, /(^|\/)id_(rsa|ed25519)$/];
const AUTORISES = [/\.dev\.vars\.example$/, /\.env\.example$/];

const MOTIFS = [
	["Cle API Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/],
	["Token GitHub", /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
	["Cle privee", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
	["Cle AWS", /\bAKIA[0-9A-Z]{16}\b/],
	["Token Cloudflare", /\b(CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/],
	["Secret OAuth GitHub en clair", /GITHUB_CLIENT_SECRET\s*[=:]\s*["']?[0-9a-f]{40}\b/],
];

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const tout = process.argv.includes("--tout");
const fichiers = (tout ? git("ls-files") : git("diff", "--cached", "--name-only", "--diff-filter=ACMR"))
	.split("\n")
	.filter(Boolean);

const problemes = [];
for (const f of fichiers) {
	if (FICHIERS_INTERDITS.some((re) => re.test(f)) && !AUTORISES.some((re) => re.test(f))) {
		problemes.push(`${f} : fichier sensible, il ne doit jamais etre commite`);
		continue;
	}
	let contenu;
	try {
		contenu = tout ? readFileSync(f, "utf8") : git("show", `:${f}`);
	} catch {
		continue; // fichier binaire ou supprime
	}
	if (contenu.includes("\u0000")) continue;
	for (const [nom, re] of MOTIFS) {
		if (re.test(contenu)) problemes.push(`${f} : ${nom} detecte`);
	}
}

if (problemes.length) {
	console.error("\nSecrets detectes, operation bloquee :\n" + problemes.map((p) => `  - ${p}`).join("\n") + "\n");
	process.exit(1);
}
console.log(`Aucun secret detecte (${fichiers.length} fichiers verifies).`);
