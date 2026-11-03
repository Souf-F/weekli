import type { ScriptPub } from "@weekli/core";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { messageErreur } from "@/lib/generation";
import { genererPostProjet, type ReponsePost, type VersionPost } from "@/lib/post-projet";
import { lireReglages } from "@/lib/reglages";
import { chargerStyle } from "@/lib/style";
import p from "../Tableau/Panneau.module.css";
import styles from "./PanneauPost.module.css";

type Props = { id: string; script: ScriptPub };
type Phase = "repos" | "charge" | "questions" | "versions";

// Panneau « Post LinkedIn » : en mode cle API, Claude ecrit 2 ou 3 versions depuis le navigateur ; sans cle, la voie est Claude
export function PanneauPost({ id, script }: Props) {
	const reglages = lireReglages();
	const [phase, setPhase] = useState<Phase>("repos");
	const [questions, setQuestions] = useState<ReponsePost[]>([]);
	const [versions, setVersions] = useState<VersionPost[]>([]);
	const [erreur, setErreur] = useState("");
	const [copiee, setCopiee] = useState<number | null>(null);
	const arret = useRef<AbortController | null>(null);

	useEffect(() => () => arret.current?.abort(), []);
	useEffect(() => {
		if (copiee === null) return;
		const t = setTimeout(() => setCopiee(null), 2000);
		return () => clearTimeout(t);
	}, [copiee]);

	const lancer = async (reponses: ReponsePost[]) => {
		const controle = new AbortController();
		arret.current = controle;
		setPhase("charge");
		setErreur("");
		try {
			const [repo, domaines, style] = await Promise.all([
				api.repo(script.projet.repo),
				api.domaines().catch(() => []),
				chargerStyle().catch(() => ({ exemples: "", profil: "", maj: null })),
			]);
			const maintenant = new Date().toISOString();
			const resultat = await genererPostProjet(
				reglages.cleApi,
				reglages.modele,
				{ infos: repo, domaines: domaines.map((d) => d.hote), pub: { id, cree: maintenant, maj: maintenant, script }, style },
				reponses,
				controle.signal,
			);
			if (resultat.versions.length) {
				setVersions(resultat.versions);
				setPhase("versions");
			} else {
				setQuestions(resultat.questions.map((question) => ({ question, reponse: "" })));
				setPhase("questions");
			}
		} catch (e) {
			if (controle.signal.aborted) return;
			setErreur(messageErreur(e));
			setPhase(reponses.length ? "questions" : versions.length ? "versions" : "repos");
		}
	};

	const copier = async (i: number) => {
		try {
			await navigator.clipboard.writeText(versions[i].texte);
			setCopiee(i);
			setErreur("");
		} catch {
			setErreur("Copie impossible : sélectionne le texte et copie-le à la main.");
		}
	};

	const annuler = () => {
		arret.current?.abort();
		setPhase(versions.length ? "versions" : questions.length ? "questions" : "repos");
	};

	const modifier = (i: number, texte: string) => setVersions((vs) => vs.map((v, j) => (j === i ? { ...v, texte } : v)));
	const repondre = (i: number, reponse: string) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, reponse } : q)));

	return (
		<section className={styles.panneau} aria-labelledby="titre-post">
			<h2 id="titre-post">
				Post LinkedIn
			</h2>

			{!reglages.cleApi && (
				<>
					<p className={p.aide}>
						Weekli ne rédige pas sans clé API. Le post de ton projet s'obtient dans Claude : demande-lui « propose-moi un
						post pour mon projet {script.projet.repo} ». Il lit le projet, la pub et ton style, te pose les questions qui
						manquent, puis propose 2 ou 3 versions.
					</p>
					<p className={p.aide}>
						Tu préfères écrire depuis ici ? <Link to="/app/reglages">Ajoute ta clé API dans les réglages</Link>.
					</p>
				</>
			)}

			{reglages.cleApi && phase === "repos" && (
				<>
					<p className={p.aide}>
						Claude écrit 2 ou 3 versions du post qui accompagne la pub, depuis ton navigateur avec ta clé API. Il part de
						ton README, de ta pub et de ton style, et te demande le pourquoi et la démarche s'ils manquent.
					</p>
					<Bouton onClick={() => lancer([])}>Proposer des posts</Bouton>
				</>
			)}

			{phase === "charge" && (
				<div className={styles.attente}>
					<p role="status">Claude rédige…</p>
					<Bouton variante="contour" taille="petit" onClick={annuler}>
						Annuler
					</Bouton>
				</div>
			)}

			{phase === "questions" && (
				<form
					className={styles.questions}
					onSubmit={(e) => {
						e.preventDefault();
						void lancer(questions);
					}}
				>
					<p className={p.aide}>Avant d'écrire, Claude a besoin de toi : ce sont des choses qu'il ne doit pas deviner.</p>
					{questions.map((q, i) => (
						<label key={q.question} className={p.champ}>
							{q.question}
							<textarea rows={3} value={q.reponse} onChange={(e) => repondre(i, e.target.value)} maxLength={1500} />
						</label>
					))}
					<Bouton type="submit">Écrire les posts</Bouton>
				</form>
			)}

			{phase === "versions" && (
				<>
					<ul className={styles.versions}>
						{versions.map((v, i) => (
							<li key={i} className={styles.version}>
								<label className={p.champ} htmlFor={`post-${i}`}>
									Version {i + 1}
									{v.angle && <span className={styles.angle}> · {v.angle}</span>}
								</label>
								<textarea id={`post-${i}`} rows={12} value={v.texte} onChange={(e) => modifier(i, e.target.value)} />
								<div className={styles.pied}>
									<span className={styles.compteur}>{v.texte.length} caractères</span>
									<Bouton taille="petit" onClick={() => copier(i)}>
										{copiee === i ? "Copié" : "Copier"}
									</Bouton>
								</div>
							</li>
						))}
					</ul>
					<div className={styles.actions}>
						<Bouton variante="contour" onClick={() => lancer(questions)}>
							Régénérer
						</Bouton>
					</div>
					<p className={p.aide}>
						La vidéo accompagne le post : joins-la à la publication. Relis chaque version, Weekli ne publie rien à ta
						place.
					</p>
				</>
			)}

			<p className={styles.copie} role="status" aria-live="polite">
				{copiee !== null ? `Version ${copiee + 1} copiée dans le presse-papiers.` : ""}
			</p>
			{erreur && (
				<p className={p.erreur} role="alert">
					{erreur}
				</p>
			)}
		</section>
	);
}
