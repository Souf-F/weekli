import type { ScriptPub } from "@weekli/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ErreurApi } from "@/lib/api";

export const DELAI_SAUVEGARDE = 2000; // US-P6 : 2 s apres la derniere frappe

export type EtatSauvegarde =
	| { statut: "enregistre" }
	| { statut: "attente" }
	| { statut: "en-cours" }
	| { statut: "refuse"; message: string; details: string[] }
	| { statut: "erreur"; message: string };

// Sauvegarde differee de la pub ouverte (PUT /api/pubs/:id). Un script que le serveur refuse reste editable :
// l'etat "refuse" porte les causes. `vider` envoie sans attendre (avant de quitter le studio).
export function useSauvegarde(id: string, script: ScriptPub, actif: boolean) {
	const [etat, setEtat] = useState<EtatSauvegarde>({ statut: "enregistre" });
	const dernier = useRef(script);
	const envoye = useRef(script);
	const minuteur = useRef<number | undefined>(undefined);
	const enCours = useRef(false);
	const relancer = useRef<() => Promise<void>>(async () => undefined);

	const envoyer = useCallback(async () => {
		if (enCours.current || dernier.current === envoye.current) return;
		enCours.current = true;
		const cible = dernier.current;
		setEtat({ statut: "en-cours" });
		try {
			await api.sauverPub(id, cible);
			envoye.current = cible;
			setEtat(dernier.current === cible ? { statut: "enregistre" } : { statut: "attente" });
		} catch (err) {
			envoye.current = cible;
			setEtat(
				err instanceof ErreurApi && err.statut === 400
					? { statut: "refuse", message: err.message, details: err.details }
					: { statut: "erreur", message: err instanceof Error ? err.message : "Enregistrement impossible" },
			);
		} finally {
			enCours.current = false;
		}
		if (dernier.current !== envoye.current) minuteur.current = window.setTimeout(() => void relancer.current(), DELAI_SAUVEGARDE);
	}, [id]);
	useEffect(() => {
		relancer.current = envoyer;
	}, [envoyer]);

	// Le script charge au depart n'est pas une modification : seule une nouvelle valeur declenche l'enregistrement
	useEffect(() => {
		dernier.current = script;
		if (!actif || script === envoye.current) return;
		setEtat({ statut: "attente" });
		window.clearTimeout(minuteur.current);
		minuteur.current = window.setTimeout(envoyer, DELAI_SAUVEGARDE);
	}, [script, actif, envoyer]);

	// Quitter l'editeur envoie ce qui attend
	useEffect(
		() => () => {
			window.clearTimeout(minuteur.current);
			void envoyer();
		},
		[envoyer],
	);

	const vider = useCallback(() => {
		window.clearTimeout(minuteur.current);
		return envoyer();
	}, [envoyer]);

	return { etat, vider };
}
