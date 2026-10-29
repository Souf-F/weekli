import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { effacerReglages } from "@/lib/reglages";
import p from "../Tableau/Panneau.module.css";
import styles from "./PanneauDonnees.module.css";

// Suppression complete des donnees (droit a l'effacement), avec confirmation explicite
export function PanneauDonnees() {
	const navigate = useNavigate();
	const [confirmation, setConfirmation] = useState(false);
	const [occupe, setOccupe] = useState(false);
	const [erreur, setErreur] = useState("");
	const [enExport, setExport] = useState(false);
	const boite = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (confirmation) boite.current?.focus();
	}, [confirmation]);

	const exporter = async () => {
		setExport(true);
		setErreur("");
		try {
			const url = URL.createObjectURL(await api.exporterMesDonnees());
			const lien = document.createElement("a");
			lien.href = url;
			lien.download = "weekli-donnees.json";
			lien.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (e) {
			setErreur(e instanceof Error ? e.message : "L'export a échoué, réessaie.");
		} finally {
			setExport(false);
		}
	};

	const supprimer = async () => {
		setOccupe(true);
		setErreur("");
		try {
			await api.supprimerMesDonnees();
			effacerReglages();
			navigate("/", { replace: true });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : "La suppression a échoué, réessaie.");
			setOccupe(false);
		}
	};

	return (
		<section className={`${p.panneau} ${styles.zone}`} aria-labelledby="titre-donnees">
			<div className={p.titre}>
				<h2 id="titre-donnees">Tes données</h2>
			</div>
			<p className={p.aide}>
				Weekli garde ton token GitHub, tes brouillons, tes domaines vérifiés et ton style d'écriture pendant 90 jours
				après ton dernier enregistrement, renouvelés à chaque modification. Détails dans la <Link to="/confidentialite">page Confidentialité</Link>.
			</p>

			<Bouton variante="contour" onClick={exporter} disabled={enExport} className={styles.export}>
				{enExport ? "Préparation…" : "Télécharger mes données"}
			</Bouton>

			{confirmation ? (
				<div
					ref={boite}
					tabIndex={-1}
					className={styles.confirmation}
					role="alertdialog"
					aria-labelledby="titre-confirmation"
					aria-describedby="texte-confirmation"
				>
					<h3 id="titre-confirmation">Tout supprimer ?</h3>
					<p id="texte-confirmation">
						Session, brouillons, domaines et style d'écriture seront effacés définitivement, ainsi que les réglages
						gardés dans ce navigateur (clé API comprise). Tu seras déconnecté. Cette action est irréversible.
					</p>
					<div className={styles.actions}>
						<Bouton variante="contour" onClick={() => setConfirmation(false)} disabled={occupe}>
							Annuler
						</Bouton>
						<Bouton onClick={supprimer} disabled={occupe} className={styles.danger}>
							{occupe ? "Suppression…" : "Oui, tout supprimer"}
						</Bouton>
					</div>
				</div>
			) : (
				<Bouton variante="contour" onClick={() => setConfirmation(true)} className={styles.declencheur}>
					Supprimer mes données
				</Bouton>
			)}

			{erreur && (
				<p className={p.erreur} role="alert">
					{erreur}
				</p>
			)}
		</section>
	);
}
