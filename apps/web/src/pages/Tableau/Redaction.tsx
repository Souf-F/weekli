import type { ActiviteRepo, DetailsCommit, DonneesPost, OptionsGeneration, Post, TypePost } from "@weekli/core";
import { CATALOGUE_POSTS } from "@weekli/core";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { genererPosts, messageErreur } from "@/lib/generation";
import { genererPostParType } from "@/lib/generation-type";
import { ajouterReponse, demandeClaude, TITRE_VIDE } from "@/lib/parcours";
import type { Reglages as ReglagesApp } from "@/lib/reglages";
import { texteStyleServeur } from "@/lib/style";
import type { ContexteApp } from "@/layouts/AppLayout";
import { CartePost } from "./CartePost";
import p from "./Panneau.module.css";
import styles from "./Redaction.module.css";
import type { DemandeRedaction } from "./types";

type Demo = typeof import("./demo/installer") | null;

type Props = {
	type: TypePost | null;
	repos: string[];
	demande: DemandeRedaction | null;
	moi: ContexteApp["moi"];
	reglagesApp: ReglagesApp;
	demo: Demo;
};

const MAX_DIFFS = 5;

export function Redaction({ type, repos, demande, moi, reglagesApp, demo }: Props) {
	const [posts, setPosts] = useState<Post[]>([]);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState("");
	const [sauvegarde, setSauvegarde] = useState("");
	const [question, setQuestion] = useState("");
	const [reponse, setReponse] = useState("");
	const [copie, setCopie] = useState("");
	const arret = useRef<AbortController | null>(null);
	const titreQuestion = useRef<HTMLHeadingElement>(null);
	// Donnees du serveur et notes de l'utilisateur gardees pour relancer apres une question de Claude
	const contexte = useRef<{ donnees: DonneesPost | null; notes: string }>({ donnees: null, notes: "" });

	const sansCle = !demo && !reglagesApp.cleApi;

	const conserver = (final: Post[]) => {
		if (final.length === 0) return;
		// Chaque generation est gardee dans l'historique ; un echec ici ne doit pas masquer les posts
		api
			.sauverBrouillons(final)
			.then(() => setSauvegarde("Enregistrés dans l'historique."))
			.catch(() => setSauvegarde("Posts non enregistrés dans l'historique : pense à les copier."));
	};

	const lancerSemaine = async (d: DemandeRedaction, signal: AbortSignal) => {
		const repos: ActiviteRepo[] = d.semaine?.repos ?? [];
		let details: DetailsCommit[] = [];
		if (d.semaine?.inclureDiffs) {
			const choisis = repos.flatMap((r) => r.commits.map((c) => [r.repo, c.sha] as const)).slice(0, MAX_DIFFS);
			details = await Promise.all(choisis.map(([repo, sha]) => api.commit(repo, sha)));
		}
		// Le style est lu sur le serveur a chaque generation : il n'est jamais copie dans le navigateur
		const style = demo ? "" : await texteStyleServeur();
		const options: OptionsGeneration = { ...(d.semaine?.options as OptionsGeneration), style };
		const generation = demo ? demo.genererPostsDemo : genererPosts;
		const final = await generation({
			cleApi: reglagesApp.cleApi,
			modele: reglagesApp.modele,
			repos,
			details,
			options,
			surProgression: setPosts,
			signal,
		});
		setPosts(final);
		conserver(final);
	};

	const lancerType = async (d: DemandeRedaction, signal: AbortSignal) => {
		contexte.current.donnees ??= await api.donneesPost(d.donnees);
		const generation = demo ? demo.genererPostParTypeDemo : genererPostParType;
		const resultat = await generation({
			cleApi: reglagesApp.cleApi,
			modele: reglagesApp.modele,
			donnees: contexte.current.donnees,
			notes: contexte.current.notes,
			surProgression: setPosts,
			signal,
		});
		if (resultat.question) {
			setQuestion(resultat.question);
			setPosts([]);
			return;
		}
		setPosts(resultat.posts);
		conserver(resultat.posts);
	};

	const lancer = async (d: DemandeRedaction) => {
		arret.current?.abort();
		const controle = new AbortController();
		arret.current = controle;
		setEnCours(true);
		setErreur("");
		setSauvegarde("");
		setQuestion("");
		setPosts([]);
		try {
			if (d.type === "semaine") await lancerSemaine(d, controle.signal);
			else await lancerType(d, controle.signal);
		} catch (e) {
			if (!controle.signal.aborted) setErreur(messageErreur(e));
		} finally {
			if (arret.current === controle) setEnCours(false);
		}
	};

	// Nouvelle demande du parcours : on repart de zero
	useEffect(() => {
		if (!demande || sansCle) return;
		contexte.current = { donnees: null, notes: demande.notes };
		setReponse("");
		void lancer(demande);
		return () => arret.current?.abort();
	}, [demande?.id]);

	// La question de Claude prend le focus pour etre lue et reperee au clavier
	useEffect(() => {
		if (question) titreQuestion.current?.focus();
	}, [question]);

	const repondre = () => {
		if (!demande || !reponse.trim()) return;
		contexte.current.notes = ajouterReponse(contexte.current.notes, question, reponse);
		setReponse("");
		void lancer(demande);
	};

	const copier = async () => {
		const texte = type ? demandeClaude(type, repos) : "";
		try {
			await navigator.clipboard.writeText(texte);
			setCopie("Demande copiée. Colle-la dans Claude.");
		} catch {
			setCopie("Copie impossible : sélectionne la demande et copie-la à la main.");
		}
	};

	if (sansCle) {
		return (
			<section id="zone-posts" tabIndex={-1} className={styles.zone} aria-label="Rédaction dans Claude">
				<div className={styles.sansCle}>
					<p className={styles.surtitre}>Sans clé API</p>
					<h2>
						Fais-le <em>directement dans Claude.</em>
					</h2>
					<p className={p.aide}>
						Weekli est branché à Claude comme un outil : il lit ton repo, Claude rédige. Demande-lui la même chose que
						ce tableau, dans ta conversation.
					</p>
					{type && <blockquote className={styles.demande}>{demandeClaude(type, repos)}</blockquote>}
					<div className={styles.actions}>
						<Bouton onClick={copier} disabled={!type}>
							Copier la demande pour Claude
						</Bouton>
						<Bouton variante="contour" vers="/app/reglages">
							Ajouter une clé API
						</Bouton>
					</div>
					<p className={p.aide} role="status">
						{copie}
					</p>
				</div>
			</section>
		);
	}

	const nomType = type ? CATALOGUE_POSTS[type].nom.toLowerCase() : "post";
	return (
		<section id="zone-posts" tabIndex={-1} className={styles.zone} aria-label="Posts générés" aria-live="off">
			{erreur && (
				<p className={p.erreur} role="alert">
					{erreur}
				</p>
			)}
			{question && (
				<div className={styles.question}>
					<p className={styles.surtitre}>Claude a une question</p>
					<h2 ref={titreQuestion} tabIndex={-1}>{question}</h2>
					<label className={p.champ}>
						<span>Ta réponse</span>
						<textarea rows={4} value={reponse} onChange={(e) => setReponse(e.target.value)} />
					</label>
					<div className={styles.actions}>
						<Bouton onClick={repondre} disabled={!reponse.trim() || enCours}>
							Répondre et rédiger
						</Bouton>
					</div>
					<p className={p.aide}>Ta réponse reste dans ton navigateur : elle n'est envoyée qu'à Claude.</p>
				</div>
			)}
			{!demande && !question && !erreur && (
				<div className={styles.vide}>
					<p className={styles.surtitre}>{type ? CATALOGUE_POSTS[type].nom : "Tes posts"}</p>
					<h2>
						{type ? TITRE_VIDE[type] : "Ton post"} <em>apparaîtra ici.</em>
					</h2>
					<p className={p.aide}>Choisis le repo, le type et les réglages, puis lance la rédaction.</p>
				</div>
			)}
			{enCours && posts.length === 0 && !question && (
				<div className={styles.vide} role="status">
					<h2>
						Claude lit <em>ton {nomType}…</em>
					</h2>
					<button type="button" className={styles.arreter} onClick={() => arret.current?.abort()}>
						Arrêter
					</button>
				</div>
			)}
			{posts.map((post, i) => (
				<CartePost
					key={i}
					post={post}
					moi={moi}
					enCours={enCours}
					surModifier={(texte) => setPosts((ps) => ps.map((x, j) => (j === i ? { ...x, texte } : x)))}
				/>
			))}
			{!enCours && demande && posts.length > 0 && (
				<div className={styles.actions}>
					<Bouton variante="contour" taille="petit" onClick={() => lancer(demande)}>
						Régénérer
					</Bouton>
				</div>
			)}
			{sauvegarde && (
				<p className={p.aide} role="status">
					{sauvegarde} <Link to="/app/historique">Voir l'historique</Link>
				</p>
			)}
		</section>
	);
}
