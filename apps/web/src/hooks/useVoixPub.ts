import type { ScriptPub } from "@weekli/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { type EtapeVoix, type EtatVoix, importerVoix, synthetiserVoix, type VoixPreparee } from "@/lib/pub/audio/index";

export type VoixGeneree = { voix: VoixPreparee; textes: Record<string, string>; signature: string };
export type ProgressionVoix = { libelle: string; part: number | null };

// La voix depend du texte de chaque scene, de la vitesse et de la prononciation (synthese) : une signature compare
const signatureDe = (s: ScriptPub) => JSON.stringify([s.voix.mode, s.voix.mode === "synthese" ? [s.voix.vitesse, s.voix.prononciation] : null]);
const textesDe = (s: ScriptPub) => Object.fromEntries(s.scenes.filter((x) => !x.masquee).map((x) => [x.id, x.voix.trim()]));

function libelleEtape(e: EtapeVoix): ProgressionVoix {
	if (e.etape === "synthese") return { libelle: `Voix : scène ${e.scene} sur ${e.total}`, part: e.scene / e.total };
	return {
		libelle: e.depuisCache ? "Voix : chargement du modèle (déjà en cache)" : "Voix : téléchargement du modèle de secours",
		part: e.total ? e.recu / e.total : null,
	};
}

// Etat de la voix off d'une pub : generee dans le navigateur, ou importee scene par scene
export function useVoixPub(script: ScriptPub | null) {
	const [voix, setVoix] = useState<VoixGeneree | null>(null);
	const [progression, setProgression] = useState<ProgressionVoix | null>(null);
	const [etat, setEtat] = useState<EtatVoix | null>(null);
	const [erreur, setErreur] = useState("");
	const arret = useRef<AbortController | null>(null);

	const generer = useCallback(
		async (s: ScriptPub, fichiers?: Record<string, Blob>): Promise<VoixGeneree | null> => {
			arret.current?.abort();
			const controle = new AbortController();
			arret.current = controle;
			setErreur("");
			setProgression({ libelle: "Voix : préparation", part: null });
			try {
				const prep = s.voix.mode === "importee" ? await importerVoix(fichiers ?? {}) : await synthetiserVoix(s, { signal: controle.signal, surProgression: (e) => setProgression(libelleEtape(e)), surEtat: setEtat });
				const resultat = { voix: prep, textes: textesDe(s), signature: signatureDe(s) };
				setVoix(resultat);
				setEtat(prep.etat);
				return resultat;
			} catch (e) {
				if (!controle.signal.aborted) setErreur(e instanceof Error ? e.message : "La voix n'a pas pu être préparée");
				return null;
			} finally {
				setProgression(null);
			}
		},
		[],
	);

	const annuler = useCallback(() => arret.current?.abort(), []);

	// Les scenes dont le texte a change depuis la generation n'ont plus de voix valable
	const perimee = useMemo(() => {
		if (!voix || !script) return [];
		const courants = textesDe(script);
		if (voix.signature !== signatureDe(script)) return Object.keys(courants);
		return Object.keys(courants).filter((id) => courants[id] && voix.textes[id] !== courants[id]);
	}, [voix, script]);

	// Voix utilisable par le moteur : seulement les scenes a jour
	const valide = useMemo<VoixPreparee | null>(() => {
		if (!voix || !script || script.voix.mode === "aucune") return null;
		const audio = Object.fromEntries(Object.entries(voix.voix.audio).filter(([id]) => !perimee.includes(id)));
		const durees = Object.fromEntries(Object.entries(voix.voix.durees).filter(([id]) => !perimee.includes(id)));
		return { ...voix.voix, audio, durees };
	}, [voix, script, perimee]);

	return { voix, valide, perimee, progression, etat, erreur, generer, annuler };
}
