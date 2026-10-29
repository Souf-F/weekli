import { LIMITES_PUB, QUESTIONS_PUB } from "@weekli/core";
import type { Reponses } from "@/lib/studio/depart";
import p from "../Tableau/Panneau.module.css";
import styles from "./Assistant.module.css";

type Props = { reponses: Reponses; surChangement: (r: Reponses) => void };

// Les 3 questions de design.md 8.14, ensemble : un exemple sous chacune, 300 caracteres au plus
export function EtapeQuestions({ reponses, surChangement }: Props) {
	return (
		<>
			{QUESTIONS_PUB.map((q) => {
				const valeur = reponses[q.cle];
				return (
					<div key={q.cle} className={p.champ}>
						<label htmlFor={`question-${q.cle}`}>{q.question}</label>
						<textarea
							id={`question-${q.cle}`}
							rows={3}
							maxLength={LIMITES_PUB.reponse}
							value={valeur}
							aria-describedby={`aide-${q.cle}`}
							onChange={(e) => surChangement({ ...reponses, [q.cle]: e.target.value })}
							required
						/>
						<span className={styles.compteur} aria-hidden="true">
							{Array.from(valeur).length} / {LIMITES_PUB.reponse}
						</span>
						<span id={`aide-${q.cle}`} className={styles.exemple}>
							{q.aide}
						</span>
					</div>
				);
			})}
		</>
	);
}
