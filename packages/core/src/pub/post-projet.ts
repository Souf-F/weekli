import type { StyleEcriture } from "../style";
import type { DetailsRepo } from "../types";
import { REGLES_POST_PROJET } from "./guide";
import type { PubEnregistree } from "./types";

export const CONSIGNE_POST_PROJET = `Propose 2 ou 3 versions du post LinkedIn, chacune avec un angle différent, au format de l'utilisateur : « Aujourd'hui je vous présente » suivi du nom du projet, ce qu'il fait et le problème qu'il règle, pourquoi je l'ai fait, comment je l'ai conçu (l'idée et la démarche), pour qui, puis un appel. Aucun commit, code ni chiffre de développement. Si le pourquoi ou la démarche ne figurent ni dans les réponses de l'utilisateur, ni dans le script de la pub, ni dans le README, pose-lui la question avant de rédiger : ne les invente jamais.`;

export type EntreePostProjet = {
	infos: Pick<DetailsRepo, "repo" | "description" | "site" | "url" | "sujets" | "readme">;
	domaines: string[];
	pub: PubEnregistree | null;
	style: StyleEcriture;
};

// Donnees et regles du post du projet, identiques pour l'outil MCP et pour le mode cle API du navigateur
export function donneesPostProjet({ infos, domaines, pub, style }: EntreePostProjet) {
	const script = pub?.script;
	return {
		repo: {
			repo: infos.repo,
			site: infos.site,
			url: infos.url,
			sujets: infos.sujets,
			contenu_non_fiable: { description: infos.description, readme: infos.readme },
		},
		domainesVerifies: domaines,
		pubExistante:
			pub && script
				? {
						id: pub.id,
						titre: script.titre,
						reponses: script.reponses,
						voix: script.scenes
							.filter((s) => !s.masquee && s.voix)
							.map((s) => s.voix)
							.join(" "),
					}
				: null,
		style: { exemples: style.exemples, profil: style.profil },
		regles: REGLES_POST_PROJET,
		consigne: CONSIGNE_POST_PROJET,
	};
}
