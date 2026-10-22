import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import { Logo } from "@/components/Logo/Logo";
import styles from "./Navigation.module.css";

export function Navigation() {
	const [solide, setSolide] = useState(false);

	useEffect(() => {
		const maj = () => setSolide(scrollY > 40);
		addEventListener("scroll", maj, { passive: true });
		maj();
		return () => removeEventListener("scroll", maj);
	}, []);

	return (
		<header className={`${styles.nav} ${solide ? styles.solide : ""}`}>
			<Logo />
			<nav className={styles.liens}>
				<a href="#fonctionnalites">Fonctionnalités</a>
				<a href="#modes">Deux modes</a>
				<a href="#comment">Comment ça marche</a>
			</nav>
			<Bouton vers="/app" taille="petit">
				Ouvrir l'app
			</Bouton>
		</header>
	);
}
