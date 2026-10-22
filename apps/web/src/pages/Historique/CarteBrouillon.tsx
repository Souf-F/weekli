import { useState } from "react";
import type { Brouillon } from "@weekli/core";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import styles from "./CarteBrouillon.module.css";

const date = (iso: string) =>
	new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

type Props = { brouillon: Brouillon; surModifie: (b: Brouillon) => void; surSupprime: (id: string) => void };

export function CarteBrouillon({ brouillon: b, surModifie, surSupprime }: Props) {
	const [texte, setTexte] = useState(b.texte);
	const [etat, setEtat] = useState("");
	const [occupe, setOccupe] = useState(false);

	const agir = async (action: () => Promise<void>, message = "") => {
		setOccupe(true);
		setEtat("");
		try {
			await action();
			setEtat(message);
		} catch (e) {
			setEtat(e instanceof Error ? e.message : "Erreur");
		} finally {
			setOccupe(false);
		}
	};

	// Sauvegarde a la sortie du champ, seulement si le texte a change
	const enregistrer = () =>
		texte !== b.texte && agir(async () => surModifie(await api.modifierBrouillon(b.id, { texte })), "Enregistré");

	const basculerPublie = () => agir(async () => surModifie(await api.modifierBrouillon(b.id, { publie: !b.publie })));

	const supprimer = () => {
		if (!confirm("Supprimer définitivement ce brouillon ?")) return;
		agir(async () => {
			await api.supprimerBrouillon(b.id);
			surSupprime(b.id);
		});
	};

	const copier = () => agir(() => navigator.clipboard.writeText(texte), "Copié");

	return (
		<article className={`${styles.carte} ${b.publie ? styles.publie : ""}`}>
			<header className={styles.entete}>
				<span className={styles.badge}>{b.publie ? "Publié" : "À publier"}</span>
				<time dateTime={b.cree}>{date(b.cree)}</time>
			</header>
			<h3 className={styles.titre}>{b.titre || "Sans titre"}</h3>
			<p className={styles.meta}>
				{b.format} {b.source && `· ${b.source}`}
			</p>
			<textarea
				className={styles.texte}
				value={texte}
				onChange={(e) => setTexte(e.target.value)}
				onBlur={enregistrer}
				rows={Math.min(14, Math.max(6, texte.split("\n").length + 1))}
				aria-label={`Texte du brouillon ${b.titre}`}
			/>
			<footer className={styles.pied}>
				<span className={styles.etat}>{etat}</span>
				<Bouton taille="petit" variante="contour" onClick={supprimer} disabled={occupe}>
					Supprimer
				</Bouton>
				<Bouton taille="petit" variante="contour" onClick={basculerPublie} disabled={occupe}>
					{b.publie ? "Remettre à publier" : "Marquer publié"}
				</Bouton>
				<Bouton taille="petit" variante="contour" vers={`/app/studio?brouillon=${b.id}`}>
					En vidéo
				</Bouton>
				<Bouton taille="petit" onClick={copier} disabled={occupe}>
					Copier
				</Bouton>
			</footer>
		</article>
	);
}
