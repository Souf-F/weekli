import { useEffect, useRef } from "react";
import { EnTete } from "./EnTete";
import s from "./Section.module.css";
import styles from "./Etapes.module.css";

const ETAPES = [
	{ titre: "Connecte GitHub", texte: "Dans Claude via le connecteur, ou sur le site en un clic. Lecture seule." },
	{ titre: "Choisis ta semaine", texte: "Weekli récupère tes commits et retire le bruit." },
	{ titre: "Claude rédige", texte: "Il repère les deux ou trois sujets qui méritent d'être racontés." },
	{ titre: "Tu publies", texte: "Tu relis, tu ajustes, tu copies. Rien ne part sans ton accord." },
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
				Du commit au post.
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
