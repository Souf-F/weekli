import type { Commit } from "@weekli/core";
import { MAX_COMMITS_POST } from "@weekli/core";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { JOURS_COMMITS, type ReglagesType } from "@/lib/parcours";
import e from "../Etapes.module.css";
import p from "../Panneau.module.css";

type Props = { repo: string; reglages: ReglagesType; surModifier: (m: Partial<ReglagesType>) => void };

const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

// Commits du repo choisi : monte seulement pour les types qui en ont besoin, donc jamais d'appel pour presentation et tuto
export function ListeCommits({ repo, reglages, surModifier }: Props) {
	const [commits, setCommits] = useState<Commit[] | null>(null);
	const [erreur, setErreur] = useState("");
	const [essai, setEssai] = useState(0);
	const { jours } = reglages;

	useEffect(() => {
		let annule = false;
		setCommits(null);
		setErreur("");
		api
			.commitsRepo(repo, jours)
			.then((c) => !annule && setCommits(c))
			.catch((err: Error) => !annule && setErreur(err.message));
		return () => {
			annule = true;
		};
	}, [repo, jours, essai]);

	const coches = reglages.commits;
	const basculer = (sha: string) =>
		surModifier({ commits: coches.includes(sha) ? coches.filter((s) => s !== sha) : [...coches, sha] });

	return (
		<div className={e.bloc}>
			<div className={e.entete}>
				<label className={e.periode}>
					<span>Période</span>
					<select
						value={jours}
						onChange={(ev) => surModifier({ jours: Number(ev.target.value), commits: [] })}
					>
						{JOURS_COMMITS.map((j) => (
							<option key={j} value={j}>
								{j} derniers jours
							</option>
						))}
					</select>
				</label>
				<p className={e.compteurListe} aria-live="polite">
					{coches.length} sur {MAX_COMMITS_POST} au plus
				</p>
			</div>

			{!commits && !erreur && (
				<div className={e.squelette} role="status" aria-label="Chargement des commits">
					{[0, 1, 2].map((i) => (
						<span key={i} />
					))}
				</div>
			)}
			{erreur && (
				<div className={e.erreurBloc} role="alert">
					<p className={p.erreur}>{erreur}</p>
					<button type="button" className={e.lien} onClick={() => setEssai((n) => n + 1)}>
						Réessayer
					</button>
				</div>
			)}
			{commits?.length === 0 && <p className={e.vide}>Aucun commit de ta part sur ce repo depuis {jours} jours.</p>}
			{commits && commits.length > 0 && (
				<ul className={e.liste}>
					{commits.map((c) => {
						const coche = coches.includes(c.sha);
						return (
							<li key={c.sha}>
								<label className={e.ligne}>
									<input
										type="checkbox"
										checked={coche}
										disabled={!coche && coches.length >= MAX_COMMITS_POST}
										onChange={() => basculer(c.sha)}
									/>
									<span className={e.ligneTexte}>
										<span className={e.ligneNom}>{c.message}</span>
										<code className={e.sha}>{c.sha.slice(0, 7)}</code>
									</span>
									<time className={e.ligneDate} dateTime={c.date}>
										{jour(c.date)}
									</time>
								</label>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
