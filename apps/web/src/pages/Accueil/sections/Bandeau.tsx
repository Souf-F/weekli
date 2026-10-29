import styles from "./Bandeau.module.css";

const MOTS = ["Connecteur Claude", "Pub vidéo", "Voix off", "Post du projet", "GitHub", "LinkedIn", "Style mémorisé", "Open source"];

export function Bandeau() {
	return (
		<div className={styles.bandeau} aria-hidden="true">
			<div className={styles.piste}>
				{[...MOTS, ...MOTS].map((mot, i) => (
					<span key={i}>{mot}</span>
				))}
			</div>
		</div>
	);
}
