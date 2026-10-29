import {
	activiteGithub,
	commitsRepo,
	type DemandePost,
	detailsCommit,
	detailsRepo,
	donneesPost,
	type DonneesPost,
	lireRepoPourTuto,
} from "@weekli/core";
import type { Octokit } from "octokit";
import { domainesRevalides } from "./domaines";
import { lirePubs } from "./pubs";
import { lireStyle } from "./style";

// Erreur attendue (repo ou commit inconnu) : message montre tel quel au navigateur et a Claude
export class IntrouvablePost extends Error {}

const MSG_REPO = "Repo introuvable ou prive : Weekli ne lit que les repos publics.";

// 404 d'Octokit ou repo prive (erreur de core, sans statut) : message clair, le reste part en 502
const absent = (err: unknown) =>
	(err as { status?: number }).status === 404 || (err instanceof Error && err.message.startsWith("Ce repo est prive"));

export async function ou<T>(promesse: Promise<T>, message = MSG_REPO): Promise<T> {
	try {
		return await promesse;
	} catch (err) {
		throw absent(err) ? new IntrouvablePost(message) : err;
	}
}

type Compte = { id: string; login: string };

// Lit sous le login de la session : un repo d'un autre compte n'est jamais joignable.
// Route POST /api/posts/donnees et outil MCP preparer_post partagent cette fonction.
export async function preparerPost(env: Env, o: Octokit, { id, login }: Compte, d: DemandePost): Promise<DonneesPost> {
	const style = await lireStyle(env, id);
	if (d.type === "semaine") {
		const { depuis, repos } = await activiteGithub(o, login, d.jours ?? 7);
		return donneesPost({ type: "semaine", style, depuis, activite: repos });
	}
	const repo = d.repo as string;
	const infos = await ou(detailsRepo(o, login, repo));

	switch (d.type) {
		case "presentation": {
			const [domaines, pubs] = await Promise.all([domainesRevalides(env, id), lirePubs(env, id)]);
			const pub = pubs.find((x) => x.script.projet.repo === infos.repo) ?? null;
			return donneesPost({ type: "presentation", style, infos, domaines: domaines.map((x) => x.hote), pub });
		}
		case "tuto":
			return donneesPost({ type: "tuto", style, infos, tuto: await ou(lireRepoPourTuto(o, login, repo, d.fichiers)) });
		default: {
			const commits = await Promise.all(
				(d.commits ?? []).map((sha) => ou(detailsCommit(o, login, repo, sha), "Commit introuvable")),
			);
			return donneesPost({ type: d.type, style, infos, commits });
		}
	}
}

// Commits proposes pour coulisses et lecon (30 jours)
export const commitsDisponibles = (o: Octokit, login: string, repo: string, jours = 30) =>
	ou(commitsRepo(o, login, repo, jours));
