import { Bouton } from "@/components/Bouton/Bouton";
import { EnTete } from "./EnTete";
import s from "./Section.module.css";
import styles from "./DeuxModes.module.css";

const MODES = [
	{
		nom: "Dans Claude",
		badge: "Connecteur MCP · recommandé",
		resume:
			"Tu restes dans Claude. C'est ton abonnement qui écrit : tes posts, le script de la pub de ton projet, avec sa voix off, et le post qui l'accompagne.",
		points: ["Aucune clé API", "Inclus dans Claude Pro et Max", "Une phrase suffit pour lancer une pub"],
		action: { libelle: "Ajouter à Claude", vers: "#installer" },
	},
	{
		nom: "Sur le site",
		badge: "Clé API · bonus",
		resume: "Tu choisis tes commits dans un tableau de bord et Claude rédige en direct, avec ta propre clé.",
		points: ["Ta clé reste dans ton navigateur", "Historique et captures", "Choix du ton et du modèle"],
		action: { libelle: "Ouvrir l'app", vers: "/app" },
	},
];

export function DeuxModes() {
	return (
		<section className={s.section} id="modes">
			<EnTete surTitre="Deux modes">
				Claude d'abord.
				<br />
				<em>Le site en bonus.</em>
			</EnTete>
			<div className={styles.grille}>
				{MODES.map((m, i) => (
					<article key={m.nom} className={`${s.panneau} ${styles.mode} ${i === 0 ? styles.principal : ""} revele`}>
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
						<Bouton vers={m.action.vers} variante={i === 0 ? "clair" : "contour"}>
							{m.action.libelle}
						</Bouton>
					</article>
				))}
			</div>
		</section>
	);
}
