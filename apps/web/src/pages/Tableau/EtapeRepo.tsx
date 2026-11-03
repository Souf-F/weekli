import type { RepoResume } from "@weekli/core";
import { useMemo, useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import p from "./Panneau.module.css";
import e from "./Etapes.module.css";

type Props = {
	repos: RepoResume[] | null;
	chargement: boolean;
	erreur: string;
	surReessayer: () => void;
	// Plusieurs repos possibles quand le type choisi est "Ma semaine"
	multi: boolean;
	selection: string[];
	surChoisir: (repo: string) => void;
	surContinuer: () => void;
};

const SEUIL_RECHERCHE = 8;

function dateRelative(iso: string): string {
	const jours = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
	const f = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
	if (Math.abs(jours) < 30) return f.format(jours, "day");
	if (Math.abs(jours) < 365) return f.format(Math.round(jours / 30), "month");
	return f.format(Math.round(jours / 365), "year");
}

export function EtapeRepo({ repos, chargement, erreur, surReessayer, multi, selection, surChoisir, surContinuer }: Props) {
	const [recherche, setRecherche] = useState("");
	const visibles = useMemo(() => {
		const q = recherche.trim().toLowerCase();
		return (repos ?? []).filter((r) => !q || `${r.repo} ${r.description}`.toLowerCase().includes(q));
	}, [repos, recherche]);

	return (
		<div className={e.corps}>
			<h2 id="titre-etape" tabIndex={-1} className={e.titre}>
				{multi ? "Quels repos ?" : "Quel repo ?"}
			</h2>
			<p className={p.aide}>
				{multi
					? "Coche les repos de ta semaine. Aucun repo coché : tous les repos publics."
					: "Weekli ne lit que tes repos publics, sans les forks."}
			</p>

			{chargement && (
				<div className={e.squelette} role="status" aria-label="Chargement des repos">
					{[0, 1, 2].map((i) => (
						<span key={i} />
					))}
				</div>
			)}

			{erreur && (
				<div className={e.erreurBloc} role="alert">
					<p className={p.erreur}>{erreur}</p>
					<Bouton variante="contour" taille="petit" onClick={surReessayer}>
						Réessayer
					</Bouton>
				</div>
			)}

			{repos && repos.length === 0 && (
				<p className={e.vide}>Aucun repo public. Weekli ne lit que les repos publics.</p>
			)}

			{repos && repos.length >= SEUIL_RECHERCHE && (
				<label className={`${p.champ} ${e.recherche}`}>
					<span>Rechercher un repo</span>
					<input type="search" value={recherche} onChange={(ev) => setRecherche(ev.target.value)} placeholder="Nom ou description" />
				</label>
			)}

			{repos && repos.length > 0 && (
				<fieldset className={e.liste}>
					<legend className={e.lecteur}>{multi ? "Repos de la semaine" : "Repo du post"}</legend>
					{visibles.map((r) => (
						<label key={r.repo} className={e.ligne}>
							<input
								type={multi ? "checkbox" : "radio"}
								name="repo"
								checked={selection.includes(r.repo)}
								onChange={() => surChoisir(r.repo)}
								onDoubleClick={multi ? undefined : surContinuer}
								onKeyDown={(ev) => {
									if (ev.key === "Enter" && !multi) {
										ev.preventDefault();
										surContinuer();
									}
								}}
							/>
							<span className={e.ligneTexte}>
								<span className={e.ligneNom}>{r.repo}</span>
								<span className={e.ligneDescription}>{r.description || "Sans description"}</span>
							</span>
							<time className={e.ligneDate} dateTime={r.maj}>
								{dateRelative(r.maj)}
							</time>
						</label>
					))}
					{visibles.length === 0 && <p className={e.vide}>Aucun repo ne correspond à cette recherche.</p>}
				</fieldset>
			)}
		</div>
	);
}
