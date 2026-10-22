import { Logo } from "@/components/Logo/Logo";
import styles from "./Pied.module.css";

export function Pied() {
	return (
		<footer className={styles.pied}>
			<Logo />
			<p>Projet open source sous licence MIT.</p>
			<a href="https://github.com/Souf-F/weekli" rel="noopener">
				GitHub ↗
			</a>
		</footer>
	);
}
