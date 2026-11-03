import { EnTete } from "./EnTete";
import { LecteurPub } from "./LecteurPub";
import s from "./Section.module.css";
import styles from "./PubProjet.module.css";

const ETAPES = [
	{ titre: "Claude te pose trois questions", texte: "Pour qui, quel problème, quelle promesse. Le reste, il le lit dans ton README et sur ton site." },
	{ titre: "Il écrit la pub", texte: "Un script en scènes avec voix off, à tes couleurs, sans une ligne de code ni un commit à l'écran." },
	{ titre: "Tu ajustes et tu exportes", texte: "Le studio rend la vidéo dans ton navigateur. Le post du projet est livré avec elle." },
];

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
					<LecteurPub />
					<figcaption className={styles.legende}>La pub de démonstration : 46 secondes, voix off française. Le son reste coupé tant que tu ne l'actives pas.</figcaption>
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
