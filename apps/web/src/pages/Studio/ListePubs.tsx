import type { PubResume } from "@weekli/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { stockageLocal, supprimerImagesPub } from "@/lib/studio/images";
import p from "../Tableau/Panneau.module.css";
import styles from "./ListePubs.module.css";
import studio from "./Studio.module.css";
import { vignette } from "./vignette";

const MAX_PUBS = 20;
const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function Vignette({ id }: { id: string }) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [etat, setEtat] = useState<"attente" | "prete" | "echec">("attente");

	useEffect(() => {
		const cible = canvas.current;
		if (!cible) return;
		let vivant = true;
		const observer = new IntersectionObserver(([e]) => {
			if (!e.isIntersecting) return;
			observer.disconnect();
			vignette(cible, id)
				.then(() => vivant && setEtat("prete"))
				.catch(() => vivant && setEtat("echec"));
		});
		observer.observe(cible);
		return () => {
			vivant = false;
			observer.disconnect();
		};
	}, [id]);

	return (
		<span className={styles.vignette} aria-hidden="true">
			<canvas ref={canvas} hidden={etat !== "prete"} />
			{etat !== "prete" && <span className={styles.attente}>{etat === "echec" ? "Sans vignette" : "Vignette"}</span>}
		</span>
	);
}

export function ListePubs() {
	const [pubs, setPubs] = useState<PubResume[] | null>(null);
	const [erreur, setErreur] = useState("");
	const [confirmer, setConfirmer] = useState("");
	const [occupe, setOccupe] = useState("");
	const [copie, setCopie] = useState(false);

	const charger = useCallback(() => {
		api
			.pubs()
			.then(setPubs)
			.catch((e: Error) => setErreur(e.message));
	}, []);
	useEffect(charger, [charger]);

	const supprimer = async (id: string) => {
		setOccupe(id);
		setErreur("");
		try {
			await api.supprimerPub(id);
			await supprimerImagesPub(id);
			setConfirmer("");
			charger();
		} catch (e) {
			setErreur(e instanceof Error ? e.message : "Suppression impossible");
		} finally {
			setOccupe("");
		}
	};

	// La copie reprend le script et les images importees (elles restent sur cet appareil)
	const dupliquer = async (id: string) => {
		setOccupe(id);
		setErreur("");
		try {
			const source = await api.pub(id);
			const { pub } = await api.creerPub({ ...source.script, titre: `${source.script.titre} (copie)`.slice(0, 80) });
			const s = await stockageLocal();
			for (const m of await s.lister(`${id}/`)) await s.enregistrer(`${pub.id}/${m.cle.slice(id.length + 1)}`, m.genre, m.nom, m.blob);
			charger();
		} catch (e) {
			setErreur(e instanceof Error ? e.message : "Copie impossible");
		} finally {
			setOccupe("");
		}
	};

	const prompt = "Fais la pub de mon projet <repo> avec Weekli";
	const copier = async () => {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopie(true);
		} catch {
			setCopie(false);
		}
	};

	return (
		<div>
			<div className={studio.entete}>
				<h1>
					Mes pubs
					<br />
					<em>vidéo.</em>
				</h1>
				{pubs && pubs.length >= MAX_PUBS ? <Bouton disabled>Nouvelle pub</Bouton> : <Bouton vers="?nouveau">Nouvelle pub</Bouton>}
			</div>

			{pubs && pubs.length >= MAX_PUBS && <p className={studio.message}>20 pubs au maximum : supprime une ancienne pub pour en créer une autre.</p>}
			{erreur && (
				<p className={`${studio.message} ${studio.alerte}`} role="alert">
					{erreur}
				</p>
			)}
			{!pubs && !erreur && <p className={studio.chargement}>Chargement de tes pubs…</p>}

			{pubs?.length === 0 && (
				<div className={studio.vide}>
					<h2>Aucune pub pour l'instant.</h2>
					<p>Choisis un projet, réponds à trois questions, et Weekli prépare une pub de 60 secondes que tu ajustes ici.</p>
					<p className={p.aide}>Tu peux aussi la demander à Claude, une fois Weekli connecté :</p>
					<div className={studio.invite}>
						<code>{prompt}</code>
						<Bouton variante="contour" taille="petit" onClick={copier}>
							{copie ? "Copié" : "Copier"}
						</Bouton>
					</div>
					<Bouton vers="?nouveau">Créer ma première pub</Bouton>
				</div>
			)}

			{!!pubs?.length && (
				<ul className={styles.grille}>
					{pubs.map((pub) => (
						<li key={pub.id} className={styles.carte}>
							<Link to={`?pub=${pub.id}`} tabIndex={-1} aria-hidden="true">
								<Vignette id={pub.id} />
							</Link>
							<div className={styles.corps}>
								<h2>
									<Link to={`?pub=${pub.id}`}>{pub.titre || pub.projet}</Link>
								</h2>
								<p className={styles.meta}>
									{pub.projet} · {pub.scenes} scènes · modifiée le {date(pub.maj)}
								</p>
							</div>
							{confirmer === pub.id ? (
								<div className={styles.confirmation} role="group" aria-label={`Supprimer ${pub.titre}`}>
									<span>Supprimer cette pub ?</span>
									<Bouton taille="petit" className={styles.danger} onClick={() => supprimer(pub.id)} disabled={occupe === pub.id}>
										Oui, supprimer
									</Bouton>
									<Bouton variante="contour" taille="petit" onClick={() => setConfirmer("")}>
										Annuler
									</Bouton>
								</div>
							) : (
								<div className={styles.boutons}>
									<Bouton vers={`?pub=${pub.id}`} taille="petit" aria-label={`Ouvrir ${pub.titre || pub.projet}`}>
										Ouvrir
									</Bouton>
									<Bouton variante="contour" taille="petit" onClick={() => dupliquer(pub.id)} disabled={occupe === pub.id || pubs.length >= MAX_PUBS} aria-label={`Dupliquer ${pub.titre || pub.projet}`}>
										Dupliquer
									</Bouton>
									<Bouton variante="contour" taille="petit" onClick={() => setConfirmer(pub.id)} aria-label={`Supprimer ${pub.titre || pub.projet}`}>
										Supprimer
									</Bouton>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
