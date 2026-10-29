import type { Activite } from "@weekli/core";
import p from "./Panneau.module.css";
import styles from "./PanneauActivite.module.css";

type Props = {
	jours: number;
	surJours: (j: number) => void;
	activite: Activite | null;
	chargement: boolean;
	erreur: string;
	selection: Set<string>;
	surBasculer: (cle: string) => void;
	surBasculerRepo: (repo: string, coche: boolean) => void;
};

export const cleCommit = (repo: string, sha: string) => `${repo}:${sha}`;

export function PanneauActivite({
	jours,
	surJours,
	activite,
	chargement,
	erreur,
	selection,
	surBasculer,
	surBasculerRepo,
}: Props) {
	return (
		<section className={`${p.panneau} ${styles.panneau}`}>
			<div className={p.titre}>
				<div>
					<p className={p.etape}>Étape 1</p>
					<h2>Ta semaine</h2>
				</div>
				<select
					value={jours}
					onChange={(e) => surJours(Number(e.target.value))}
					className={styles.periode}
					aria-label="Période"
				>
					<option value={7}>7 derniers jours</option>
					<option value={14}>14 derniers jours</option>
					<option value={30}>30 derniers jours</option>
				</select>
			</div>

			{chargement && <p className={p.aide}>Lecture de ton activité GitHub…</p>}
			{erreur && <p className={p.erreur}>{erreur}</p>}
			{activite && activite.repos.length === 0 && (
				<p className={p.aide}>Aucun commit utile sur tes repos publics depuis le {activite.depuis}.</p>
			)}

			<div className={styles.repos}>
				{activite?.repos.map((r) => {
					const tous = r.commits.every((c) => selection.has(cleCommit(r.repo, c.sha)));
					return (
						<details key={r.repo} className={styles.repo} open>
							<summary>
								<input
									type="checkbox"
									checked={tous}
									onChange={(e) => surBasculerRepo(r.repo, e.target.checked)}
									onClick={(e) => e.stopPropagation()}
									aria-label={`Tout sélectionner dans ${r.repo}`}
								/>
								<strong>{r.repo}</strong>
								<span className={styles.compte}>{r.commits.length} commits</span>
							</summary>
							<ul>
								{r.commits.map((c) => (
									<li key={c.sha}>
										<label className={p.ligne}>
											<input
												type="checkbox"
												checked={selection.has(cleCommit(r.repo, c.sha))}
												onChange={() => surBasculer(cleCommit(r.repo, c.sha))}
											/>
											<span className={styles.message}>{c.message}</span>
											<code className={styles.sha}>{c.sha}</code>
										</label>
									</li>
								))}
							</ul>
						</details>
					);
				})}
			</div>
		</section>
	);
}
