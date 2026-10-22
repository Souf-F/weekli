import { Link } from "react-router-dom";
import styles from "./Logo.module.css";

export function Logo({ vers = "/" }: { vers?: string }) {
	return (
		<Link className={styles.logo} to={vers}>
			<span className={styles.carre}>W</span>Weekli
		</Link>
	);
}
