import { CATALOGUE_POSTS, estTypePost, MAX_COMMITS_POST, type RepoResume, type TypePost } from "@weekli/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import type { ContexteApp } from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { aSaisie, composerNotes, demandeDonnees, messageValidation, nomCourtRepo, type ReglagesType as Reglages, reglagesVides } from "@/lib/parcours";
import { lireReglages } from "@/lib/reglages";
import { EtapeRepo } from "./EtapeRepo";
import { EtapeType } from "./EtapeType";
import { ETAPES, type NumeroEtape } from "./etapes";
import e from "./Etapes.module.css";
import { FilEtapes } from "./FilEtapes";
import { Redaction } from "./Redaction";
import { ReglagesType } from "./ReglagesType";
import p from "./Panneau.module.css";
import styles from "./Tableau.module.css";
import type { DemandeRedaction } from "./types";
import { useSemaine } from "./useSemaine";

// Mode demonstration, developpement uniquement : le bloc disparait du build de production
const demo =
	import.meta.env.DEV && new URLSearchParams(location.search).has("demo") ? await import("./demo/installer") : null;
demo?.installerDemo();

const CLE_DERNIER_REPO = "weekli.dernierRepo";

// Confort par navigateur : jamais le texte saisi, seulement le nom du dernier repo
const lireDernierRepo = (): string => {
	try {
		return localStorage.getItem(CLE_DERNIER_REPO) ?? "";
	} catch {
		return "";
	}
};
const memoriserRepo = (repo: string) => {
	try {
		localStorage.setItem(CLE_DERNIER_REPO, repo);
	} catch {
		/* stockage indisponible : le parcours fonctionne sans */
	}
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function Tableau() {
	const { moi } = useOutletContext<ContexteApp>();
	const reglagesApp = useMemo(lireReglages, []);
	const [params, setParams] = useSearchParams();

	const [repos, setRepos] = useState<RepoResume[] | null>(null);
	const [chargement, setChargement] = useState(true);
	const [erreurRepos, setErreurRepos] = useState("");
	const [essai, setEssai] = useState(0);

	const [etape, setEtape] = useState<NumeroEtape>(1);
	const [choisis, setChoisis] = useState<string[]>([]);
	const [type, setType] = useState<TypePost | null>(null);
	const [reglages, setReglages] = useState<Reglages>(reglagesVides);
	const [demande, setDemande] = useState<DemandeRedaction | null>(null);
	const [annonce, setAnnonce] = useState("");
	const initialise = useRef(false);
	const aFocaliser = useRef(false);

	const multi = type === "semaine";
	const semaine = useSemaine(type === "semaine" && etape === 3, choisis);

	// Etape 1 : liste des repos publics
	useEffect(() => {
		let annule = false;
		setChargement(true);
		setErreurRepos("");
		api
			.repos()
			.then((r) => !annule && setRepos(r))
			.catch((err: Error) => !annule && setErreurRepos(err.message))
			.finally(() => !annule && setChargement(false));
		return () => {
			annule = true;
		};
	}, [essai]);

	// Lien profond ?repo=&type= : une seule lecture, quand les repos sont connus
	useEffect(() => {
		if (initialise.current || chargement) return;
		initialise.current = true;
		const typeUrl = params.get("type");
		const repoUrl = params.get("repo") ?? "";
		const typeValide = estTypePost(typeUrl) ? typeUrl : null;
		const repoValide = repos?.some((r) => r.repo === repoUrl) ? repoUrl : "";
		const dernier = lireDernierRepo();
		if (typeValide) setType(typeValide);
		if (repoValide) setChoisis([repoValide]);
		else if (dernier && repos?.some((r) => r.repo === dernier) && !typeValide) setChoisis([dernier]);
		if (typeValide === "semaine" || (typeValide && repoValide)) setEtape(3);
		else if (repoValide) setEtape(2);
	}, [chargement]);

	// Seuls repo et type vont dans l'URL ; le drapeau ?demo du developpement est conserve
	useEffect(() => {
		if (!initialise.current) return;
		setParams(
			(prec) => {
				const n = new URLSearchParams(prec);
				if (type !== "semaine" && choisis[0]) n.set("repo", choisis[0]);
				else n.delete("repo");
				if (type) n.set("type", type);
				else n.delete("type");
				return n;
			},
			{ replace: true },
		);
	}, [choisis, type, setParams]);

	// Le focus va sur le titre de l'etape qui s'ouvre, et le changement est annonce
	useEffect(() => {
		if (!aFocaliser.current) return;
		document.getElementById(etape === 4 ? "zone-posts" : "titre-etape")?.focus();
	}, [etape]);

	const aller = useCallback((n: NumeroEtape) => {
		aFocaliser.current = true;
		setEtape(n);
		setAnnonce(`Étape ${n} sur 4 : ${ETAPES[n - 1].nom}`);
	}, []);

	const confirmerPerte = () => !aSaisie(reglages) || window.confirm("Changer de choix efface les réglages saisis. Continuer ?");

	const changerRepos = (repo: string) => {
		if (multi) {
			setChoisis((c) => (c.includes(repo) ? c.filter((x) => x !== repo) : [...c, repo]));
			return;
		}
		if (choisis[0] === repo) return;
		if (!confirmerPerte()) return;
		setChoisis([repo]);
		setReglages(reglagesVides());
		setDemande(null);
		memoriserRepo(repo);
	};

	const changerType = (t: TypePost) => {
		if (t === type) return;
		if (!confirmerPerte()) return;
		setType(t);
		setReglages(reglagesVides());
		setDemande(null);
		// Un type de repo unique garde le premier repo ; sans repo, retour a l'etape 1
		if (t !== "semaine" && choisis.length > 1) setChoisis(choisis.slice(0, 1));
		if (t !== "semaine" && choisis.length === 0) aller(1);
	};

	const modifier = useCallback((m: Partial<Reglages>) => setReglages((r) => ({ ...r, ...m })), []);

	// Validation de l'etape 3
	const message = !type
		? ""
		: type === "semaine"
			? semaine.selection.size === 0
				? "Coche au moins un commit."
				: ""
			: messageValidation(type, reglages);

	const peutContinuer =
		etape === 1 ? (multi ? true : choisis.length === 1) : etape === 2 ? type !== null : etape === 3 ? message === "" : false;

	const continuer = () => {
		if (!peutContinuer) return;
		if (etape < 3) {
			aller((etape + 1) as NumeroEtape);
			return;
		}
		if (!type) return;
		setDemande({
			id: (demande?.id ?? 0) + 1,
			type,
			donnees: type === "semaine" ? { type } : demandeDonnees(type, choisis[0], reglages),
			notes: composerNotes(type, reglages),
			semaine:
				type === "semaine"
					? { repos: semaine.reposChoisis(), inclureDiffs: semaine.inclureDiffs, options: semaine.options }
					: undefined,
		});
		aller(4);
	};

	const resumeReglages = (): string => {
		if (!type) return "";
		switch (type) {
			case "presentation":
				return reglages.pourquoi || reglages.demarche ? "Réponses données" : "Aucun réglage";
			case "tuto":
				return pluriel(reglages.fichiers?.length ?? 0, "fichier");
			case "coulisses":
				return `${reglages.commits.length} sur ${MAX_COMMITS_POST} commits`;
			case "lecon":
				return reglages.probleme.trim() ? "Problème décrit" : pluriel(reglages.commits.length, "commit");
			default:
				return pluriel(semaine.selection.size, "commit");
		}
	};

	const resumes: Record<NumeroEtape, string> = {
		1: multi ? (choisis.length > 0 ? pluriel(choisis.length, "repo") : "Tous les repos") : choisis[0] ?? "",
		2: type ? CATALOGUE_POSTS[type].nom : "",
		3: resumeReglages(),
		4: "",
	};

	const nomsRepos = choisis.map(nomCourtRepo);

	return (
		<div className={styles.page}>
			<header className={styles.entete}>
				<p className={styles.surtitre}>Tableau de bord</p>
				<h1>
					Quel post, <em>aujourd'hui ?</em>
				</h1>
				<p className={styles.chapo}>Choisis le projet et ce que tu veux raconter, Claude rédige. Tu relis, tu ajustes, tu copies.</p>
			</header>

			<FilEtapes etape={etape} resumes={resumes} surAller={aller} />
			<p className={e.lecteur} role="status" aria-live="polite">
				{annonce}
			</p>

			<div className={styles.grille} data-etape={etape}>
				<div className={styles.atelier}>
					{/* Etapes faites : repliees en une ligne resume cliquable (poste de travail uniquement) */}
					{ETAPES.slice(0, 3).map(({ numero, nom }) =>
						numero < etape ? (
							<button key={numero} type="button" className={e.replie} onClick={() => aller(numero)}>
								<span>{numero}</span>
								<strong>{nom}</strong>
								<em>{resumes[numero as NumeroEtape]}</em>
								<span className={e.modifier}>Modifier</span>
							</button>
						) : null,
					)}

					{etape <= 3 && (
						<section className={`${p.panneau} ${e.etape}`} key={etape} aria-label={`Étape ${etape} sur 4`}>
							{etape === 1 && (
								<EtapeRepo
									repos={repos}
									chargement={chargement}
									erreur={erreurRepos}
									surReessayer={() => setEssai((n) => n + 1)}
									multi={multi}
									selection={choisis}
									surChoisir={changerRepos}
									surContinuer={continuer}
								/>
							)}
							{etape === 2 && <EtapeType type={type} repos={choisis} surChoisir={changerType} />}
							{etape === 3 && type && (
								<ReglagesType type={type} repos={nomsRepos} reglages={reglages} surModifier={modifier} semaine={semaine} />
							)}
						</section>
					)}

					{etape <= 3 && (
						<div className={e.nav}>
							{message && etape === 3 && (
								<p className={e.navMessage} id="message-validation">
									{message}
								</p>
							)}
							<div className={e.navBoutons}>
								{etape > 1 && (
									<Bouton variante="contour" onClick={() => aller((etape - 1) as NumeroEtape)}>
										Retour
									</Bouton>
								)}
								<Bouton onClick={continuer} disabled={!peutContinuer} aria-describedby={message && etape === 3 ? "message-validation" : undefined}>
									{etape === 3 ? "Rédiger les posts" : "Continuer"}
								</Bouton>
							</div>
						</div>
					)}

				</div>

				<div className={styles.posts} data-visible={etape === 4 ? "oui" : "non"}>
					<Redaction type={type} repos={nomsRepos} demande={demande} moi={moi} reglagesApp={reglagesApp} demo={demo} />
				</div>
			</div>
		</div>
	);
}
