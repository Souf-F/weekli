import styles from "./Bandeau.module.css";

const MOTS = ["Claude", "MCP", "GitHub", "LinkedIn", "Pub vidéo", "Cloudflare Workers", "OAuth 2.1", "Open source"];

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
