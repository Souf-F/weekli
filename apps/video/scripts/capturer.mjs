#!/usr/bin/env node
// Capture une page web pour l'integrer dans une video (scene "capture").
// Usage : node scripts/capturer.mjs <projet> <nom> <url> [largeur] [hauteur]
// Sortie : public/projets/<projet>/captures/<nom>.png, a citer dans le script comme "projets/<projet>/captures/<nom>.png"
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ici = path.dirname(fileURLToPath(import.meta.url));
const [, , projet, nom, url, largeur = "1440", hauteur = "1800"] = process.argv;
if (!projet || !nom || !url) {
	console.error("Usage : node scripts/capturer.mjs <projet> <nom> <url> [largeur] [hauteur]");
	process.exit(1);
}

const dossier = path.join(ici, "..", "public", "projets", projet, "captures");
mkdirSync(dossier, { recursive: true });

// Chrome installe sur la machine : aucun navigateur a telecharger
const navigateur = await chromium.launch({ channel: "chrome" });
const page = await navigateur.newPage({ viewport: { width: Number(largeur), height: Number(hauteur) }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500); // animations d'entree et fond WebGL
const fichier = path.join(dossier, `${nom}.png`);
await page.screenshot({ path: fichier });
await navigateur.close();
console.log(`projets/${projet}/captures/${nom}.png`);
