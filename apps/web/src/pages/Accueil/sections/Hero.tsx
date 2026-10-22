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
				<p className={`${styles.pastille} revele`}>
					<span className={styles.point} />
					Dans Claude ou sur le web
				</p>
				<h1 className="revele">
					Ton code de la semaine,
					<br />
					<em>raconté sur LinkedIn.</em>
				</h1>
				<p className={`${styles.intro} revele`}>
					Weekli lit tes commits GitHub et en tire tes meilleurs posts. Utilise-le directement dans Claude avec ton
					abonnement, ou sur le site avec ta clé API.
				</p>
				<div className={`${styles.actions} revele`}>
					<Bouton vers="/app">Ouvrir l'app</Bouton>
					<Bouton vers="#installer" variante="contour">
						Ajouter à Claude
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
						<div className={`${styles.msg} ${styles.moi}`}>Fais mes posts LinkedIn de la semaine.</div>
						<div className={styles.outil}>
							<span>⌘</span>
							<code>activite_github</code>
							<span className={styles.resultat}>23 commits · 3 projets</span>
						</div>
						<div className={styles.outil}>
							<span>⌘</span>
							<code>details_commit</code>
							<span className={styles.resultat}>scanner-ssl · a1b2c3d</span>
						</div>
						<div className={`${styles.msg} ${styles.claude}`}>
							<span className={styles.postTitre}>Post 1 · Retour d'expérience</span>
							<p>
								Cette semaine, mon scanner a appris à repérer les sous-domaines oubliés. Ceux qu'on crée pour un test,
								puis qu'on laisse vivre des années.
							</p>
							<p className={styles.suite}>Voici comment je les détecte en trois requêtes…</p>
							<span className={styles.tags}>#cybersecurite #javascript #buildinpublic</span>
						</div>
					</div>
				</div>
				<div className={`${styles.flottant} ${styles.f1}`} data-profondeur="40">
					<strong>23</strong> commits analysés
				</div>
				<div className={`${styles.flottant} ${styles.f2}`} data-profondeur="-30">
					<span className={styles.point} />3 brouillons prêts
				</div>
				<div className={`${styles.flottant} ${styles.f3}`} data-profondeur="60">
					#buildinpublic
				</div>
			</div>
		</section>
	);
}
