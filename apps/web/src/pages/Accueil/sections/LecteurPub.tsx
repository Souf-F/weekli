import { useEffect, useRef, useState } from "react";
import styles from "./LecteurPub.module.css";

const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pub de demonstration servie par le site (aucun lecteur tiers) : sans son par defaut, lue seulement a l'ecran,
// jamais lancee d'elle-meme si le mouvement est reduit.
export function LecteurPub() {
	const video = useRef<HTMLVideoElement>(null);
	const [muet, setMuet] = useState(true);
	const [lecture, setLecture] = useState(false);

	useEffect(() => {
		const v = video.current;
		if (!v) return;
		const surLecture = () => setLecture(true);
		const surPause = () => setLecture(false);
		v.addEventListener("play", surLecture);
		v.addEventListener("pause", surPause);
		if (mouvementReduit() || !("IntersectionObserver" in window)) return () => {
			v.removeEventListener("play", surLecture);
			v.removeEventListener("pause", surPause);
		};
		const observateur = new IntersectionObserver(
			([entree]) => {
				if (entree.isIntersecting) v.play().catch(() => undefined);
				else v.pause();
			},
			{ threshold: 0.4 },
		);
		observateur.observe(v);
		return () => {
			observateur.disconnect();
			v.removeEventListener("play", surLecture);
			v.removeEventListener("pause", surPause);
		};
	}, []);

	const basculerLecture = () => {
		const v = video.current;
		if (!v) return;
		if (v.paused) v.play().catch(() => undefined);
		else v.pause();
	};

	const basculerSon = () => {
		const v = video.current;
		if (!v) return;
		v.muted = !v.muted;
		setMuet(v.muted);
		if (!v.muted && v.paused) v.play().catch(() => undefined);
	};

	return (
		<div className={styles.lecteur}>
			<video
				ref={video}
				className={styles.video}
				src="/demo/weekli-pub.mp4"
				poster="/demo/weekli-pub.png"
				width={1920}
				height={1080}
				muted
				loop
				playsInline
				preload="none"
				aria-label="Pub de démonstration de Weekli, 46 secondes, voix off en français"
			/>
			<div className={styles.commandes}>
				<button type="button" className={styles.bouton} onClick={basculerLecture}>
					{lecture ? "Mettre en pause" : "Lire la pub"}
				</button>
				<button type="button" className={styles.bouton} onClick={basculerSon} aria-pressed={!muet}>
					{muet ? "Activer le son" : "Couper le son"}
				</button>
			</div>
		</div>
	);
}
