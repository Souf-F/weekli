#!/usr/bin/env node
// Collecte ce qu'il faut pour ecrire la pub d'un projet : README, docs, stack. Aucun historique de commits.
// A n'utiliser que sur un depot de confiance : son contenu est lu puis relu par Claude.
// Usage : node scripts/collecter.mjs <chemin-du-repo> [nom]
// Sortie : projets/<nom>/donnees.json (lu ensuite pour ecrire les scripts video)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exigerNom } from "./validation.mjs";

const ici = path.dirname(fileURLToPath(import.meta.url));
const [, , cheminRepo = ".", nomForce] = process.argv;
const repo = path.resolve(cheminRepo);
const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

if (!existsSync(path.join(repo, ".git"))) {
	console.error(`Pas un depot Git : ${repo}`);
	process.exit(1);
}

const IGNORES = new Set(["node_modules", ".git", "dist", ".wrangler", "coverage", ".next", "build", "sorties", "public"]);

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

// Dependances declarees : un bon resume de la stack
function stack() {
	const deps = new Set();
	for (const f of git("ls-files").split("\n").filter((f) => f.endsWith("package.json") && !f.includes("node_modules"))) {
		const pkg = JSON.parse(readFileSync(path.join(repo, f), "utf8"));
		for (const d of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) deps.add(d);
	}
	return [...deps].sort();
}

const nom = exigerNom(nomForce ?? path.basename(repo).toLowerCase(), "Nom du projet");
const donnees = {
	projet: nom,
	depot: git("remote", "get-url", "origin").trim().replace(/\.git$/, "").replace(/^git@github\.com:/, "https://github.com/"),
	stack: stack(),
	documents: documents(),
};

const sortie = path.join(ici, "..", "projets", nom);
mkdirSync(sortie, { recursive: true });
writeFileSync(path.join(sortie, "donnees.json"), JSON.stringify(donnees, null, 2));
console.log(`${nom} : ${donnees.documents.length} documents, ${donnees.stack.length} dependances -> projets/${nom}/donnees.json`);
