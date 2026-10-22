import { Bouton } from "@/components/Bouton/Bouton";
import { EnTete } from "./EnTete";
import s from "./Section.module.css";
import styles from "./DeuxModes.module.css";

const MODES = [
	{
		nom: "Dans Claude",
		badge: "Connecteur MCP",
		resume: "Tu restes dans Claude. C'est ton abonnement qui écrit, Weekli lui fournit tes commits.",
		points: ["Aucune clé API", "Inclus dans Claude Pro et Max", "Une phrase suffit"],
		action: { libelle: "Ajouter à Claude", vers: "#installer" },
	},
	{
		nom: "Sur le site",
		badge: "Clé API",
		resume: "Tu choisis tes commits dans un tableau de bord, Claude rédige en direct sous tes yeux.",
		points: ["Ta clé reste dans ton navigateur", "Éditeur et aperçu LinkedIn", "Choix du ton et du modèle"],
		action: { libelle: "Ouvrir l'app", vers: "/app" },
	},
];

export function DeuxModes() {
	return (
		<section className={s.section} id="modes">
			<EnTete surTitre="Deux modes">
				Un seul moteur.
				<br />
				<em>Deux façons de l'utiliser.</em>
			</EnTete>
			<div className={styles.grille}>
				{MODES.map((m, i) => (
					<article key={m.nom} className={`${s.panneau} ${styles.mode} revele`}>
						<span className={styles.badge}>
							Mode {i + 1} · {m.badge}
						</span>
						<h3 className={styles.nom}>{m.nom}</h3>
						<p className={styles.resume}>{m.resume}</p>
						<ul className={styles.points}>
							{m.points.map((p) => (
								<li key={p}>{p}</li>
							))}
						</ul>
						<Bouton vers={m.action.vers} variante={i === 0 ? "contour" : "plein"}>
							{m.action.libelle}
						</Bouton>
					</article>
				))}
			</div>
		</section>
	);
}
