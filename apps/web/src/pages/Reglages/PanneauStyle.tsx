import { LIMITES_STYLE, type StyleEcriture } from "@weekli/core";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { chargerStyle } from "@/lib/style";
import p from "../Tableau/Panneau.module.css";
import styles from "./PanneauStyle.module.css";

type Etat = "chargement" | "pret" | "occupe";

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Style d'ecriture memorise sur le serveur (GET, PUT, DELETE /api/style), partage avec Claude via le connecteur
export function PanneauStyle() {
	const [etat, setEtat] = useState<Etat>("chargement");
	const [exemples, setExemples] = useState("");
	const [profil, setProfil] = useState("");
	const [maj, setMaj] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [erreur, setErreur] = useState("");

	const appliquer = (s: StyleEcriture) => {
		setExemples(s.exemples);
		setProfil(s.profil);
		setMaj(s.maj);
	};

	useEffect(() => {
		let vivant = true;
		chargerStyle()
			.then((s) => {
				if (!vivant) return;
				appliquer(s);
				setEtat("pret");
			})
			.catch((e: Error) => {
				if (!vivant) return;
				setErreur(`Impossible de lire ton style : ${e.message}`);
				setEtat("pret");
			});
		return () => {
			vivant = false;
		};
	}, []);

	const agir = async (action: () => Promise<string>) => {
		setEtat("occupe");
		setMessage("");
		setErreur("");
		try {
			setMessage(await action());
		} catch (e) {
			setErreur(e instanceof Error ? e.message : "L'opération a échoué, réessaie.");
		} finally {
			setEtat("pret");
		}
	};

	const enregistrer = (e: React.FormEvent) => {
		e.preventDefault();
		void agir(async () => {
			if (!exemples.trim() && !profil.trim()) {
				await api.supprimerStyle();
				appliquer({ exemples: "", profil: "", maj: null });
				return "Style vide : rien n'est gardé sur le serveur.";
			}
			appliquer(await api.sauverStyle({ exemples, profil }));
			return "Style enregistré sur le serveur.";
		});
	};

	const effacer = () =>
		agir(async () => {
			await api.supprimerStyle();
			appliquer({ exemples: "", profil: "", maj: null });
			return "Style effacé du serveur.";
		});

	const occupe = etat !== "pret";
	return (
		<section className={p.panneau} aria-labelledby="titre-style" aria-busy={etat === "chargement"}>
			<div className={p.titre}>
				<h2 id="titre-style">Ton style d'écriture</h2>
			</div>
			<p className={p.aide}>
				Gardé sur le serveur Weekli (chiffré, 90 jours après la dernière modification). Claude s'en sert sur le site
				comme dans le connecteur, pour écrire avec ta voix.
			</p>
			<form onSubmit={enregistrer} className={styles.formulaire}>
				<label className={p.champ}>
					Colle 2 ou 3 de tes anciens posts LinkedIn
					<textarea
						rows={10}
						value={exemples}
						maxLength={LIMITES_STYLE.exemples}
						disabled={occupe}
						onChange={(e) => setExemples(e.target.value)}
						placeholder="Sépare les posts par une ligne contenant ---"
					/>
					<span className={styles.compteur}>
						{exemples.length} / {LIMITES_STYLE.exemples}
					</span>
				</label>
				<label className={p.champ}>
					Profil de style (facultatif)
					<textarea
						rows={4}
						value={profil}
						maxLength={LIMITES_STYLE.profil}
						disabled={occupe}
						onChange={(e) => setProfil(e.target.value)}
						placeholder="Phrases courtes, tutoiement, une question en accroche, pas de jargon."
					/>
					<span className={styles.compteur}>
						{profil.length} / {LIMITES_STYLE.profil}
					</span>
				</label>
				<div className={styles.actions}>
					<Bouton type="submit" disabled={occupe}>
						{etat === "occupe" ? "En cours…" : "Enregistrer"}
					</Bouton>
					<Bouton type="button" variante="contour" onClick={effacer} disabled={occupe || (!exemples && !profil && !maj)}>
						Effacer mon style
					</Bouton>
				</div>
			</form>
			<p className={p.aide} role="status" aria-live="polite">
				{message || (maj ? `Dernière modification : ${date(maj)}.` : etat === "pret" ? "Aucun style enregistré." : "Chargement…")}
			</p>
			{erreur && (
				<p className={p.erreur} role="alert">
					{erreur}
				</p>
			)}
		</section>
	);
}
