// Prépare les fichiers vocaux servis par Weekli dans public/modeles/kokoro/ (ADR-08) :
// vérifie les fichiers Kokoro téléchargés, les découpe en morceaux de 20 Mo, extrait d'espeak-ng
// les seules données utiles (français, anglais pour les mots étrangers) et écrit manifeste.json.
// Usage : node src/lib/voix/outils/preparer-modeles.mjs <dossier contenant model_quantized.onnx et ff_siwis.bin>
// Le téléchargement à révision épinglée est l'affaire de scripts/modeles-voix.mjs (tâche B12).
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
export const SOURCES = {
	modele: { fichier: "model_quantized.onnx", depot: "onnx/model_quantized.onnx", sha256: "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478" },
	voix: { fichier: "ff_siwis.bin", depot: "voices/ff_siwis.bin", sha256: "a35f5675ad08948e326ae75fd0ea16ba5d0042e4f76b5f3d1df77d0a48c54861" },
};
const TAILLE_MORCEAU = 20 * 1024 * 1024;
const LANGUES_GARDEES = ["fr_dict", "en_dict"];

const ici = dirname(fileURLToPath(import.meta.url));
const sortie = resolve(ici, "../../../../public/modeles/kokoro");
const require = createRequire(import.meta.url);

const sha256 = (donnees) => createHash("sha256").update(donnees).digest("hex");

async function decouper(nom, donnees) {
	const morceaux = [];
	for (let debut = 0, i = 0; debut < donnees.length; debut += TAILLE_MORCEAU, i++) {
		const chemin = `${nom}.${String(i).padStart(3, "0")}`;
		const morceau = donnees.subarray(debut, debut + TAILLE_MORCEAU);
		await writeFile(join(sortie, chemin), morceau);
		morceaux.push({ chemin, taille: morceau.length });
	}
	return { taille: donnees.length, sha256: sha256(donnees), morceaux };
}

/** Plages [début, longueur] des fichiers espeak-ng gardés, fusionnées quand elles se suivent. */
export function plagesEspeak(scriptModule) {
	const trouve = scriptModule.match(/loadPackage\(\{files:(\[.*?\]),remote_package_size:(\d+)\}\)/);
	if (!trouve) throw new Error("Métadonnées du paquet espeak-ng introuvables");
	const fichiers = JSON.parse(trouve[1].replace(/(filename|start|end):/g, '"$1":'));
	const gardes = fichiers.filter((f) => !f.filename.endsWith("_dict") || LANGUES_GARDEES.some((l) => f.filename.endsWith(`/${l}`)));
	const plages = [];
	for (const f of gardes.sort((a, b) => a.start - b.start)) {
		const derniere = plages.at(-1);
		if (derniere && derniere[0] + derniere[1] === f.start) derniere[1] += f.end - f.start;
		else plages.push([f.start, f.end - f.start]);
	}
	return { plages, tailleComplete: Number(trouve[2]) };
}

async function preparerEspeak() {
	const racine = dirname(require.resolve("@echogarden/espeak-ng-emscripten/package.json"));
	const script = await readFile(join(racine, "espeak-ng.js"), "utf8");
	const paquet = await readFile(join(racine, "espeak-ng.data"));
	const { plages, tailleComplete } = plagesEspeak(script);
	if (paquet.length !== tailleComplete) throw new Error("Paquet espeak-ng inattendu : vérifier la version épinglée");
	const compact = Buffer.concat(plages.map(([debut, longueur]) => paquet.subarray(debut, debut + longueur)));
	return { ...(await decouper("espeak-fr.data", compact)), tailleComplete, plages };
}

async function main() {
	const source = process.argv[2];
	if (!source) throw new Error("Indiquer le dossier des fichiers téléchargés");
	await rm(sortie, { recursive: true, force: true });
	await mkdir(sortie, { recursive: true });
	const fichiers = {};
	for (const [role, { fichier, sha256: attendu }] of Object.entries(SOURCES)) {
		const donnees = await readFile(join(resolve(source), fichier));
		if (sha256(donnees) !== attendu) throw new Error(`Empreinte inattendue pour ${fichier}`);
		fichiers[role] = await decouper(fichier, donnees);
	}
	const manifeste = { version: 1, revision: REVISION, ...fichiers, espeak: await preparerEspeak() };
	await writeFile(join(sortie, "manifeste.json"), `${JSON.stringify(manifeste, null, "\t")}\n`);
	const total = [manifeste.modele, manifeste.voix, manifeste.espeak].reduce((s, f) => s + f.taille, 0);
	console.log(`Fichiers vocaux prêts dans ${sortie} (${(total / 1e6).toFixed(1)} Mo)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((erreur) => {
		console.error(erreur.message);
		process.exit(1);
	});
}
