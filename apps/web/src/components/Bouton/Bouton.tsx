import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./Bouton.module.css";

type Variante = "plein" | "contour" | "clair";
type Taille = "normal" | "petit";

type Commun = { variante?: Variante; taille?: Taille; children: ReactNode; className?: string };
type CommeLien = Commun & { vers: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className">;
type CommeBouton = Commun & { vers?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

// Un seul composant pour les liens internes, externes et les boutons, avec le meme style
export function Bouton(props: CommeLien | CommeBouton) {
	const { variante = "plein", taille = "normal", children, className = "", ...reste } = props;
	const classes = `${styles.bouton} ${styles[variante]} ${taille === "petit" ? styles.petit : ""} ${className}`;

	if (reste.vers !== undefined) {
		const { vers, ...lien } = reste as CommeLien;
		const externe = /^(https?:|\/auth\/|#)/.test(vers);
		return externe ? (
			<a href={vers} className={classes} {...lien}>
				{children}
			</a>
		) : (
			<Link to={vers} className={classes} {...lien}>
				{children}
			</Link>
		);
	}
	const { vers: _, ...bouton } = reste as CommeBouton;
	return (
		<button className={classes} {...bouton}>
			{children}
		</button>
	);
}
