import { activiteGithub, detailsCommit, detailsRepo, nettoyerPost, type Post } from "@weekli/core";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { Octokit } from "octokit";
import { ecrireBrouillons, lireBrouillons, sauverPosts } from "../lib/brouillons";
import { capturer, ErreurCapture, type Format, verifierUrl } from "../lib/capture";
import {
	ajouterDomaine,
	ecrireDomaines,
	jeton,
	lireDomaines,
	nomTxt,
	normaliserHote,
	urlFichier,
	valeurAttendue,
	verifier,
} from "../lib/domaines";
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

// Historique des brouillons

const ID = /^[0-9a-f-]{36}$/;
const corpsLimite = bodyLimit({
	maxSize: 64 * 1024,
	onError: (c) => c.json({ erreur: "Requete trop volumineuse" }, 413),
});

api.get("/brouillons", async (c) => c.json(await lireBrouillons(c.env, c.get("session").login)));

api.post("/brouillons", corpsLimite, async (c) => {
	const corps = await c.req.json().catch(() => null);
	const posts = (Array.isArray(corps?.posts) ? corps.posts : [])
		.slice(0, 5)
		.map(nettoyerPost)
		.filter(Boolean) as Post[];
	if (posts.length === 0) return c.json({ erreur: "Aucun post valide" }, 400);
	return c.json(await sauverPosts(c.env, c.get("session").login, posts), 201);
});

api.patch("/brouillons/:id", corpsLimite, async (c) => {
	const id = c.req.param("id");
	if (!ID.test(id)) return c.json({ erreur: "Identifiant invalide" }, 400);
	const corps = (await c.req.json().catch(() => null)) as { texte?: unknown; publie?: unknown } | null;
	const { login } = c.get("session");
	const brouillons = await lireBrouillons(c.env, login);
	const cible = brouillons.find((b) => b.id === id);
	if (!cible) return c.json({ erreur: "Introuvable" }, 404);

	if (typeof corps?.texte === "string") {
		const propre = nettoyerPost({ ...cible, texte: corps.texte });
		if (!propre) return c.json({ erreur: "Texte vide" }, 400);
		cible.texte = propre.texte;
	}
	if (typeof corps?.publie === "boolean") cible.publie = corps.publie;
	await ecrireBrouillons(c.env, login, brouillons);
	return c.json(cible);
});

api.delete("/brouillons/:id", async (c) => {
	const id = c.req.param("id");
	if (!ID.test(id)) return c.json({ erreur: "Identifiant invalide" }, 400);
	const { login } = c.get("session");
	const brouillons = await lireBrouillons(c.env, login);
	const restants = brouillons.filter((b) => b.id !== id);
	if (restants.length === brouillons.length) return c.json({ erreur: "Introuvable" }, 404);
	await ecrireBrouillons(c.env, login, restants);
	return c.body(null, 204);
});

// Domaines verifies et captures

api.get("/domaines", async (c) => c.json(await lireDomaines(c.env, c.get("session").login)));

// Donne les instructions de verification ; rien n'est enregistre tant que la preuve n'est pas faite
api.post("/domaines/preparer", corpsLimite, async (c) => {
	const corps = (await c.req.json().catch(() => null)) as { hote?: unknown } | null;
	const hote = typeof corps?.hote === "string" ? normaliserHote(corps.hote) : null;
	if (!hote) return c.json({ erreur: "Nom de domaine invalide (exemple : monsite.dev)" }, 400);
	const attendu = valeurAttendue(await jeton(c.env.COOKIE_ENCRYPTION_KEY, c.get("session").login, hote));
	return c.json({
		hote,
		dns: { nom: nomTxt(hote), type: "TXT", valeur: attendu },
		fichier: { url: urlFichier(hote), contenu: attendu },
	});
});

api.post("/domaines/verifier", corpsLimite, async (c) => {
	const corps = (await c.req.json().catch(() => null)) as { hote?: unknown } | null;
	const hote = typeof corps?.hote === "string" ? normaliserHote(corps.hote) : null;
	if (!hote) return c.json({ erreur: "Nom de domaine invalide" }, 400);
	const { login } = c.get("session");
	const { success } = await c.env.LIMITE_CAPTURE.limit({ key: `verif:${login}` });
	if (!success) return c.json({ erreur: "Trop de tentatives, reessaie dans une minute" }, 429);

	const attendu = valeurAttendue(await jeton(c.env.COOKIE_ENCRYPTION_KEY, login, hote));
	if (!(await verifier(hote, attendu))) {
		return c.json(
			{ erreur: "Preuve introuvable. L'enregistrement DNS peut mettre quelques minutes a se propager." },
			422,
		);
	}
	try {
		return c.json(await ajouterDomaine(c.env, login, hote));
	} catch (err) {
		return c.json({ erreur: err instanceof Error ? err.message : "Impossible d'ajouter le domaine" }, 400);
	}
});

api.delete("/domaines/:hote", async (c) => {
	const hote = normaliserHote(c.req.param("hote"));
	if (!hote) return c.json({ erreur: "Nom de domaine invalide" }, 400);
	const { login } = c.get("session");
	await ecrireDomaines(
		c.env,
		login,
		(await lireDomaines(c.env, login)).filter((d) => d.hote !== hote),
	);
	return c.body(null, 204);
});

api.post("/captures", corpsLimite, async (c) => {
	const corps = (await c.req.json().catch(() => null)) as { url?: unknown; format?: unknown } | null;
	const format: Format = corps?.format === "mobile" ? "mobile" : "bureau";
	const { login } = c.get("session");

	const { success } = await c.env.LIMITE_CAPTURE.limit({ key: `capture:${login}` });
	if (!success) return c.json({ erreur: "5 captures par minute au maximum" }, 429);

	try {
		const domaines = await lireDomaines(c.env, login);
		const url = verifierUrl(typeof corps?.url === "string" ? corps.url : "", domaines);
		const image = await capturer(c.env, url, format, domaines);
		return c.body(
			Uint8Array.from(atob(image), (x) => x.charCodeAt(0)),
			200,
			{ "Content-Type": "image/jpeg" },
		);
	} catch (err) {
		if (err instanceof ErreurCapture) return c.json({ erreur: err.message }, 400);
		throw err;
	}
});
