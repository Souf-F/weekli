import { HAUTEUR, LARGEUR } from "./scene";
import type { Moteur } from "./moteur";

const ECHELLE = 0.5; // apercu a 960 x 540 (architecture.md 7.4)

export type Apercu = {
	lire(): Promise<void>;
	pause(): Promise<void>;
	aller(secondes: number): void;
	readonly temps: number;
	readonly enLecture: boolean;
	detruire(): void;
};

// Apercu pilote par l'horloge audio : AudioContext.currentTime est la reference (architecture.md 7.5).
// Sans piste audio, un contexte silencieux sert quand meme d'horloge.
export function creerApercu(
	canvas: HTMLCanvasElement,
	moteur: Moteur,
	audio: AudioBuffer | null,
	surTemps?: (secondes: number) => void,
): Apercu {
	canvas.width = Math.round(LARGEUR * ECHELLE);
	canvas.height = Math.round(HAUTEUR * ECHELLE);
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	const horloge = new AudioContext({ sampleRate: 48000 });
	let source: AudioBufferSourceNode | null = null;
	let origine = 0; // horloge.currentTime correspondant a t = 0 de la pub
	let position = 0; // temps fige quand en pause
	let lecture = false;
	let image = 0;

	const temps = () => (lecture ? Math.min(horloge.currentTime - origine, moteur.duree) : position);
	const montrer = () => {
		const t = temps();
		moteur.dessiner(ctx, Math.min(t, Math.max(moteur.duree - 1e-3, 0)), ECHELLE);
		surTemps?.(t);
		return t;
	};
	const boucle = () => {
		const t = montrer();
		if (t >= moteur.duree) {
			arreter();
			position = moteur.duree;
			return;
		}
		image = requestAnimationFrame(boucle);
	};
	const arreterSource = () => {
		if (source) {
			source.onended = null;
			source.stop();
			source.disconnect();
			source = null;
		}
	};
	function arreter() {
		cancelAnimationFrame(image);
		arreterSource();
		lecture = false;
	}
	function demarrer(depuis: number) {
		arreterSource();
		if (audio) {
			source = horloge.createBufferSource();
			source.buffer = audio;
			source.connect(horloge.destination);
			source.start(0, depuis);
		}
		origine = horloge.currentTime - depuis;
		lecture = true;
		cancelAnimationFrame(image);
		image = requestAnimationFrame(boucle);
	}

	montrer();
	return {
		async lire() {
			if (lecture) return;
			await horloge.resume();
			demarrer(position >= moteur.duree ? 0 : position);
		},
		async pause() {
			if (!lecture) return;
			position = temps();
			arreter();
			await horloge.suspend();
		},
		aller(secondes) {
			position = Math.min(Math.max(secondes, 0), moteur.duree);
			if (lecture) demarrer(position);
			else montrer();
		},
		get temps() {
			return temps();
		},
		get enLecture() {
			return lecture;
		},
		detruire() {
			arreter();
			void horloge.close();
		},
	};
}
