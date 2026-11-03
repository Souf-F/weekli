import { CATALOGUE_POSTS, type TypePost } from "@weekli/core";
import type { ReglagesType as Reglages } from "@/lib/parcours";
import e from "./Etapes.module.css";
import { ReglagesCommits } from "./reglages/ReglagesCommits";
import { ReglagesPresentation } from "./reglages/ReglagesPresentation";
import { ReglagesSemaine } from "./reglages/ReglagesSemaine";
import { ReglagesTuto } from "./reglages/ReglagesTuto";
import type { Semaine } from "./useSemaine";

type Props = {
	type: TypePost;
	repos: string[];
	reglages: Reglages;
	surModifier: (m: Partial<Reglages>) => void;
	semaine: Semaine;
};

// Etape 3 : le composant choisit les reglages d'apres le type. Les commits ne sont montes (donc charges)
// que pour les types dont le catalogue a besoin.
export function ReglagesType({ type, repos, reglages, surModifier, semaine }: Props) {
	const repo = repos[0] ?? "";
	const cible = type === "semaine" ? (repos.length > 0 ? repos.join(", ") : "tous les repos") : repo;
	return (
		<div className={e.corps}>
			<h2 id="titre-etape" tabIndex={-1} className={e.titre}>
				Les réglages
			</h2>
			<p className={e.recap}>
				<span>Repo</span> {cible} <span>Type</span> {CATALOGUE_POSTS[type].nom}
			</p>
			{type === "presentation" && <ReglagesPresentation repo={repo} reglages={reglages} surModifier={surModifier} />}
			{type === "tuto" && <ReglagesTuto repo={repo} reglages={reglages} surModifier={surModifier} />}
			{(type === "coulisses" || type === "lecon") && (
				<ReglagesCommits type={type} repo={repo} reglages={reglages} surModifier={surModifier} />
			)}
			{type === "semaine" && <ReglagesSemaine semaine={semaine} />}
		</div>
	);
}
