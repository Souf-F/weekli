#!/usr/bin/env node
// Collecte tout ce qu'il faut pour raconter un projet : historique Git, README, docs, stack.
// Usage : node scripts/collecter.mjs <chemin-du-repo> [nom]
// Sortie : projets/<nom>/donnees.json (lu ensuite pour ecrire les scripts video)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const [, , cheminRepo = ".", nomForce] = process.argv;
const repo = path.resolve(cheminRepo);
const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

if (!existsSync(path.join(repo, ".git"))) {
	console.error(`Pas un depot Git : ${repo}`);
	process.exit(1);
}

// Fichiers generes : ils ne representent pas du travail ecrit et faussent les statistiques
const GENERE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|worker-configuration\.d\.ts)$|(^|\/)dist\//;

const IGNORES = new Set(["node_modules", ".git", "dist", ".wrangler", "coverage", ".next", "build", "sorties", "public"]);

// Historique complet, du plus ancien au plus recent, avec les lignes ajoutees et supprimees (hors fichiers generes)
function historique() {
	const brut = git("log", "--reverse", "--date=short", "--pretty=format:@@%h|%ad|%an|%s", "--numstat");
	return brut
		.split("@@")
		.filter(Boolean)
		.map((bloc) => {
			const [entete, ...lignes] = bloc.trim().split("\n");
			const [sha, date, auteur, ...titre] = entete.split("|");
			const stats = lignes
				.map((l) => l.split("\t"))
				.filter(([a, , f]) => f && a !== "-" && !GENERE.test(f));
			return {
				sha,
				date,
				auteur,
				message: titre.join("|"),
				fichiers: stats.length,
				ajouts: stats.reduce((t, [a]) => t + Number(a), 0),
				suppressions: stats.reduce((t, [, d]) => t + Number(d), 0),
			};
		});
}

// Tous les README et documents, tronques, pour donner le contexte sans exploser la taille
function documents() {
	const docs = [];
	const parcourir = (dossier, profondeur) => {
		if (profondeur > 4) return;
		for (const nom of readdirSync(dossier)) {
			if (IGNORES.has(nom) || nom.startsWith(".")) continue;
			const chemin = path.join(dossier, nom);
			if (statSync(chemin).isDirectory()) parcourir(chemin, profondeur + 1);
			else if (/^readme\.md$/i.test(nom) || (path.basename(dossier) === "docs" && nom.endsWith(".md")) || /^security\.md$/i.test(nom)) {
				docs.push({ fichier: path.relative(repo, chemin), contenu: readFileSync(chemin, "utf8").slice(0, 4000) });
			}
		}
	};
	parcourir(repo, 0);
	return docs;
}

// Langages par nombre de lignes, depuis les fichiers suivis par Git
function langages() {
	const extensions = { ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", mjs: "JavaScript", jsx: "JavaScript", css: "CSS", html: "HTML", py: "Python", go: "Go", rs: "Rust", java: "Java", rb: "Ruby", php: "PHP", sh: "Shell", md: "Markdown" };
	const compte = {};
	for (const f of git("ls-files").split("\n").filter(Boolean)) {
		const langage = extensions[f.split(".").pop()];
		if (!langage || GENERE.test(f)) continue;
		try {
			compte[langage] = (compte[langage] ?? 0) + readFileSync(path.join(repo, f), "utf8").split("\n").length;
		} catch {
			/* fichier supprime ou illisible */
		}
	}
	return Object.entries(compte)
		.sort((a, b) => b[1] - a[1])
		.map(([langage, lignes]) => ({ langage, lignes }));
}

// Dependances declarees : un bon resume de la stack
function stack() {
	const deps = new Set();
	for (const f of git("ls-files").split("\n").filter((f) => f.endsWith("package.json") && !f.includes("node_modules"))) {
		const pkg = JSON.parse(readFileSync(path.join(repo, f), "utf8"));
		for (const d of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) deps.add(d);
	}
	return [...deps].sort();
}

// Arborescence des dossiers principaux (2 niveaux)
function arborescence() {
	const lignes = [];
	for (const n1 of readdirSync(repo).filter((n) => !IGNORES.has(n) && !n.startsWith(".")).sort()) {
		const c1 = path.join(repo, n1);
		if (!statSync(c1).isDirectory()) continue;
		lignes.push(`${n1}/`);
		for (const n2 of readdirSync(c1).filter((n) => !IGNORES.has(n) && !n.startsWith(".")).sort()) {
			if (statSync(path.join(c1, n2)).isDirectory()) lignes.push(`  ${n2}/`);
		}
	}
	return lignes;
}

const commits = historique();
const nom = nomForce ?? path.basename(repo).toLowerCase();
const donnees = {
	projet: nom,
	depot: git("remote", "get-url", "origin").trim().replace(/\.git$/, "").replace(/^git@github\.com:/, "https://github.com/"),
	periode: { debut: commits[0]?.date, fin: commits.at(-1)?.date, commits: commits.length },
	totaux: {
		ajouts: commits.reduce((t, c) => t + c.ajouts, 0),
		suppressions: commits.reduce((t, c) => t + c.suppressions, 0),
		fichiersSuivis: git("ls-files").split("\n").filter(Boolean).length,
	},
	langages: langages(),
	stack: stack(),
	arborescence: arborescence(),
	commits,
	documents: documents(),
};

const sortie = path.join(ici, "..", "projets", nom);
mkdirSync(sortie, { recursive: true });
writeFileSync(path.join(sortie, "donnees.json"), JSON.stringify(donnees, null, 2));
console.log(`${nom} : ${commits.length} commits, ${donnees.documents.length} documents, ${donnees.langages.length} langages -> projets/${nom}/donnees.json`);
