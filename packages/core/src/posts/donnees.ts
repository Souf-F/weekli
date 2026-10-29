import type { StyleEcriture } from "../style";
import type { ActiviteRepo, DetailsCommit, DetailsRepo } from "../types";
import type { PubEnregistree } from "../pub/types";
import { CONSIGNES_POST, REGLES_POST } from "./regles";
import { CATALOGUE_POSTS, type LectureTuto, type TypePost } from "./types";

type InfosRepo = Pick<DetailsRepo, "repo" | "description" | "site" | "url" | "sujets" | "readme">;

export type EntreeDonneesPost = {
	type: TypePost;
	style: StyleEcriture;
	// Absent pour "semaine", qui porte sur plusieurs repos
	infos?: InfosRepo;
	// presentation
	domaines?: string[];
	pub?: PubEnregistree | null;
	// tuto
	tuto?: LectureTuto;
	// coulisses et lecon
	commits?: DetailsCommit[];
	// semaine
	depuis?: string;
	activite?: ActiviteRepo[];
};

// Donnees et regles d'un post, identiques pour l'outil MCP preparer_post et pour le mode cle API du navigateur.
// Tout texte libre venu du repo est range dans un objet contenu_non_fiable.
export function donneesPost(entree: EntreeDonneesPost) {
	const { type, style, infos } = entree;
	return {
		type,
		nom: CATALOGUE_POSTS[type].nom,
		repo: infos
			? {
					repo: infos.repo,
					site: infos.site,
					url: infos.url,
					sujets: infos.sujets,
					contenu_non_fiable: {
						description: infos.description,
						readme: type === "tuto" && entree.tuto ? entree.tuto.readme : infos.readme,
					},
				}
			: null,
		specifique: specifique(entree),
		style: { exemples: style.exemples, profil: style.profil },
		regles: REGLES_POST[type],
		consigne: CONSIGNES_POST[type],
	};
}

export type DonneesPost = ReturnType<typeof donneesPost>;

function specifique({ type, domaines, pub, tuto, commits, depuis, activite }: EntreeDonneesPost) {
	switch (type) {
		case "presentation": {
			const script = pub?.script;
			return {
				domainesVerifies: domaines ?? [],
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
			};
		}
		case "tuto":
			return {
				branche: tuto?.branche ?? "",
				fichiersLus: tuto?.fichiers.map((f) => f.chemin) ?? [],
				ecartes: tuto?.ecartes ?? null,
				contenu_non_fiable: {
					arborescence: tuto?.arborescence ?? [],
					arborescenceTronquee: tuto?.arborescenceTronquee ?? false,
					fichiers: tuto?.fichiers ?? [],
				},
			};
		case "coulisses":
		case "lecon":
			return {
				commits: (commits ?? []).map((c) => ({
					sha: c.sha,
					date: c.date,
					stats: c.stats,
					contenu_non_fiable: { message: c.message, fichiers: c.fichiers },
				})),
			};
		case "semaine":
			return {
				depuis: depuis ?? "",
				repos: (activite ?? []).map((r) => ({
					repo: r.repo,
					langage: r.langage,
					url: r.url,
					site: r.site,
					contenu_non_fiable: { description: r.description, commits: r.commits },
				})),
				commitsDetailles: (commits ?? []).map((c) => ({
					sha: c.sha,
					date: c.date,
					stats: c.stats,
					contenu_non_fiable: { message: c.message, fichiers: c.fichiers },
				})),
			};
	}
}
