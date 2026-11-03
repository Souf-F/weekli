#!/usr/bin/env node
// Active les hooks versionnes de .githooks/ (script npm `prepare`, lance par `npm install`).
// Sans effet hors d'un depot Git (image Docker, archive) : l'installation ne doit jamais echouer ici.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".git")) {
	try {
		execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
		console.log("Hooks Git actives (.githooks : anti-secrets au commit et au push).");
	} catch {
		console.warn("Hooks Git non actives : lance `git config core.hooksPath .githooks` a la main.");
	}
}
