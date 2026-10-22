import { useCallback, useEffect, useState } from "react";
import { api, ErreurApi, type Moi } from "@/lib/api";

export type EtatMoi =
	| { statut: "chargement" }
	| { statut: "deconnecte" }
	| { statut: "erreur"; message: string }
	| { statut: "connecte"; moi: Moi };

export function useMoi() {
	const [etat, setEtat] = useState<EtatMoi>({ statut: "chargement" });

	const charger = useCallback(() => {
		api
			.moi()
			.then((moi) => setEtat({ statut: "connecte", moi }))
			.catch((err) =>
				setEtat(
					err instanceof ErreurApi && err.statut === 401
						? { statut: "deconnecte" }
						: { statut: "erreur", message: err instanceof Error ? err.message : "Serveur injoignable" },
				),
			);
	}, []);

	useEffect(charger, [charger]);

	const deconnecter = async () => {
		await api.deconnexion();
		setEtat({ statut: "deconnecte" });
	};

	return { etat, deconnecter };
}
