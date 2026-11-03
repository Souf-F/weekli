import { useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import { enregistrerReglages, lireReglages, MODELES, type Modele } from "@/lib/reglages";
import p from "../Tableau/Panneau.module.css";
import { PanneauDomaines } from "./PanneauDomaines";
import { PanneauDonnees } from "./PanneauDonnees";
import { PanneauStyle } from "./PanneauStyle";
import styles from "./Reglages.module.css";

export function Reglages() {
	const [r, setR] = useState(lireReglages);
	const [enregistre, setEnregistre] = useState(false);

	const enregistrer = (e: React.FormEvent) => {
		e.preventDefault();
		enregistrerReglages(r);
		setEnregistre(true);
		setTimeout(() => setEnregistre(false), 2000);
	};

	return (
		<div className={styles.grille}>
			<form className={styles.colonne} onSubmit={enregistrer}>
				<section className={p.panneau}>
					<div className={p.titre}>
						<h2>Clé API Anthropic</h2>
					</div>
					<label className={p.champ}>
						Clé
						<input
							type="password"
							autoComplete="off"
							spellCheck={false}
							placeholder="sk-ant-..."
							value={r.cleApi}
							onChange={(e) => setR({ ...r, cleApi: e.target.value.trim() })}
						/>
					</label>
					<label className={p.ligne}>
						<input
							type="checkbox"
							checked={r.memoriser}
							onChange={(e) => setR({ ...r, memoriser: e.target.checked })}
						/>
						Se souvenir de la clé sur cet appareil
					</label>
					{r.memoriser && (
						<p className={styles.avertissement} role="note">
							Mémorisée, la clé reste lisible dans ce navigateur jusqu'à ce que tu l'effaces. Évite cette option sur un
							appareil partagé.
						</p>
					)}
					<ul className={styles.securite}>
						<li>La clé reste dans ton navigateur et part directement chez Anthropic.</li>
						<li>Le serveur Weekli ne la voit jamais et ne la stocke pas.</li>
						<li>Sans « se souvenir », elle est effacée à la fermeture de l'onglet.</li>
						<li>Utilise une clé créée pour Weekli, avec une limite de dépense fixée chez Anthropic.</li>
					</ul>
					<label className={p.champ}>
						Modèle
						<select value={r.modele} onChange={(e) => setR({ ...r, modele: e.target.value as Modele })}>
							{MODELES.map((m) => (
								<option key={m.id} value={m.id}>
									{m.nom} · {m.detail}
								</option>
							))}
						</select>
					</label>
				</section>

				<Bouton type="submit">{enregistre ? "Enregistré" : "Enregistrer"}</Bouton>
			</form>
			<div className={styles.colonne}>
				<PanneauStyle />
				<PanneauDomaines />
				<PanneauDonnees />
			</div>
		</div>
	);
}
