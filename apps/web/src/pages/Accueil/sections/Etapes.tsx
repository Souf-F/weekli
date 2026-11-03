import { useEffect, useRef } from "react";
import { EnTete } from "./EnTete";
import s from "./Section.module.css";
import styles from "./Etapes.module.css";

const ETAPES = [
	{ titre: "Ajoute le connecteur", texte: "Une adresse à coller dans Claude, puis ton GitHub en lecture seule. Repos publics uniquement." },
	{ titre: "Raconte ton projet", texte: "Pour qui, quel problème, quelle promesse : trois questions, Claude lit le reste dans ton README." },
	{ titre: "Claude écrit", texte: "Tes posts de la semaine, le script de la pub avec sa voix off, et le post qui l'accompagne." },
	{ titre: "Tu ajustes et tu publies", texte: "Tu relis, tu retouches les scènes dans le studio, tu exportes la vidéo. Rien ne part sans ton accord." },
];

export function Etapes() {
	const liste = useRef<HTMLOListElement>(null);

	// La ligne se remplit pendant la traversee de la section
	useEffect(() => {
		let image = 0;
		const boucle = () => {
			const el = liste.current;
			if (el) {
				const r = el.getBoundingClientRect();
				const k = Math.min(Math.max((innerHeight * 0.85 - r.top) / (innerHeight * 0.6), 0), 1);
				el.style.setProperty("--progression", k.toFixed(3));
			}
			image = requestAnimationFrame(boucle);
		};
		image = requestAnimationFrame(boucle);
		return () => cancelAnimationFrame(image);
	}, []);

	return (
		<section className={s.section} id="comment">
			<EnTete surTitre="Comment ça marche">
				De ton projet à sa pub.
				<br />
				<em>Sans friction.</em>
			</EnTete>
			<ol className={`${s.panneau} ${styles.etapes}`} ref={liste}>
				{ETAPES.map((e, i) => (
					<li key={e.titre} className={`${styles.etape} revele`}>
						<span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
						<h3>{e.titre}</h3>
						<p>{e.texte}</p>
					</li>
				))}
			</ol>
		</section>
	);
}
