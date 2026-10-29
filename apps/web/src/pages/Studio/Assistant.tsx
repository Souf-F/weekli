import type { CaptureRef, Hex, RepoResume, ScriptPub } from "@weekli/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { type EtatAssistant, exigeCapture, MAX_CAPTURES_STUDIO, type Reponses, reponsesCompletes } from "@/lib/studio/depart";
import { couleursDeImage, rattacherImages } from "@/lib/studio/images";
import styles from "./Assistant.module.css";
import { EtapeCaptures } from "./EtapeCaptures";
import { EtapeProjet } from "./EtapeProjet";
import { EtapeQuestions } from "./EtapeQuestions";
import { EtapeScript } from "./EtapeScript";
import studio from "./Studio.module.css";

const ETAPES = [
	{ titre: "Choisis le projet", intro: "Ta pub parle d'un seul projet. Weekli liste tes repos publics, même sans commit récent." },
	{ titre: "Trois questions", intro: "Réponds comme tu parlerais à un ami : la pub parle de ce que ton projet change, pas de comment il est fait." },
	{ titre: "Des captures, si tu veux", intro: "Les captures deviennent des cartes animées de quelques secondes. Elles servent aussi à proposer les couleurs de ta marque." },
	{ titre: "Le script", intro: "Une dernière vérification, puis la pub s'ouvre dans l'éditeur." },
] as const;
const NOMS = ["Projet", "Questions", "Captures", "Script"] as const;

export function Assistant() {
	const navigate = useNavigate();
	const [etape, setEtape] = useState(0);
	const [repo, setRepo] = useState<RepoResume | null>(null);
	const [reponses, setReponses] = useState<Reponses>({ pourQui: "", probleme: "", promesse: "" });
	const [captures, setCaptures] = useState<CaptureRef[]>([]);
	const [primaire, setPrimaire] = useState<Hex | null>(null);
	const [medias, setMedias] = useState<ReadonlyMap<string, Blob>>(new Map());
	const titre = useRef<HTMLHeadingElement>(null);

	// Le titre de l'etape recoit le focus : un lecteur d'ecran et le clavier suivent le parcours
	useEffect(() => titre.current?.focus(), [etape]);

	// La couleur de la marque est proposee d'apres la premiere capture
	const premiere = captures[0]?.id;
	useEffect(() => {
		const blob = premiere ? medias.get(premiere) : undefined;
		if (!blob) {
			setPrimaire(null);
			return;
		}
		let vivant = true;
		couleursDeImage(blob)
			.then((c) => vivant && setPrimaire(c.accent))
			.catch(() => vivant && setPrimaire(null));
		return () => {
			vivant = false;
		};
	}, [premiere, medias]);

	const etat = useMemo<EtatAssistant | null>(() => (repo ? { repo, reponses, captures, primaire } : null), [repo, reponses, captures, primaire]);

	const ajouter = (ref: CaptureRef, blob: Blob) => {
		setMedias((m) => new Map(m).set(ref.id, blob));
		setCaptures((c) => (c.length >= MAX_CAPTURES_STUDIO ? c : [...c, ref]));
	};
	const retirer = (id: string) => {
		setMedias((m) => {
			const suite = new Map(m);
			suite.delete(id);
			return suite;
		});
		setCaptures((c) => c.filter((x) => x.id !== id));
	};

	const creer = async (script: ScriptPub) => {
		const { pub } = await api.creerPub(script);
		const importees = new Map<string, File>();
		for (const c of script.captures) {
			const blob = medias.get(c.id);
			if (c.source === "importee" && blob instanceof File) importees.set(c.id, blob);
		}
		await rattacherImages(pub.id, importees);
		navigate(`?pub=${pub.id}`);
	};

	const peutContinuer = etape === 0 ? !!repo : etape === 1 ? reponsesCompletes(reponses) : true;
	const manque = etat ? exigeCapture(etat) : false;

	return (
		<div>
			<div className={studio.entete}>
				<h1>
					Nouvelle pub
					<br />
					<em>de projet.</em>
				</h1>
				<Bouton vers="?" variante="contour" taille="petit">
					Retour à mes pubs
				</Bouton>
			</div>

			<ol className={styles.etapes} aria-label="Étapes">
				{NOMS.map((nom, i) => (
					<li key={nom} aria-current={i === etape ? "step" : undefined} data-fait={i < etape}>
						{nom}
						{i < etape && <span className={studio.masque}> (terminée)</span>}
					</li>
				))}
			</ol>

			<section className={styles.corps} aria-labelledby="titre-etape">
				<h2 id="titre-etape" ref={titre} tabIndex={-1}>
					{ETAPES[etape].titre}
				</h2>
				<p className={styles.intro}>{ETAPES[etape].intro}</p>

				{etape === 0 && <EtapeProjet repo={repo} surChoix={setRepo} />}
				{etape === 1 && <EtapeQuestions reponses={reponses} surChangement={setReponses} />}
				{etape === 2 && etat && <EtapeCaptures captures={captures} medias={medias} exige={manque} surAjout={ajouter} surRetrait={retirer} />}
				{etape === 3 && etat && <EtapeScript etat={etat} surCreer={creer} />}

				<div className={styles.pied}>
					{etape > 0 && (
						<Bouton variante="contour" onClick={() => setEtape(etape - 1)}>
							Retour
						</Bouton>
					)}
					{etape < ETAPES.length - 1 && (
						<Bouton onClick={() => setEtape(etape + 1)} disabled={!peutContinuer}>
							{etape === 2 && captures.length === 0 ? "Continuer sans capture" : "Continuer"}
						</Bouton>
					)}
				</div>
			</section>
		</div>
	);
}
