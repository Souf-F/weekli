import type { Hex, ScriptPub } from "@weekli/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerPolices, creerContexte } from "@/lib/pub/contexte";
import { creerMoteur, type Moteur } from "@/lib/pub/moteur";
import { registreScenes } from "@/lib/pub/scenes";
import { policesRequises } from "@/lib/pub/visuel";

export const DELAI_APERCU = 120; // ms : l'apercu suit une modification de texte en moins de 300 ms (US-P6)

type Entree = {
	script: ScriptPub | null;
	images: Map<string, ImageBitmap>;
	versionImages: number;
	voixMesurees?: Readonly<Record<string, number>>;
	accentParDefaut?: Hex;
};

// Construit le moteur de rendu du script nettoye. Les polices de la pub sont chargees avant le premier dessin ;
// le script est lisse (debounce) pour ne pas reconstruire le moteur a chaque touche.
export function useMoteurPub({ script, images, versionImages, voixMesurees, accentParDefaut }: Entree) {
	const [lisse, setLisse] = useState(script);
	const [typoPrete, setTypoPrete] = useState<string>("");
	const [erreur, setErreur] = useState("");
	const premier = useRef(true);

	useEffect(() => {
		if (premier.current || !script) {
			premier.current = false;
			setLisse(script);
			return;
		}
		const t = window.setTimeout(() => setLisse(script), DELAI_APERCU);
		return () => window.clearTimeout(t);
	}, [script]);

	const typo = lisse?.marque.typo;
	useEffect(() => {
		if (!typo) return;
		let vivant = true;
		chargerPolices(policesRequises(typo))
			.then(() => vivant && setTypoPrete(typo))
			.catch(() => vivant && setErreur("Les polices de la pub n'ont pas pu être chargées."));
		return () => {
			vivant = false;
		};
	}, [typo]);

	// Fabrique reutilisable : l'export refait un moteur avec les durees de voix mesurees
	const fabriquer = useCallback(
		(s: ScriptPub, durees?: Readonly<Record<string, number>>) =>
			creerMoteur({
				script: s,
				scenes: registreScenes(s),
				voixMesurees: durees,
				contexte: creerContexte(s, { images, accentParDefaut }),
			}),
		// versionImages invalide la fabrique quand une image arrive (images est un Map muable)
		[images, versionImages, accentParDefaut],
	);

	const { moteur, erreurRendu } = useMemo<{ moteur: Moteur | null; erreurRendu: string }>(() => {
		if (!lisse || typoPrete !== lisse.marque.typo) return { moteur: null, erreurRendu: "" };
		try {
			return { moteur: fabriquer(lisse, voixMesurees), erreurRendu: "" };
		} catch (e) {
			return { moteur: null, erreurRendu: e instanceof Error ? e.message : "Rendu impossible" };
		}
	}, [lisse, typoPrete, fabriquer, voixMesurees]);

	return { moteur, fabriquer, erreur: erreur || erreurRendu };
}
