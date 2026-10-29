// Types minimaux du portage Emscripten d'espeak-ng (paquet sans déclarations TypeScript).
declare module "@echogarden/espeak-ng-emscripten" {
	interface Pointeur {
		ptr: number;
	}

	export interface TravailleurEspeak {
		set_voice(nom: string): number;
		text_to_phonemes(texte: string, ipa: number): Pointeur;
	}

	export interface ModuleEspeak {
		HEAPU8: Uint8Array;
		eSpeakNGWorker: new () => TravailleurEspeak;
	}

	export interface OptionsModule {
		/** Fournit le paquet de données déjà téléchargé au lieu de le laisser le chercher à côté du script. */
		getPreloadedPackage?: (nom: string, taille: number) => ArrayBuffer;
	}

	const creerModule: (options?: OptionsModule) => Promise<ModuleEspeak>;
	export default creerModule;
}
