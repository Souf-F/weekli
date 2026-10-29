import type { ScriptPub } from "@weekli/core";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useImagesPub } from "@/hooks/useImagesPub";
import { DELAI_SAUVEGARDE, type EtatSauvegarde, useSauvegarde } from "@/hooks/useSauvegarde";
import { useMoteurPub } from "@/hooks/useMoteurPub";
import { useVoixPub } from "@/hooks/useVoixPub";
import { api, ErreurApi } from "@/lib/api";
import { composerAudio } from "@/lib/pub/audio/index";
import type { Moteur } from "@/lib/pub/moteur";
import { diagnostiquer } from "@/lib/studio/diagnostic";
import { Apercu } from "./Apercu";
import styles from "./Editeur.module.css";
import { Onglets } from "./Onglets";
import { PanneauExport } from "./PanneauExport";
import { PanneauGestes } from "./PanneauGestes";
import { PanneauMarque } from "./PanneauMarque";
import { PanneauScenes } from "./PanneauScenes";
import { PanneauVoix } from "./PanneauVoix";
import studio from "./Studio.module.css";

const ONGLETS = [
	{ id: "scenes", libelle: "Scènes" },
	{ id: "marque", libelle: "Marque" },
	{ id: "gestes", libelle: "Gestes" },
	{ id: "voix", libelle: "Voix" },
];

function libelleEtat(e: EtatSauvegarde): string {
	switch (e.statut) {
		case "enregistre":
			return "Enregistré";
		case "attente":
			return "Modifications en attente…";
		case "en-cours":
			return "Enregistrement…";
		case "refuse":
			return "Non enregistré : le script est refusé";
		case "erreur":
			return `Non enregistré : ${e.message}`;
	}
}

export function Editeur({ id }: { id: string }) {
	const [script, setScript] = useState<ScriptPub | null>(null);
	const [erreur, setErreur] = useState<{ message: string; introuvable: boolean } | null>(null);

	useEffect(() => {
		let vivant = true;
		api
			.pub(id)
			.then((p) => vivant && setScript(p.script))
			.catch((e: Error) => vivant && setErreur({ message: e.message, introuvable: e instanceof ErreurApi && (e.statut === 404 || e.statut === 400) }));
		return () => {
			vivant = false;
		};
	}, [id]);

	if (erreur)
		return (
			<div className={studio.vide}>
				<h2>{erreur.introuvable ? "Cette pub est introuvable." : "Impossible d'ouvrir la pub."}</h2>
				<p>{erreur.message}</p>
				<Link to="?">Retour à mes pubs</Link>
			</div>
		);
	if (!script) return <p className={studio.chargement}>Ouverture de la pub…</p>;
	return <EditeurOuvert id={id} initial={script} />;
}

function EditeurOuvert({ id, initial }: { id: string; initial: ScriptPub }) {
	const [script, setScript] = useState(initial);
	const [onglet, setOnglet] = useState("scenes");
	const [ouverte, setOuverte] = useState<number | null>(null);
	const [sceneSuivie, setSceneSuivie] = useState<number | null>(null);
	const sauvegarde = useSauvegarde(id, script, true);
	const differe = useDeferredValue(script);
	const diagnostic = useMemo(() => diagnostiquer(differe), [differe]);
	// Tant qu'une regle de structure est enfreinte, l'apercu garde le dernier script valide
	const dernierValide = useRef<ScriptPub | null>(diagnostic.script);
	useEffect(() => {
		if (diagnostic.script) dernierValide.current = diagnostic.script;
	}, [diagnostic.script]);

	const { images, version, manquantes, importerLogo, couleurs } = useImagesPub(id, script);
	const voixPub = useVoixPub(script);
	const generer = voixPub.generer;

	// Les durees de voix a jour ; une cle texte evite de reconstruire le moteur quand elles n'ont pas change
	const cleDurees = JSON.stringify(voixPub.valide?.durees ?? {});
	const voixMesurees = useMemo<Record<string, number>>(() => JSON.parse(cleDurees), [cleDurees]);

	const scriptRendu = diagnostic.script ?? dernierValide.current;
	const { moteur, fabriquer, erreur } = useMoteurPub({ script: scriptRendu, images, versionImages: version, voixMesurees, accentParDefaut: couleurs[0] });

	const valide = voixPub.valide;
	const composer = useCallback(async (m: Moteur) => (await composerAudio(m, { voix: valide })).audio, [valide]);
	const surScript = useCallback((s: ScriptPub) => setScript(s), []);
	const surOuverture = useCallback((i: number | null) => {
		setOuverte(i);
		setSceneSuivie(i);
	}, []);
	const surLibre = useCallback(() => setSceneSuivie(null), []);

	const etat = sauvegarde.etat;
	const probleme = etat.statut === "refuse" || etat.statut === "erreur";
	return (
		<div>
			<div className={styles.entete}>
				<div>
					<p className={studio.etiquette}>
						<Link to="?">Mes pubs</Link> / {script.projet.nom}
					</p>
					<h1>{script.titre || "Pub sans titre"}</h1>
				</div>
				<p className={`${styles.etat} ${probleme ? styles.etatAlerte : ""}`} role="status" aria-live="polite">
					{libelleEtat(etat)}
				</p>
			</div>
			{(etat.statut === "refuse" || etat.statut === "erreur") && (
				<div className={`${studio.message} ${studio.alerte}`} role="alert">
					{etat.message}
					{etat.statut === "refuse" && etat.details.length > 0 && (
						<ul>
							{etat.details.map((d) => (
								<li key={d}>{d}</li>
							))}
						</ul>
					)}
					<p>Le script reste modifiable ici, et sera renvoyé après ta prochaine modification (délai de {DELAI_SAUVEGARDE / 1000} s).</p>
				</div>
			)}

			<div className={styles.grille}>
				<aside className={styles.colonne} aria-label="Réglages de la pub">
					<Onglets onglets={ONGLETS} actif={onglet} surChoix={setOnglet} nom="Réglages de la pub" prefixe="editeur">
						{onglet === "scenes" && <PanneauScenes script={script} diagnostic={diagnostic} ouverte={ouverte} surOuverture={surOuverture} surScript={surScript} />}
						{onglet === "marque" && <PanneauMarque script={script} couleurs={couleurs} surScript={surScript} surLogo={importerLogo} />}
						{onglet === "gestes" && <PanneauGestes script={script} surScript={surScript} />}
						{onglet === "voix" && (
							<PanneauVoix
								script={script}
								surScript={surScript}
								voix={voixPub.voix}
								perimee={voixPub.perimee}
								progression={voixPub.progression}
								etat={voixPub.etat}
								erreur={voixPub.erreur}
								generer={(f) => generer(script, f)}
								annuler={voixPub.annuler}
							/>
						)}
					</Onglets>
				</aside>

				<div className={styles.centre}>
					<Apercu moteur={moteur} composer={composer} sceneSuivie={onglet === "scenes" ? sceneSuivie : null} surLibre={surLibre} erreur={erreur} />
					{manquantes.length > 0 && (
						<div className={studio.message} role="status">
							Images à revoir :
							<ul>
								{manquantes.map((m) => (
									<li key={m.id}>
										{m.id} : {m.raison}
									</li>
								))}
							</ul>
						</div>
					)}
					<PanneauExport script={diagnostic.script} fabriquer={fabriquer} voixValide={valide} genererVoix={generer} imagesManquantes={manquantes.length} />
				</div>
			</div>
		</div>
	);
}
