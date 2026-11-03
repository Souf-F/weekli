import { MAX_FICHIERS_TUTO } from "@weekli/core";
import { useEffect, useMemo, useState } from "react";
import { api, type ApercuTuto } from "@/lib/api";
import { LIMITE_SUJET, type ReglagesType } from "@/lib/parcours";
import e from "../Etapes.module.css";
import p from "../Panneau.module.css";
import { ChampTexte } from "./Compteur";

type Props = { repo: string; reglages: ReglagesType; surModifier: (m: Partial<ReglagesType>) => void };

const MAX_SUGGESTIONS = 8;

export function ReglagesTuto({ repo, reglages, surModifier }: Props) {
	const [apercu, setApercu] = useState<ApercuTuto | null>(null);
	const [erreur, setErreur] = useState("");
	const [essai, setEssai] = useState(0);
	const [recherche, setRecherche] = useState("");
	const [ouvert, setOuvert] = useState(false);
	const { fichiers, ajoutes } = reglages;

	useEffect(() => {
		let annule = false;
		setApercu(null);
		setErreur("");
		api
			.fichiersTuto(repo)
			.then((a) => {
				if (annule) return;
				setApercu(a);
				// Premiere arrivee : les fichiers proposes sont tous coches ; un retour sur l'etape garde la selection
				if (reglages.fichiers === null) surModifier({ fichiers: a.proposes.slice(0, MAX_FICHIERS_TUTO) });
			})
			.catch((err: Error) => !annule && setErreur(err.message));
		return () => {
			annule = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [repo, essai]);

	const liste = useMemo(() => {
		const base = apercu?.proposes ?? [];
		return [...base, ...ajoutes.filter((c) => !base.includes(c))];
	}, [apercu, ajoutes]);

	const coches = fichiers ?? [];
	const basculer = (chemin: string) =>
		surModifier({ fichiers: coches.includes(chemin) ? coches.filter((c) => c !== chemin) : [...coches, chemin] });

	const suggestions = useMemo(() => {
		const q = recherche.trim().toLowerCase();
		return (apercu?.arborescence ?? [])
			.filter((c) => !liste.includes(c) && (!q || c.toLowerCase().includes(q)))
			.slice(0, MAX_SUGGESTIONS);
	}, [apercu, liste, recherche]);

	const ajouter = (chemin: string) => {
		if (coches.length >= MAX_FICHIERS_TUTO) return;
		surModifier({ ajoutes: [...ajoutes, chemin], fichiers: [...coches, chemin] });
		setRecherche("");
	};

	const ecartes = apercu ? Object.entries(apercu.ecartes).reduce((n, [cle, v]) => (cle === "refuses" ? n : n + v), 0) : 0;

	return (
		<div className={e.corps}>
			<ChampTexte
				etiquette="Sujet du tuto (facultatif)"
				valeur={reglages.sujet}
				max={LIMITE_SUJET}
				lignes={1}
				surChange={(sujet) => surModifier({ sujet })}
				exemple="Lancer un premier scan et l'intégrer à la CI"
				aide="Sans sujet, Claude t'en propose."
			/>

			<div className={e.bloc}>
				<div className={e.entete}>
					<p className={e.blocTitre}>Fichiers lus</p>
					<p className={e.compteurListe} aria-live="polite">
						{coches.length} fichier{coches.length > 1 ? "s" : ""} sur {MAX_FICHIERS_TUTO}
					</p>
				</div>

				{!apercu && !erreur && (
					<div className={e.squelette} role="status" aria-label="Lecture de l'arborescence">
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
				{apercu && liste.length === 0 && <p className={e.vide}>Aucun fichier proposé. Ajoutes-en depuis l'arborescence.</p>}
				{liste.length > 0 && (
					<ul className={e.liste}>
						{liste.map((chemin) => {
							const coche = coches.includes(chemin);
							return (
								<li key={chemin}>
									<label className={e.ligne}>
										<input
											type="checkbox"
											checked={coche}
											disabled={!coche && coches.length >= MAX_FICHIERS_TUTO}
											onChange={() => basculer(chemin)}
										/>
										<code className={e.chemin}>{chemin}</code>
									</label>
								</li>
							);
						})}
					</ul>
				)}

				{apercu && (
					<>
						{ecartes > 0 && (
							<p className={p.aide}>
								{ecartes} fichier{ecartes > 1 ? "s" : ""} écarté{ecartes > 1 ? "s" : ""} : générés, binaires ou sensibles.
							</p>
						)}
						{apercu.arborescenceTronquee && <p className={p.aide}>Arborescence partielle, repo très grand.</p>}
						<button
							type="button"
							className={e.lien}
							aria-expanded={ouvert}
							aria-controls="ajout-fichier"
							onClick={() => setOuvert((o) => !o)}
						>
							{ouvert ? "Fermer la recherche" : "Ajouter un fichier"}
						</button>
						{ouvert && (
							<div id="ajout-fichier" className={e.ajout}>
								<label className={p.champ}>
									<span>Chercher dans l'arborescence</span>
									<input
										type="search"
										value={recherche}
										autoFocus
										onChange={(ev) => setRecherche(ev.target.value)}
										placeholder="src/, .md, index…"
									/>
								</label>
								{suggestions.length === 0 ? (
									<p className={e.vide}>Aucun autre fichier ne correspond.</p>
								) : (
									<ul className={e.suggestions}>
										{suggestions.map((chemin) => (
											<li key={chemin}>
												<button
													type="button"
													className={e.suggestion}
													disabled={coches.length >= MAX_FICHIERS_TUTO}
													onClick={() => ajouter(chemin)}
												>
													<code className={e.chemin}>{chemin}</code>
													<span>Ajouter</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
