import { LIMITE_LONG, type ReglagesType } from "@/lib/parcours";
import e from "../Etapes.module.css";
import p from "../Panneau.module.css";
import { ChampTexte } from "./Compteur";
import { ListeCommits } from "./ListeCommits";
import { useState } from "react";

type Props = {
	// coulisses : commits obligatoires ; lecon : probleme d'abord, commits facultatifs dans un bloc replie
	type: "coulisses" | "lecon";
	repo: string;
	reglages: ReglagesType;
	surModifier: (m: Partial<ReglagesType>) => void;
};

export function ReglagesCommits({ type, repo, reglages, surModifier }: Props) {
	const [ouvert, setOuvert] = useState(reglages.commits.length > 0);

	if (type === "coulisses") {
		return (
			<div className={e.corps}>
				<p className={p.aide}>Choisis les commits qui racontent la décision. Aucun n'est coché au départ : c'est toi qui racontes.</p>
				<ListeCommits repo={repo} reglages={reglages} surModifier={surModifier} />
				<ChampTexte
					etiquette="Pourquoi ce choix ? (facultatif)"
					valeur={reglages.choix}
					max={LIMITE_LONG}
					surChange={(choix) => surModifier({ choix })}
				/>
			</div>
		);
	}

	return (
		<div className={e.corps}>
			<ChampTexte
				etiquette="Le problème, en deux phrases"
				valeur={reglages.probleme}
				max={LIMITE_LONG}
				surChange={(probleme) => surModifier({ probleme })}
				exemple="Les réservations arrivaient en double quand deux clientes cliquaient en même temps."
			/>
			<details className={e.repli} open={ouvert} onToggle={(ev) => setOuvert(ev.currentTarget.open)}>
				<summary>
					Ajouter des commits qui racontent ça
					{reglages.commits.length > 0 && <span className={e.badge}>{reglages.commits.length}</span>}
				</summary>
				{ouvert && <ListeCommits repo={repo} reglages={reglages} surModifier={surModifier} />}
			</details>
		</div>
	);
}
