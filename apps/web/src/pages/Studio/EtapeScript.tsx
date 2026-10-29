import { calculerTimeline, QUESTIONS_PUB, TRAMES_PUB } from "@weekli/core";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api, ErreurApi } from "@/lib/api";
import { genererScriptPub, messageErreur } from "@/lib/generation";
import { lireReglages } from "@/lib/reglages";
import { COULEUR_PAR_DEFAUT, type EtatAssistant, exigeCapture, nomProjet, scriptDeDepart, trameSuggeree } from "@/lib/studio/depart";
import type { ScriptPub } from "@weekli/core";
import p from "../Tableau/Panneau.module.css";
import styles from "./Assistant.module.css";
import studio from "./Studio.module.css";

type Props = { etat: EtatAssistant; surCreer: (script: ScriptPub) => Promise<void> };

// Dernier ecran : le script de depart (sans IA) ou, avec une cle API, un script ecrit par Claude dans le navigateur
export function EtapeScript({ etat, surCreer }: Props) {
	const reglages = lireReglages();
	const [occupe, setOccupe] = useState<"" | "depart" | "claude">("");
	const [erreur, setErreur] = useState<{ message: string; details: string[] } | null>(null);
	const [arret, setArret] = useState<AbortController | null>(null);
	const manque = exigeCapture(etat);
	const trame = trameSuggeree(etat);
	const titreTrame = TRAMES_PUB.find((t) => t.trame === trame)?.titre ?? trame;

	const lancer = async (mode: "depart" | "claude") => {
		const controle = new AbortController();
		setArret(controle);
		setOccupe(mode);
		setErreur(null);
		try {
			if (mode === "depart") await surCreer(scriptDeDepart(etat));
			else {
				const repo = await api.repo(etat.repo.repo);
				const { script } = await genererScriptPub(
					reglages.cleApi,
					reglages.modele,
					{
						repo,
						nom: nomProjet(etat.repo.repo),
						reponses: etat.reponses,
						captures: etat.captures,
						marque: { primaire: etat.primaire ?? COULEUR_PAR_DEFAUT, logo: "monogramme", typo: "nette" },
						trameSuggeree: trame,
					},
					controle.signal,
				);
				if (script) await surCreer(script);
			}
		} catch (e) {
			if (!controle.signal.aborted)
				setErreur({ message: e instanceof ErreurApi ? e.message : messageErreur(e), details: e instanceof ErreurApi ? e.details : [] });
		} finally {
			setOccupe("");
			setArret(null);
		}
	};

	const duree = (() => {
		try {
			return Math.round(calculerTimeline(scriptDeDepart(etat)).duree);
		} catch {
			return null;
		}
	})();

	return (
		<>
			<dl className={styles.resume}>
				<dt>Projet</dt>
				<dd>{nomProjet(etat.repo.repo)}</dd>
				{QUESTIONS_PUB.map((q) => (
					<div key={q.cle} className={styles.paire}>
						<dt>{q.question}</dt>
						<dd>{etat.reponses[q.cle]}</dd>
					</div>
				))}
				<dt>Captures</dt>
				<dd>{etat.captures.length ? etat.captures.map((c) => c.legende ?? c.id).join(", ") : "Aucune"}</dd>
				<dt>Trame suggérée</dt>
				<dd>{titreTrame}</dd>
			</dl>

			<div className={styles.voies}>
				<div className={styles.voie}>
					<h3>Script de départ</h3>
					<p>Écrit à partir de tes trois réponses, sans IA et sans appel hors de Weekli.{duree ? ` Environ ${duree} secondes.` : ""} Tu le retouches ensuite scène par scène.</p>
					{manque && <p role="status">Il demande d'abord une capture : reviens à l'étape précédente.</p>}
					<Bouton onClick={() => lancer("depart")} disabled={!!occupe || manque}>
						{occupe === "depart" ? "Création…" : "Créer avec le script de départ"}
					</Bouton>
				</div>
				<div className={styles.voie}>
					<h3>Écrire avec Claude</h3>
					<p>
						{reglages.cleApi
							? "Claude rédige le script depuis ton navigateur avec ta clé API : elle ne passe jamais par Weekli."
							: "Disponible avec ta clé API."}
					</p>
					{reglages.cleApi ? (
						occupe === "claude" ? (
							<Bouton variante="contour" onClick={() => arret?.abort()}>
								Claude écrit… Annuler
							</Bouton>
						) : (
							<Bouton onClick={() => lancer("claude")} disabled={!!occupe}>
								Écrire avec Claude
							</Bouton>
						)
					) : (
						<Link to="/app/reglages">Ajouter ma clé dans les réglages</Link>
					)}
				</div>
			</div>
			<p className={`${p.aide} ${p.aideEspacee}`}>Astuce : dans Claude, demande « Fais la pub de mon projet {etat.repo.repo} avec Weekli » : la pub apparaît ensuite dans Mes pubs.</p>

			{erreur && (
				<div className={`${studio.message} ${studio.alerte}`} role="alert">
					{erreur.message}
					{erreur.details.length > 0 && (
						<ul>
							{erreur.details.map((d) => (
								<li key={d}>{d}</li>
							))}
						</ul>
					)}
				</div>
			)}
		</>
	);
}
