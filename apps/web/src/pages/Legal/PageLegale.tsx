import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo/Logo";
import { Pied } from "@/pages/Accueil/sections/Pied";
import styles from "./Legal.module.css";

type Props = { titre: string; miseAJour: string; children: ReactNode };

// Gabarit commun des pages legales : en-tete minimal, texte lisible, meme pied de page que le site
export function PageLegale({ titre, miseAJour, children }: Props) {
	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	return (
		<>
			<header className={styles.entete}>
				<Logo />
				<Link className={styles.retour} to="/app">
					Ouvrir l'app
				</Link>
			</header>
			<main className={styles.page}>
				<article className={styles.texte}>
					<h1>{titre}</h1>
					<p className={styles.maj}>Dernière mise à jour : {miseAJour}</p>
					{children}
				</article>
			</main>
			<Pied />
		</>
	);
}
