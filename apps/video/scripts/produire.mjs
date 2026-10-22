#!/usr/bin/env node
// Produit une video a partir d'un script : voix off, musique, rendu Remotion, puis controle du fichier.
// Usage : node scripts/produire.mjs <projet> <presentation|histoire> [--voix Thomas] [--debit 185]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { genererImpact, genererMontee, genererMusique, genererTransition } from "./audio.mjs";

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, "..");
const [, , projet, type, ...options] = process.argv;
const option = (nom, defaut) => {
	const i = options.indexOf(`--${nom}`);
	return i >= 0 ? options[i + 1] : defaut;
};
const VOIX = option("voix", "Thomas");
const DEBIT = option("debit", "185");

if (!projet || !["presentation", "histoire"].includes(type)) {
	console.error("Usage : node scripts/produire.mjs <projet> <presentation|histoire>");
	process.exit(1);
}

const cheminScript = path.join(racine, "projets", projet, `${type}.json`);
const script = JSON.parse(readFileSync(cheminScript, "utf8"));
const relatif = `projets/${projet}/${type}`; // dossier dans public/
const dossier = path.join(racine, "public", relatif);
mkdirSync(dossier, { recursive: true });
mkdirSync(path.join(racine, "public", "sfx"), { recursive: true });
mkdirSync(path.join(racine, "sorties"), { recursive: true });

const executer = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }).toString();
const duree = (fichier) => Number(executer("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier]));

// Les sous-titres gardent le texte ecrit ; la voix lit la version phonetique (sigles, noms propres)
function aPrononcer(texte) {
	let t = texte.replace(/\*/g, "");
	for (const [ecrit, dit] of Object.entries(script.prononciation ?? {})) t = t.replaceAll(ecrit, dit);
	return t;
}

// 1. Voix off, phrase par phrase, avec cache : on ne regenere que ce qui a change
console.log(`Voix off (${VOIX}, debit ${DEBIT})...`);
for (const [i, s] of script.segments.entries()) {
	const texte = aPrononcer(s.voix);
	const empreinte = createHash("sha256").update(`${VOIX}|${DEBIT}|${texte}`).digest("hex").slice(0, 12);
	const nom = `voix-${String(i + 1).padStart(2, "0")}-${empreinte}.wav`;
	const sortie = path.join(dossier, nom);
	if (!existsSync(sortie)) {
		const brut = path.join(dossier, "brut.aiff");
		execFileSync("say", ["-v", VOIX, "-r", DEBIT, "-o", brut, texte]);
		// Normalisation du volume (-16 LUFS, la reference des plateformes) et leger adoucissement
		executer("ffmpeg", ["-y", "-v", "error", "-i", brut, "-af", "highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1", sortie]);
	}
	s.audio = `${relatif}/${nom}`;
	s.duree = Math.round(duree(sortie) * 100) / 100;
}

// 2. Musique a la duree exacte de la video, et souffle de transition
const total = script.segments.reduce((t, s) => t + s.duree + 0.7, 0) + 1;
const musique = path.join(dossier, `musique-${script.ambiance}.wav`);
console.log(`Musique ${script.ambiance} (${Math.round(total)} s)...`);
genererMusique(musique, total, script.ambiance);
script.musique = `${relatif}/musique-${script.ambiance}.wav`;
for (const [nom, generer] of [["transition", genererTransition], ["montee", genererMontee], ["impact", genererImpact]]) {
	const fichier = path.join(racine, "public", "sfx", `${nom}.wav`);
	if (!existsSync(fichier)) generer(fichier);
}

// 3. Rendu Remotion avec le script complete (durees et chemins audio)
const props = path.join(dossier, "props.json");
writeFileSync(props, JSON.stringify({ script }));
const composition = type === "presentation" ? "Presentation" : "Histoire";
const video = path.join(racine, "sorties", `${projet}-${type}.mp4`);
console.log(`Rendu ${composition}...`);
execFileSync("npx", ["remotion", "render", "src/index.ts", composition, video, `--props=${props}`, "--log=error"], { cwd: racine, stdio: "inherit" });

// 4. Controle : codec, dimensions, duree, presence de la piste audio
const infos = JSON.parse(executer("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height:format=duration,size", "-of", "json", video]));
const pistes = infos.streams.map((p) => p.codec_type);
console.log(
	JSON.stringify({
		video: path.relative(process.cwd(), video),
		duree: Number(infos.format.duration).toFixed(1),
		taille: `${(Number(infos.format.size) / 1e6).toFixed(1)} Mo`,
		image: infos.streams.find((p) => p.codec_type === "video"),
		audio: pistes.includes("audio"),
	}),
);
if (!pistes.includes("audio")) throw new Error("Piste audio absente");
