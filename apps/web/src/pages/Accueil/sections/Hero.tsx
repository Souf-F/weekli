import { useEffect, useRef } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import styles from "./Hero.module.css";

export function Hero() {
	const scene = useRef<HTMLDivElement>(null);
	const maquette = useRef<HTMLDivElement>(null);

	// Inclinaison 3D de la maquette et parallaxe des etiquettes, a la souris et au scroll
	useEffect(() => {
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const cible = { x: 0, y: 0 };
		const lisse = { x: 0, y: 0 };
		const surSouris = (e: PointerEvent) => {
			cible.x = (e.clientX / innerWidth) * 2 - 1;
			cible.y = (e.clientY / innerHeight) * 2 - 1;
		};
		if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", surSouris);

		let image = 0;
		const boucle = () => {
			lisse.x += (cible.x - lisse.x) * 0.06;
			lisse.y += (cible.y - lisse.y) * 0.06;
			if (scene.current && maquette.current) {
				scene.current.style.transform = `translate3d(0, ${scrollY * -0.12}px, 0)`;
				maquette.current.style.transform = `rotateY(${lisse.x * 8 - 6}deg) rotateX(${-lisse.y * 6 + 4}deg)`;
				scene.current.querySelectorAll<HTMLElement>("[data-profondeur]").forEach((f) => {
					const p = Number(f.dataset.profondeur);
					f.style.transform = `translate3d(${lisse.x * p * 0.5}px, ${lisse.y * p * 0.5 - scrollY * p * 0.004}px, 0)`;
				});
			}
			image = requestAnimationFrame(boucle);
		};
		image = requestAnimationFrame(boucle);
		return () => {
			cancelAnimationFrame(image);
			removeEventListener("pointermove", surSouris);
		};
	}, []);

	return (
		<section className={styles.hero}>
			<div>
				<h1 className="revele">
					Ton projet raconté,
					<br />
					<em>pub et post compris.</em>
				</h1>
				<p className={`${styles.intro} revele`}>
					Ajoute Weekli à Claude. Il lit tes dépôts GitHub publics, écrit les posts LinkedIn de ta semaine, puis la
					pub vidéo de ton projet avec sa voix off et le post qui l'accompagne.
				</p>
				<div className={`${styles.actions} revele`}>
					<Bouton vers="#installer">Ajouter à Claude</Bouton>
					<Bouton vers="/app" variante="contour">
						Ouvrir l'app
					</Bouton>
				</div>
				<p className={`${styles.note} revele`}>Open source · Lecture seule · Aucune clé stockée</p>
			</div>

			<div className={styles.scene} ref={scene}>
				<div className={styles.maquette} ref={maquette}>
					<div className={styles.barre}>
						<span className={styles.pt} />
						<span className={styles.pt} />
						<span className={styles.pt} />
						<span className={styles.titre}>Claude</span>
						<span className={styles.badge}>Weekli connecté</span>
					</div>
					<div className={styles.corps}>
						<div className={`${styles.msg} ${styles.moi}`}>Fais la pub de scanner-ssl.</div>
						<div className={styles.outil}>
							<span>⌘</span>
							<code>preparer_pub</code>
							<span className={styles.resultat}>README lu · 3 questions</span>
						</div>
						<div className={styles.outil}>
							<span>⌘</span>
							<code>sauver_pub</code>
							<span className={styles.resultat}>9 scènes · 59 s</span>
						</div>
						<div className={`${styles.msg} ${styles.claude}`}>
							<span className={styles.postTitre}>Post du projet</span>
							<p>
								Aujourd'hui je vous présente scanner-ssl, l'outil qui retrouve les sous-domaines que plus personne
								n'ose regarder.
							</p>
							<p className={styles.suite}>Le script de la pub t'attend dans ton studio, voix off comprise.</p>
							<span className={styles.tags}>#cybersecurite #buildinpublic</span>
						</div>
					</div>
				</div>
				<div className={`${styles.flottant} ${styles.f1}`} data-profondeur="40">
					<strong>59</strong> secondes de pub
				</div>
				<div className={`${styles.flottant} ${styles.f2}`} data-profondeur="-30">
					<span className={styles.point} />Voix off française
				</div>
				<div className={`${styles.flottant} ${styles.f3}`} data-profondeur="60">
					Post prêt à publier
				</div>
			</div>
		</section>
	);
}
