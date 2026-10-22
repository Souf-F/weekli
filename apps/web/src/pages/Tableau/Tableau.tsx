import { useEffect, useMemo, useRef, useState } from "react";
import type { Activite, ActiviteRepo, DetailsCommit, OptionsGeneration, Post } from "@weekli/core";
import { Link, useOutletContext } from "react-router-dom";
import type { ContexteApp } from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { genererPosts, messageErreur } from "@/lib/generation";
import { lireReglages } from "@/lib/reglages";
import { CartePost } from "./CartePost";
import { cleCommit, PanneauActivite } from "./PanneauActivite";
import { PanneauOptions } from "./PanneauOptions";
import p from "./Panneau.module.css";
import styles from "./Tableau.module.css";

const MAX_DIFFS = 5;

export function Tableau() {
	const { moi } = useOutletContext<ContexteApp>();
	const reglages = useMemo(lireReglages, []);

	const [jours, setJours] = useState(7);
	const [activite, setActivite] = useState<Activite | null>(null);
	const [chargement, setChargement] = useState(true);
	const [erreurActivite, setErreurActivite] = useState("");
	const [selection, setSelection] = useState<Set<string>>(new Set());

	const [options, setOptions] = useState<OptionsGeneration>({
		ton: "retour",
		langue: "fr",
		nombre: 2,
		style: reglages.style,
	});
	const [inclureDiffs, setInclureDiffs] = useState(true);
	const [posts, setPosts] = useState<Post[]>([]);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState("");
	const arret = useRef<AbortController | null>(null);

	// Chargement de l'activite ; tout est coche par defaut
	useEffect(() => {
		let annule = false;
		setChargement(true);
		setErreurActivite("");
		api
			.activite(jours)
			.then((a) => {
				if (annule) return;
				setActivite(a);
				setSelection(new Set(a.repos.flatMap((r) => r.commits.map((c) => cleCommit(r.repo, c.sha)))));
			})
			.catch((e) => !annule && setErreurActivite(e.message))
			.finally(() => !annule && setChargement(false));
		return () => {
			annule = true;
		};
	}, [jours]);

	const basculer = (cle: string) =>
		setSelection((s) => {
			const n = new Set(s);
			if (n.has(cle)) n.delete(cle);
			else n.add(cle);
			return n;
		});

	const basculerRepo = (repo: string, coche: boolean) =>
		setSelection((s) => {
			const n = new Set(s);
			for (const c of activite?.repos.find((r) => r.repo === repo)?.commits ?? []) {
				if (coche) n.add(cleCommit(repo, c.sha));
				else n.delete(cleCommit(repo, c.sha));
			}
			return n;
		});

	const generer = async () => {
		if (!activite) return;
		const repos: ActiviteRepo[] = activite.repos
			.map((r) => ({ ...r, commits: r.commits.filter((c) => selection.has(cleCommit(r.repo, c.sha))) }))
			.filter((r) => r.commits.length > 0);

		arret.current = new AbortController();
		setEnCours(true);
		setErreur("");
		setPosts([]);
		try {
			let details: DetailsCommit[] = [];
			if (inclureDiffs) {
				const choisis = repos.flatMap((r) => r.commits.map((c) => [r.repo, c.sha] as const)).slice(0, MAX_DIFFS);
				details = await Promise.all(choisis.map(([repo, sha]) => api.commit(repo, sha)));
			}
			const final = await genererPosts({
				cleApi: reglages.cleApi,
				modele: reglages.modele,
				repos,
				details,
				options,
				surProgression: setPosts,
				signal: arret.current.signal,
			});
			setPosts(final);
		} catch (e) {
			if (!arret.current?.signal.aborted) setErreur(messageErreur(e));
		} finally {
			setEnCours(false);
		}
	};

	return (
		<div className={styles.grille}>
			<div className={styles.colonne}>
				<PanneauActivite
					jours={jours}
					surJours={setJours}
					activite={activite}
					chargement={chargement}
					erreur={erreurActivite}
					selection={selection}
					surBasculer={basculer}
					surBasculerRepo={basculerRepo}
				/>
			</div>

			<div className={styles.colonne}>
				<PanneauOptions
					options={options}
					surOptions={setOptions}
					inclureDiffs={inclureDiffs}
					surInclureDiffs={setInclureDiffs}
					nbSelection={selection.size}
					enCours={enCours}
					sansCle={!reglages.cleApi}
					surGenerer={generer}
					surArreter={() => arret.current?.abort()}
				/>
				{!reglages.cleApi && (
					<p className={p.aide}>
						Pas encore de clé ? <Link to="/app/reglages">Ajoute-la ici</Link>, ou utilise Weekli directement dans
						Claude.
					</p>
				)}
			</div>

			<section className={styles.posts}>
				{erreur && <p className={p.erreur}>{erreur}</p>}
				{posts.length === 0 && !enCours && !erreur && (
					<div className={styles.vide}>
						<h2>
							Tes posts
							<br />
							<em>apparaîtront ici.</em>
						</h2>
						<p className={p.aide}>Choisis tes commits, règle l'angle, puis lance la génération.</p>
					</div>
				)}
				{enCours && posts.length === 0 && <p className={p.aide}>Claude lit ta semaine…</p>}
				{posts.map((post, i) => (
					<CartePost
						key={i}
						post={post}
						moi={moi}
						enCours={enCours}
						surModifier={(texte) => setPosts((ps) => ps.map((x, j) => (j === i ? { ...x, texte } : x)))}
					/>
				))}
			</section>
		</div>
	);
}
