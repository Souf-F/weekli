// Prepare le modele vocal servi par Weekli (ADR-08) dans apps/web/public/modeles/kokoro/ :
// telecharge les deux fichiers Kokoro a la revision epinglee, verifie leurs SHA-256, puis laisse
// le script de la voix les decouper en morceaux de 20 Mio et ecrire le manifeste.
// Ne fait rien si le dossier est deja complet et valide. Usage : node scripts/modeles-voix.mjs
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { REVISION, SOURCES } from "../apps/web/src/lib/voix/outils/preparer-modeles.mjs";

const DEPOT = "onnx-community/Kokoro-82M-v1.0-ONNX";
const PREPARER = fileURLToPath(new URL("../apps/web/src/lib/voix/outils/preparer-modeles.mjs", import.meta.url));
const SORTIE = fileURLToPath(new URL("../apps/web/public/modeles/kokoro/", import.meta.url));

const sha256 = (donnees) => createHash("sha256").update(donnees).digest("hex");

/** Vrai si le manifeste correspond a la revision et aux empreintes epinglees et si chaque morceau est intact. */
async function dejaPret() {
	try {
		const manifeste = JSON.parse(await readFile(join(SORTIE, "manifeste.json"), "utf8"));
		if (manifeste.revision !== REVISION) return false;
		const attendus = {
			modele: SOURCES.modele.sha256,
			voix: SOURCES.voix.sha256,
			espeak: manifeste.espeak?.sha256,
		};
		for (const [role, empreinte] of Object.entries(attendus)) {
			const fichier = manifeste[role];
			if (!fichier || fichier.sha256 !== empreinte) return false;
			const morceaux = await Promise.all(fichier.morceaux.map((m) => readFile(join(SORTIE, m.chemin))));
			if (morceaux.some((m, i) => m.length !== fichier.morceaux[i].taille)) return false;
			if (sha256(Buffer.concat(morceaux)) !== fichier.sha256) return false;
		}
		return true;
	} catch {
		return false;
	}
}

async function telecharger({ depot, fichier, sha256: attendu }, dossier) {
	const reponse = await fetch(`https://huggingface.co/${DEPOT}/resolve/${REVISION}/${depot}`);
	if (!reponse.ok || !reponse.body) throw new Error(`Telechargement de ${fichier} impossible (HTTP ${reponse.status})`);
	const empreinte = createHash("sha256");
	const flux = Readable.fromWeb(reponse.body);
	flux.on("data", (morceau) => empreinte.update(morceau));
	await pipeline(flux, createWriteStream(join(dossier, fichier)));
	if (empreinte.digest("hex") !== attendu) throw new Error(`Empreinte inattendue pour ${fichier}, fichier rejete`);
}

async function main() {
	if (await dejaPret()) {
		console.log("Modele vocal deja present et valide, rien a telecharger.");
		return;
	}
	const dossier = await mkdtemp(join(tmpdir(), "weekli-modeles-"));
	try {
		for (const source of Object.values(SOURCES)) {
			console.log(`Telechargement de ${source.fichier}...`);
			await telecharger(source, dossier);
		}
		const { status } = spawnSync(process.execPath, [PREPARER, dossier], { stdio: "inherit" });
		if (status !== 0) throw new Error("Preparation du modele vocal en echec");
	} finally {
		await rm(dossier, { recursive: true, force: true });
	}
}

main().catch((erreur) => {
	console.error(erreur.message);
	process.exit(1);
});
