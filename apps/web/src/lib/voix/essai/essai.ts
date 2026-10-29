// Page d'essai interne de la voix : charge le Worker vocal, synthétise et affiche les mesures.
// Hors du build (seul index.html à la racine de apps/web est une entrée Vite) et bloquée hors développement.
import { versWav } from "../audio";
import { viderCache } from "../cache";
import { creerVoix, type Progression, type Voix } from "../client";

const TEXTE_BANC =
	"Lundi matin. Tu as codé toute la semaine. Et sur LinkedIn ? Rien. Encore. Et si ton travail parlait enfin pour toi ? " +
	"Voici Weekli. Il lit ton activité GitHub, écrit tes posts dans ton style, et monte la pub de ton projet. " +
	"Ton code de la semaine, raconté. Essaie Weekli, c'est gratuit.";

function element<T extends HTMLElement>(id: string): T {
	const trouve = document.getElementById(id);
	if (!trouve) throw new Error(`Élément #${id} absent`);
	return trouve as T;
}

const secondes = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

function demarrer() {
	const texte = element<HTMLTextAreaElement>("texte");
	const vitesse = element<HTMLInputElement>("vitesse");
	const boutonCharger = element<HTMLButtonElement>("charger");
	const boutonSynthese = element<HTMLButtonElement>("synthetiser");
	const boutonVider = element<HTMLButtonElement>("vider");
	const etat = element<HTMLParagraphElement>("etat");
	const lecteur = element<HTMLAudioElement>("lecteur");
	const lien = element<HTMLAnchorElement>("telecharger");
	const mesures = element<HTMLOListElement>("mesures");
	const phonemes = element<HTMLParagraphElement>("phonemes");

	texte.value = TEXTE_BANC;
	let voix: Voix | null = null;
	let urlAudio: string | null = null;

	const noter = (ligne: string) => {
		const item = document.createElement("li");
		item.textContent = ligne;
		mesures.append(item);
	};
	const progression = (p: Progression) => {
		if (p.role === "modele" && !p.depuisCache) etat.textContent = `Téléchargement du modèle : ${Math.round((p.recu / p.total) * 100)} %`;
	};

	boutonCharger.addEventListener("click", async () => {
		boutonCharger.disabled = true;
		etat.textContent = "Chargement…";
		voix = creerVoix();
		try {
			const pret = await voix.charger({ surProgression: progression });
			const m = pret.mesures;
			noter(
				`Chargement (WASM, ${pret.fils} fil(s), ${m.depuisCache ? "cache IndexedDB" : "réseau"}) : ${secondes(m.total)} ` +
					`[fichiers ${secondes(m.fichiers)}, espeak-ng ${secondes(m.espeak)}, session ONNX ${secondes(m.session)}]`,
			);
			etat.textContent = `Modèle prêt (${pret.fils} fil(s) de calcul).`;
			boutonSynthese.disabled = false;
		} catch (erreur) {
			etat.textContent = `Échec du chargement : ${erreur instanceof Error ? erreur.message : String(erreur)}`;
			voix.terminer();
			voix = null;
			boutonCharger.disabled = false;
		}
	});

	element<HTMLFormElement>("formulaire").addEventListener("submit", async (evenement) => {
		evenement.preventDefault();
		if (!voix) return;
		boutonSynthese.disabled = true;
		etat.textContent = "Synthèse en cours…";
		try {
			const r = await voix.synthetiser(texte.value, { vitesse: Number(vitesse.value) });
			const duree = r.audio.length / r.frequence;
			const inference = r.mesures.inference.reduce((a, b) => a + b, 0);
			noter(
				`Synthèse : ${secondes(r.mesures.total)} pour ${duree.toFixed(1)} s d'audio ` +
					`[phonèmes ${secondes(r.mesures.phonemisation)}, inférence ${secondes(inference)} en ${r.mesures.inference.length} lot(s), ` +
					`facteur temps réel ${(inference / 1000 / duree).toFixed(2)}]`,
			);
			phonemes.textContent = r.phonemes;
			if (urlAudio) URL.revokeObjectURL(urlAudio);
			urlAudio = URL.createObjectURL(new Blob([versWav(r.audio, r.frequence)], { type: "audio/wav" }));
			lecteur.src = urlAudio;
			lecteur.hidden = false;
			lien.href = urlAudio;
			lien.hidden = false;
			etat.textContent = "Synthèse terminée.";
		} catch (erreur) {
			etat.textContent = `Échec de la synthèse : ${erreur instanceof Error ? erreur.message : String(erreur)}`;
		} finally {
			boutonSynthese.disabled = false;
		}
	});

	boutonVider.addEventListener("click", async () => {
		try {
			await viderCache();
			etat.textContent = "Cache vidé : le prochain chargement repassera par le réseau (recharger la page).";
		} catch (erreur) {
			etat.textContent = `Cache inaccessible : ${erreur instanceof Error ? erreur.message : String(erreur)}`;
		}
	});

	noter(`Navigateur : ${navigator.userAgent}, ${navigator.hardwareConcurrency} cœurs`);
}

if (import.meta.env.DEV) demarrer();
else document.body.textContent = "Page réservée au développement.";
