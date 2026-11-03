import { PanneauActivite } from "../PanneauActivite";
import { PanneauOptions } from "../PanneauOptions";
import type { Semaine } from "../useSemaine";
import e from "../Etapes.module.css";

// Ancien flux "Ma semaine", reutilise tel quel : periode, commits coches, angle, langue et nombre de posts
export function ReglagesSemaine({ semaine: s }: { semaine: Semaine }) {
	return (
		<div className={`${e.corps} ${e.semaine}`}>
			<PanneauActivite
				jours={s.jours}
				surJours={s.surJours}
				activite={s.activite}
				chargement={s.chargement}
				erreur={s.erreur}
				selection={s.selection}
				surBasculer={s.basculer}
				surBasculerRepo={s.basculerRepo}
			/>
			<PanneauOptions
				options={s.options}
				surOptions={s.surOptions}
				inclureDiffs={s.inclureDiffs}
				surInclureDiffs={s.surInclureDiffs}
				nbSelection={s.selection.size}
				nbRepos={s.activite?.repos.length ?? 0}
			/>
		</div>
	);
}
