import { useEffect, useMemo, useState } from "react";
import type { Brouillon } from "@weekli/core";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import p from "../Tableau/Panneau.module.css";
import { CarteBrouillon } from "./CarteBrouillon";
import styles from "./Historique.module.css";

type Filtre = "a-publier" | "publies" | "tous";

const FILTRES: { id: Filtre; nom: string }[] = [
	{ id: "a-publier", nom: "À publier" },
	{ id: "publies", nom: "Publiés" },
	{ id: "tous", nom: "Tous" },
];

export function Historique() {
	const [brouillons, setBrouillons] = useState<Brouillon[] | null>(null);
	const [erreur, setErreur] = useState("");
	const [filtre, setFiltre] = useState<Filtre>("a-publier");

	useEffect(() => {
		api
			.brouillons()
			.then(setBrouillons)
			.catch((e) => setErreur(e.message));
	}, []);

	const visibles = useMemo(
		() => (brouillons ?? []).filter((b) => (filtre === "tous" ? true : filtre === "publies" ? b.publie : !b.publie)),
		[brouillons, filtre],
	);

	const remplacer = (b: Brouillon) => setBrouillons((liste) => liste?.map((x) => (x.id === b.id ? b : x)) ?? null);
	const retirer = (id: string) => setBrouillons((liste) => liste?.filter((x) => x.id !== id) ?? null);

	return (
		<div>
			<div className={styles.entete}>
				<h1>
					Ton historique
					<br />
					<em>de posts.</em>
				</h1>
				<div className={styles.filtres} role="tablist" aria-label="Filtrer les brouillons">
					{FILTRES.map((f) => (
						<button
							key={f.id}
							role="tab"
							aria-selected={filtre === f.id}
							className={filtre === f.id ? styles.actif : ""}
							onClick={() => setFiltre(f.id)}
						>
							{f.nom}
						</button>
					))}
				</div>
			</div>

			{erreur && <p className={p.erreur}>{erreur}</p>}
			{brouillons === null && !erreur && <p className={p.aide}>Chargement…</p>}
			{brouillons && visibles.length === 0 && (
				<div className={styles.vide}>
					<p>Rien ici pour l'instant.</p>
					<p className={p.aide}>
						Les posts générés sur le <Link to="/app">tableau de bord</Link>, ou enregistrés par Claude avec l'outil{" "}
						<code>sauver_brouillons</code>, apparaissent ici.
					</p>
				</div>
			)}

			<div className={styles.grille}>
				{visibles.map((b) => (
					<CarteBrouillon key={b.id} brouillon={b} surModifie={remplacer} surSupprime={retirer} />
				))}
			</div>
		</div>
	);
}
