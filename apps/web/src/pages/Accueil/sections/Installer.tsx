import { useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import s from "./Section.module.css";
import styles from "./Installer.module.css";

export function Installer() {
	const url = `${location.origin}/mcp`;
	const [libelle, setLibelle] = useState("Copier");

	const copier = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setLibelle("Copié");
		} catch {
			setLibelle("Impossible");
		}
		setTimeout(() => setLibelle("Copier"), 2000);
	};

	return (
		<section className={s.section} id="installer">
			<div className={`${s.panneau} ${styles.cta} revele`}>
				<p className={s.surTitre}>Mode 1 · prêt en deux minutes</p>
				<h2 className={styles.titre}>
					Ajoute Weekli
					<br />
					<em>à ton Claude.</em>
				</h2>
				<p className={styles.texte}>
					Dans Claude : Paramètres, Connecteurs, Ajouter un connecteur personnalisé. Puis colle cette adresse.
				</p>
				<div className={styles.url}>
					<code>{url}</code>
					<Bouton onClick={copier}>{libelle}</Bouton>
				</div>
			</div>
		</section>
	);
}
