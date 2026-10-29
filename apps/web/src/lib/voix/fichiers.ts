// Téléchargement des fichiers vocaux servis par Weekli (ADR-08) : morceaux de moins de 25 Mo recollés,
// empreinte SHA-256 vérifiée avant usage, puis mise en cache IndexedDB.
import { ecrireCache, lireCache } from "./cache";

export interface Morceau {
	chemin: string;
	taille: number;
}

export interface FichierManifeste {
	taille: number;
	sha256: string;
	morceaux: Morceau[];
}

export interface Manifeste {
	version: 1;
	/** Révision Hugging Face épinglée du modèle (onnx-community/Kokoro-82M-v1.0-ONNX). */
	revision: string;
	modele: FichierManifeste;
	voix: FichierManifeste;
	/**
	 * Données espeak-ng réduites au français et à l'anglais : `plages` donne, pour chaque bloc gardé,
	 * sa position dans le paquet complet de `@echogarden/espeak-ng-emscripten` (taille `tailleComplete`).
	 */
	espeak: FichierManifeste & { tailleComplete: number; plages: [number, number][] };
}

export type Role = "modele" | "voix" | "espeak";

export interface Progression {
	role: Role;
	recu: number;
	total: number;
	depuisCache: boolean;
}

const CHEMIN_MANIFESTE = "/modeles/kokoro/manifeste.json";

export async function lireManifeste(): Promise<Manifeste> {
	const reponse = await fetch(CHEMIN_MANIFESTE, { cache: "no-cache" });
	if (!reponse.ok) throw new Error(`Manifeste du modèle vocal introuvable (${reponse.status})`);
	const manifeste = (await reponse.json()) as Manifeste;
	if (manifeste.version !== 1) throw new Error("Version de manifeste inconnue");
	return manifeste;
}

async function empreinte(donnees: Uint8Array<ArrayBuffer>): Promise<string> {
	const hash = await crypto.subtle.digest("SHA-256", donnees);
	return Array.from(new Uint8Array(hash), (o) => o.toString(16).padStart(2, "0")).join("");
}

async function telecharger(fichier: FichierManifeste, surRecu: (recu: number) => void): Promise<Uint8Array<ArrayBuffer>> {
	const sortie = new Uint8Array(fichier.taille);
	let position = 0;
	for (const morceau of fichier.morceaux) {
		const reponse = await fetch(new URL(morceau.chemin, new URL(CHEMIN_MANIFESTE, self.location.href)));
		if (!reponse.ok || !reponse.body) throw new Error(`Téléchargement impossible : ${morceau.chemin} (${reponse.status})`);
		const lecteur = reponse.body.getReader();
		for (;;) {
			const { done, value } = await lecteur.read();
			if (done) break;
			if (position + value.length > sortie.length) throw new Error(`Fichier plus gros que prévu : ${morceau.chemin}`);
			sortie.set(value, position);
			position += value.length;
			surRecu(position);
		}
	}
	if (position !== fichier.taille) throw new Error("Fichier incomplet");
	return sortie;
}

/** Fichier vérifié, depuis le cache si possible. */
export async function obtenirFichier(
	role: Role,
	fichier: FichierManifeste,
	surProgression: (p: Progression) => void,
): Promise<Uint8Array<ArrayBuffer>> {
	const enCache = await lireCache(role, fichier.sha256).catch(() => null);
	if (enCache) {
		surProgression({ role, recu: fichier.taille, total: fichier.taille, depuisCache: true });
		return new Uint8Array(enCache);
	}
	const donnees = await telecharger(fichier, (recu) => surProgression({ role, recu, total: fichier.taille, depuisCache: false }));
	if ((await empreinte(donnees)) !== fichier.sha256) throw new Error(`Empreinte SHA-256 invalide pour ${role}`);
	// Un cache plein ou refusé (navigation privée) ne doit pas empêcher la synthèse.
	await ecrireCache(role, fichier.sha256, donnees.buffer).catch(() => undefined);
	return donnees;
}
