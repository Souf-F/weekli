import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { effacerDonneesLocales } from "@/lib/reglages";
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
	const serveurEfface = useRef(false);

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
		if (!serveurEfface.current) {
			try {
				await api.supprimerMesDonnees();
				serveurEfface.current = true;
			} catch (e) {
				setErreur(e instanceof Error ? e.message : "La suppression a échoué, réessaie.");
				setOccupe(false);
				return;
			}
		}
		try {
			await effacerDonneesLocales();
			navigate("/", { replace: true });
		} catch {
			setErreur(
				"Tes données Weekli sont effacées du serveur, mais pas tout ce que ce navigateur garde. Réessaie, ou efface le stockage du site dans les réglages du navigateur.",
			);
			setOccupe(false);
		}
	};

	return (
		<section className={`${p.panneau} ${styles.zone}`} aria-labelledby="titre-donnees">
			<div className={p.titre}>
				<h2 id="titre-donnees">Tes données</h2>
			</div>
			<p className={p.aide}>
				Ta session GitHub dure 8 heures et l'autorisation donnée à Claude 30 jours. Tes brouillons, pubs, domaines
				vérifiés et ton style d'écriture sont gardés 90 jours après ton dernier enregistrement, renouvelés à chaque
				modification. Détails dans la <Link to="/confidentialite">page Confidentialité</Link>.
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
						Seront effacés définitivement : tes brouillons, pubs, domaines et style d'écriture, les autorisations
						données à Claude et tes sessions, puis, dans ce navigateur, ta clé API, ton modèle, ton dernier repo, les
						images et logos importés dans le studio et le modèle de voix de secours téléchargé. L'audio de voix en
						cache sur le serveur (non rattaché à toi) reste 90 jours. Tu seras déconnecté. Cette action est
						irréversible.
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
