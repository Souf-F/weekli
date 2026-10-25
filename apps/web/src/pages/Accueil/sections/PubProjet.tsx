import { EnTete } from "./EnTete";
import s from "./Section.module.css";
import styles from "./PubProjet.module.css";

const ETAPES = [
	{ titre: "Claude te pose trois questions", texte: "Pour qui, quel problème, quelle promesse. Le reste, il le lit dans ton README et sur ton site." },
	{ titre: "Il écrit la pub", texte: "Un script en scènes avec voix off, à tes couleurs, sans une ligne de code ni un commit à l'écran." },
	{ titre: "Tu ajustes et tu exportes", texte: "Le studio rend la vidéo dans ton navigateur. Le post du projet est livré avec elle." },
];

// Emplacement de la future vidéo de démonstration (tâche F13). En attendant, une affiche statique dessinée en CSS :
// remplacer le contenu de <div data-emplacement="pub-demo"> par le lecteur 16:9, sans toucher au reste de la section.
export function PubProjet() {
	return (
		<section className={s.section} id="pub">
			<EnTete surTitre="La pub de ton projet">
				Ton projet a une histoire.
				<br />
				<em>Donne-lui sa pub.</em>
			</EnTete>
			<div className={styles.grille}>
				<figure className={`${styles.figure} revele`}>
					<div
						className={styles.affiche}
						data-emplacement="pub-demo"
						role="img"
						aria-label="Affiche de la pub : « Et si ton projet avait sa pub ? », étape 01 sur 04"
					>
						<span className={styles.filigrane} aria-hidden="true" />
						<span className={styles.etape} aria-hidden="true">
							Étape 01 / 04
						</span>
						<p className={styles.mots} aria-hidden="true">
							Et si ton projet
							<br />
							avait <mark>sa pub</mark> ?
						</p>
						<span className={styles.duree} aria-hidden="true">
							0:59 · voix off
						</span>
						<span className={styles.progres} aria-hidden="true" />
					</div>
					<figcaption className={styles.legende}>Aperçu statique. La vidéo de démonstration prendra cette place.</figcaption>
				</figure>

				<div className={styles.colonne}>
					<ol className={styles.etapes}>
						{ETAPES.map((e, i) => (
							<li key={e.titre} className="revele">
								<span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
								<h3>{e.titre}</h3>
								<p>{e.texte}</p>
							</li>
						))}
					</ol>
					<blockquote className={`${styles.post} revele`}>
						<span className={styles.postEtiquette}>Le post du projet</span>
						<p>Aujourd'hui je vous présente scanner-ssl, l'outil qui retrouve les sous-domaines oubliés.</p>
					</blockquote>
				</div>
			</div>
		</section>
	);
}
