import { activiteGithub, detailsCommit, detailsRepo } from "@weekli/core";
import { Hono } from "hono";
import { Octokit } from "octokit";
import { lireSession } from "../lib/session";
import type { AppEnv } from "../types";

// API JSON du tableau de bord. Toutes les routes exigent une session GitHub valide.
export const api = new Hono<AppEnv>();

api.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	const session = await lireSession(c);
	if (!session) return c.json({ erreur: "Non connecte" }, 401);
	c.set("session", session);
	await next();
});

api.onError((err, c) => {
	console.error(err);
	return c.json({ erreur: err instanceof Error ? err.message : "Erreur inattendue" }, 500);
});

const octokit = (token: string) => new Octokit({ auth: token });

api.get("/moi", (c) => {
	const { login, nom, avatar } = c.get("session");
	return c.json({ login, nom, avatar });
});

api.get("/activite", async (c) => {
	const jours = Math.min(Math.max(Number(c.req.query("jours")) || 7, 1), 30);
	const { login, token } = c.get("session");
	return c.json(await activiteGithub(octokit(token), login, jours));
});

api.get("/repos/:repo", async (c) => {
	const { login, token } = c.get("session");
	return c.json(await detailsRepo(octokit(token), login, c.req.param("repo")));
});

api.get("/repos/:repo/commits/:sha", async (c) => {
	const sha = c.req.param("sha");
	if (!/^[0-9a-f]{7,40}$/i.test(sha)) return c.json({ erreur: "SHA invalide" }, 400);
	const { login, token } = c.get("session");
	return c.json(await detailsCommit(octokit(token), login, c.req.param("repo"), sha));
});
