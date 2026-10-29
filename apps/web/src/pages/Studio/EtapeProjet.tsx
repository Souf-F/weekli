import type { RepoResume } from "@weekli/core";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import p from "../Tableau/Panneau.module.css";
import styles from "./Assistant.module.css";
import studio from "./Studio.module.css";

type Props = { repo: RepoResume | null; surChoix: (r: RepoResume) => void };

// Les repos publics de l'utilisateur, sans les forks (GET /api/repos), du plus recemment pousse au plus ancien
export function EtapeProjet({ repo, surChoix }: Props) {
	const [repos, setRepos] = useState<RepoResume[] | null>(null);
	const [erreur, setErreur] = useState("");
	const [recherche, setRecherche] = useState("");

	useEffect(() => {
		api
			.repos()
			.then(setRepos)
			.catch((e: Error) => setErreur(e.message));
	}, []);

	const visibles = useMemo(() => {
		const q = recherche.trim().toLowerCase();
		return (repos ?? []).filter((r) => !q || `${r.repo} ${r.description}`.toLowerCase().includes(q));
	}, [repos, recherche]);

	return (
		<>
			<label className={`${p.champ} ${styles.recherche}`}>
				Chercher un projet
				<input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou description" autoComplete="off" />
			</label>
			{erreur && (
				<p className={`${studio.message} ${studio.alerte}`} role="alert">
					{erreur}
				</p>
			)}
			{!repos && !erreur && <p className={studio.chargement}>Chargement de tes projets…</p>}
			{repos?.length === 0 && <p className={studio.message}>Aucun repo public trouvé sur ton compte. Weekli ne lit que les repos publics, sans les forks.</p>}
			{repos && repos.length > 0 && visibles.length === 0 && <p className={studio.message}>Aucun projet ne correspond à « {recherche} ».</p>}
			{visibles.length > 0 && (
				<fieldset className={styles.repos}>
					<legend className={studio.masque}>Projet de la pub</legend>
					{visibles.map((r) => (
						<label key={r.repo} className={styles.repo}>
							<input type="radio" name="projet" checked={repo?.repo === r.repo} onChange={() => surChoix(r)} />
							<strong>{r.repo}</strong>
							<span>{r.description || "Sans description"}</span>
						</label>
					))}
				</fieldset>
			)}
			{repo && !repo.site && <p className={studio.message}>Ce projet n'a pas de site : tu pourras importer des images à l'étape suivante.</p>}
		</>
	);
}
