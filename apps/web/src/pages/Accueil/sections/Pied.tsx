import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo/Logo";
import styles from "./Pied.module.css";

export function Pied() {
	return (
		<footer className={styles.pied}>
			<Logo />
			<p>Projet open source sous licence MIT.</p>
			<nav className={styles.liens} aria-label="Informations légales">
				<Link to="/confidentialite">Confidentialité</Link>
				<Link to="/mentions-legales">Mentions légales</Link>
				<a href="https://github.com/Souf-F/weekli" rel="noopener">
					GitHub ↗
				</a>
			</nav>
		</footer>
	);
}
