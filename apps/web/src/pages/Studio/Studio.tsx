import { useEffect, useMemo, useRef, useState } from "react";
import {
	type Brouillon,
	dureeTotale,
	nettoyerStoryboard,
	type Scene,
	type Storyboard,
	storyboardDepuisPost,
} from "@weekli/core";
import { Link, useSearchParams } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api } from "@/lib/api";
import { genererStoryboard, messageErreur } from "@/lib/generation";
import { lireReglages } from "@/lib/reglages";
import { exporter, formatExport, lire } from "@/lib/video/moteur";
import p from "../Tableau/Panneau.module.css";
import { EditeurScene } from "./EditeurScene";
import styles from "./Studio.module.css";

// "Mon meilleur commit de sécurité" devient "mon-meilleur-commit-de-securite"
const nomFichier = (titre: string) =>
	titre
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);

export function Studio() {
	const reglages = useMemo(lireReglages, []);
	const [parametres] = useSearchParams();
	const [brouillons, setBrouillons] = useState<Brouillon[] | null>(null);
	const [choisi, setChoisi] = useState<string>(parametres.get("brouillon") ?? "");
	const [story, setStory] = useState<Storyboard | null>(null);
	const [occupe, setOccupe] = useState<"" | "ia" | "export">("");
	const [progression, setProgression] = useState(0);
	const [erreur, setErreur] = useState("");
	const [video, setVideo] = useState<{ url: string; nom: string } | null>(null);
	const [extension, setExtension] = useState<string>("");
	const canvas = useRef<HTMLCanvasElement>(null);
	const arret = useRef<AbortController | null>(null);

	useEffect(() => {
		formatExport().then((f) => setExtension(f ? f.extension.toUpperCase() : "indisponible"));
	}, []);

	useEffect(() => {
		api
			.brouillons()
			.then((b) => {
				setBrouillons(b);
				setChoisi((c) => c || b[0]?.id || "");
			})
			.catch((e) => setErreur(e.message));
	}, []);

	const brouillon = brouillons?.find((b) => b.id === choisi);

	// Storyboard automatique des qu'un brouillon est choisi ; l'IA peut ensuite le remplacer
	useEffect(() => {
		if (brouillon) setStory(storyboardDepuisPost(brouillon));
	}, [brouillon]);

	// Apercu en boucle sur le canvas
	useEffect(() => {
		if (!story || !canvas.current || story.scenes.length === 0) return;
		let arreter = () => {};
		document.fonts.ready.then(() => canvas.current && (arreter = lire(canvas.current, story)));
		return () => arreter();
	}, [story]);

	useEffect(
		() => () => {
			if (video) URL.revokeObjectURL(video.url);
		},
		[video],
	);

	const avecIa = async () => {
		if (!brouillon) return;
		arret.current = new AbortController();
		setOccupe("ia");
		setErreur("");
		try {
			setStory(await genererStoryboard(reglages.cleApi, reglages.modele, brouillon, arret.current.signal));
		} catch (e) {
			if (!arret.current.signal.aborted) setErreur(messageErreur(e));
		} finally {
			setOccupe("");
		}
	};

	const lancerExport = async () => {
		if (!story) return;
		arret.current = new AbortController();
		setOccupe("export");
		setErreur("");
		setProgression(0);
		try {
			const { video: blob, extension } = await exporter(story, setProgression, arret.current.signal);
			setVideo({
				url: URL.createObjectURL(blob),
				nom: `weekli-${nomFichier(brouillon?.titre || "video")}.${extension}`,
			});
		} catch (e) {
			if (!arret.current.signal.aborted) setErreur(e instanceof Error ? e.message : "Export impossible");
		} finally {
			setOccupe("");
		}
	};

	const modifierScene = (i: number, scene: Scene) =>
		setStory((s) => s && nettoyerStoryboard({ scenes: s.scenes.map((x, j) => (j === i ? scene : x)) }));
	const retirerScene = (i: number) => setStory((s) => s && { scenes: s.scenes.filter((_, j) => j !== i) });

	if (brouillons?.length === 0) {
		return (
			<div className={styles.vide}>
				<h1>
					Le studio
					<br />
					<em>attend ton premier post.</em>
				</h1>
				<p className={p.aide}>
					Génère des posts sur le <Link to="/app">tableau de bord</Link> : ils arriveront ici pour devenir des vidéos.
				</p>
			</div>
		);
	}

	return (
		<div className={styles.studio}>
			<section className={`${p.panneau} ${styles.reglages}`}>
				<div className={p.titre}>
					<h2>Studio vidéo</h2>
				</div>
				<label className={p.champ}>
					Post
					<select value={choisi} onChange={(e) => setChoisi(e.target.value)}>
						{brouillons?.map((b) => (
							<option key={b.id} value={b.id}>
								{b.titre || b.texte.slice(0, 50)}
							</option>
						))}
					</select>
				</label>

				<div className={styles.actions}>
					<Bouton
						variante="contour"
						taille="petit"
						onClick={() => brouillon && setStory(storyboardDepuisPost(brouillon))}
						disabled={!!occupe}
					>
						Storyboard automatique
					</Bouton>
					<Bouton taille="petit" onClick={avecIa} disabled={!!occupe || !reglages.cleApi || !brouillon}>
						{occupe === "ia" ? "Claude réfléchit…" : "Storyboard par Claude"}
					</Bouton>
				</div>
				{!reglages.cleApi && <p className={p.aide}>Le storyboard par Claude utilise ta clé API (réglages).</p>}

				<div className={styles.scenes}>
					{story?.scenes.map((scene, i) => (
						<EditeurScene
							key={i}
							index={i}
							scene={scene}
							surModifier={(s) => modifierScene(i, s)}
							surRetirer={() => retirerScene(i)}
						/>
					))}
				</div>
			</section>

			<section className={styles.apercu}>
				<canvas ref={canvas} className={styles.canvas} aria-label="Aperçu de la vidéo" />
				<div className={styles.barre}>
					<span>
						{story ? `${story.scenes.length} scènes · ${dureeTotale(story)} s` : "…"} · {extension} 1080 × 1350
					</span>
					{occupe === "export" ? (
						<Bouton variante="contour" taille="petit" onClick={() => arret.current?.abort()}>
							Annuler ({Math.round(progression * 100)} %)
						</Bouton>
					) : (
						<Bouton taille="petit" onClick={lancerExport} disabled={!!occupe || !story?.scenes.length}>
							Exporter la vidéo
						</Bouton>
					)}
				</div>
				{occupe === "export" && (
					<p className={p.aide}>Garde cet onglet ouvert pendant l'export : il se fait en temps réel.</p>
				)}
				{video && (
					<p className={styles.telecharger}>
						<a href={video.url} download={video.nom}>
							Télécharger {video.nom}
						</a>
					</p>
				)}
				{erreur && <p className={p.erreur}>{erreur}</p>}
			</section>
		</div>
	);
}
