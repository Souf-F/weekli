import { activiteGithub, detailsCommit, detailsRepo } from "@weekli/core";
import { Hono } from "hono";
import { Octokit } from "octokit";
import { lireSession } from "../lib/session";
import { NOM_REPO, SHA } from "../lib/validation";
import type { AppEnv } from "../types";

// API JSON du tableau de bord. Toutes les routes exigent une session GitHub valide.
export const api = new Hono<AppEnv>();

api.use("*", async (c, next) => {
	const session = await lireSession(c);
	if (!session) return c.json({ erreur: "Non connecte" }, 401);

	const { success } = await c.env.LIMITE_API.limit({ key: `api:${session.login}` });
	if (!success) return c.json({ erreur: "Trop de requetes, reessaie dans une minute" }, 429);

	c.set("session", session);
	await next();
});

// Aucun detail interne n'est renvoye au navigateur : il reste dans les logs
api.onError((err, c) => {
	console.error("API :", err);
	const statut = (err as { status?: number }).status;
	if (statut === 404) return c.json({ erreur: "Introuvable" }, 404);
	return c.json({ erreur: "Erreur lors de la lecture de GitHub" }, 502);
});

const octokit = (token: string) => new Octokit({ auth: token });

api.get("/moi", (c) => {
	const { login, nom, avatar } = c.get("session");
	return c.json({ login, nom, avatar });
});

api.get("/activite", async (c) => {
	const jours = Math.min(Math.max(Number.parseInt(c.req.query("jours") ?? "7", 10) || 7, 1), 30);
	const { login, token } = c.get("session");
	return c.json(await activiteGithub(octokit(token), login, jours));
});

api.get("/repos/:repo", async (c) => {
	const repo = c.req.param("repo");
	if (!NOM_REPO.test(repo)) return c.json({ erreur: "Nom de repo invalide" }, 400);
	const { login, token } = c.get("session");
	return c.json(await detailsRepo(octokit(token), login, repo));
});

api.get("/repos/:repo/commits/:sha", async (c) => {
	const { repo, sha } = c.req.param();
	if (!NOM_REPO.test(repo) || !SHA.test(sha)) return c.json({ erreur: "Parametres invalides" }, 400);
	const { login, token } = c.get("session");
	return c.json(await detailsCommit(octokit(token), login, repo, sha));
});
