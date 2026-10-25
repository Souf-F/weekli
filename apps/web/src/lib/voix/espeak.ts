// Phonémiseur espeak-ng (GPL-3.0) compilé par Emscripten, exécuté dans le Worker vocal.
import creerModule from "@echogarden/espeak-ng-emscripten";

export interface Phonemiseur {
	/** Phonèmes IPA bruts d'un segment sans ponctuation (format de text_to_phonemes). */
	phonemiser(segment: string): string;
}

/**
 * Reconstitue le paquet de données complet à partir du sous-ensemble français et anglais :
 * le module attend les fichiers à leur position d'origine, les autres langues restent à zéro.
 */
export function reconstituerPaquet(compact: Uint8Array, tailleComplete: number, plages: [number, number][]): ArrayBuffer {
	const paquet = new Uint8Array(tailleComplete);
	let lu = 0;
	for (const [debut, longueur] of plages) {
		paquet.set(compact.subarray(lu, lu + longueur), debut);
		lu += longueur;
	}
	if (lu !== compact.length) throw new Error("Données espeak-ng incohérentes avec le manifeste");
	return paquet.buffer;
}

export async function creerPhonemiseur(paquet: ArrayBuffer): Promise<Phonemiseur> {
	const module = await creerModule({ getPreloadedPackage: () => paquet });
	const travailleur = new module.eSpeakNGWorker();
	if (travailleur.set_voice("fr") !== 0) throw new Error("Voix française d'espeak-ng introuvable");
	const decodeur = new TextDecoder();
	return {
		phonemiser(segment) {
			const { ptr } = travailleur.text_to_phonemes(segment, 1);
			const memoire = module.HEAPU8;
			let fin = ptr;
			while (memoire[fin] !== 0) fin++;
			return decodeur.decode(memoire.subarray(ptr, fin));
		},
	};
}
