import { NavLink, Outlet } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { Logo } from "@/components/Logo/Logo";
import { useMoi } from "@/hooks/useMoi";
import type { Moi } from "@/lib/api";
import styles from "./AppLayout.module.css";

export type ContexteApp = { moi: Moi };

// Garde d'acces de l'app : affiche la connexion GitHub tant qu'il n'y a pas de session
export function AppLayout() {
	const { etat, deconnecter } = useMoi();

	if (etat.statut === "chargement") return <div className={styles.centre}>Chargement…</div>;

	if (etat.statut !== "connecte") {
		return (
			<div className={styles.centre}>
				<div className={styles.connexion}>
					<Logo />
					<h1>
						Connecte ton GitHub
						<br />
						<em>pour commencer.</em>
					</h1>
					<p>Weekli lit uniquement tes repos publics. Il ne peut rien modifier ni publier.</p>
					{etat.statut === "erreur" && <p className={styles.erreur}>{etat.message}</p>}
					<Bouton vers="/auth/login">Se connecter avec GitHub</Bouton>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.app}>
			<header className={styles.barre}>
				<Logo vers="/app" />
				<nav className={styles.nav}>
					<NavLink to="/app" end className={({ isActive }) => (isActive ? styles.actif : "")}>
						Tableau de bord
					</NavLink>
					<NavLink to="/app/historique" className={({ isActive }) => (isActive ? styles.actif : "")}>
						Historique
					</NavLink>
					<NavLink to="/app/reglages" className={({ isActive }) => (isActive ? styles.actif : "")}>
						Réglages
					</NavLink>
				</nav>
				<div className={styles.profil}>
					<img src={etat.moi.avatar} alt="" width={32} height={32} />
					<span>{etat.moi.nom}</span>
					<Bouton variante="contour" taille="petit" onClick={deconnecter}>
						Déconnexion
					</Bouton>
				</div>
			</header>
			<main className={styles.contenu}>
				<Outlet context={{ moi: etat.moi } satisfies ContexteApp} />
			</main>
		</div>
	);
}
