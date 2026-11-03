import { ETAPES, type NumeroEtape } from "./etapes";
import styles from "./FilEtapes.module.css";

type Props = {
	etape: NumeroEtape;
	// Resume du choix fait a chaque etape ("" tant qu'elle n'est pas faite)
	resumes: Record<NumeroEtape, string>;
	surAller: (e: NumeroEtape) => void;
};

// Une etape faite devient un bouton qui resume le choix et y ramene ; l'etape courante porte aria-current
export function FilEtapes({ etape, resumes, surAller }: Props) {
	return (
		<nav aria-label="Étapes du parcours">
			<ol className={styles.fil}>
				{ETAPES.map(({ numero, nom }) => {
					const faite = numero < etape && resumes[numero] !== "";
					const contenu = (
						<>
							<span className={styles.pastille} aria-hidden="true">
								{numero}
							</span>
							<span className={styles.texte}>
								<span className={styles.nom}>{nom}</span>
								{faite && <span className={styles.resume}>{resumes[numero]}</span>}
							</span>
						</>
					);
					return (
						<li key={numero} className={styles.etape} data-etat={numero === etape ? "courante" : faite ? "faite" : "a-venir"}>
							{faite ? (
								<button type="button" className={styles.bouton} onClick={() => surAller(numero)}>
									{contenu}
									<span className={styles.lecteur}> : {resumes[numero]}, modifier</span>
								</button>
							) : (
								<span className={styles.bouton} aria-current={numero === etape ? "step" : undefined}>
									{contenu}
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
