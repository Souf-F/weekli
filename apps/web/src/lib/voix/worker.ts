// Worker vocal : charge les fichiers (cache IndexedDB), espeak-ng et Kokoro, puis synthétise à la demande.
// Le calcul reste hors du fil principal pour que l'interface ne gèle pas pendant les dizaines de secondes de synthèse.
import { creerPhonemiseur, reconstituerPaquet } from "./espeak";
import { lireManifeste, obtenirFichier, type Progression } from "./fichiers";
import { MoteurKokoro } from "./kokoro";
import type { DemandeVoix, ReponseVoix } from "./protocole";

interface PorteeWorker {
	postMessage(message: ReponseVoix, transfert?: Transferable[]): void;
	onmessage: ((evenement: MessageEvent<DemandeVoix>) => void) | null;
}

const portee = self as unknown as PorteeWorker;
let moteur: Promise<MoteurKokoro> | null = null;

const envoyer = (message: ReponseVoix, transfert: Transferable[] = []) => portee.postMessage(message, transfert);
const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur));

async function charger(): Promise<MoteurKokoro> {
	const debut = performance.now();
	const manifeste = await lireManifeste();
	const tManifeste = performance.now();
	let depuisCache = true;
	const progression = (p: Progression) => {
		depuisCache &&= p.depuisCache;
		envoyer({ type: "progression", progression: p });
	};
	const [modele, voix, espeak] = await Promise.all([
		obtenirFichier("modele", manifeste.modele, progression),
		obtenirFichier("voix", manifeste.voix, progression),
		obtenirFichier("espeak", manifeste.espeak, progression),
	]);
	const tFichiers = performance.now();
	const phonemiseur = await creerPhonemiseur(
		reconstituerPaquet(espeak, manifeste.espeak.tailleComplete, manifeste.espeak.plages),
	);
	const tEspeak = performance.now();
	const instance = await MoteurKokoro.creer(modele, voix.buffer, phonemiseur);
	const fin = performance.now();
	envoyer({
		type: "pret",
		fils: instance.fils,
		mesures: {
			manifeste: tManifeste - debut,
			fichiers: tFichiers - tManifeste,
			espeak: tEspeak - tFichiers,
			session: fin - tEspeak,
			total: fin - debut,
			depuisCache,
		},
	});
	return instance;
}

portee.onmessage = ({ data }) => {
	if (data.type === "charger") {
		moteur ??= charger();
		moteur.catch((erreur: unknown) => {
			moteur = null;
			envoyer({ type: "erreur", message: message(erreur) });
		});
		return;
	}
	const { id, texte, options } = data;
	if (!moteur) {
		envoyer({ type: "erreur", id, message: "Moteur vocal non chargé" });
		return;
	}
	const debut = performance.now();
	moteur
		.then((m) => m.synthetiser(texte, options))
		.then((r) => {
			const mesures = { ...r.mesures, total: performance.now() - debut };
			envoyer({ type: "audio", id, audio: r.audio, frequence: r.frequence, phonemes: r.phonemes, mesures }, [r.audio.buffer]);
		})
		.catch((erreur: unknown) => envoyer({ type: "erreur", id, message: message(erreur) }));
};
