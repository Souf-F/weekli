import {
	activiteGithub,
	detailsCommit,
	detailsRepo,
	listerRepos,
	nettoyerPost,
	nettoyerScriptPub,
	type Post,
	proposerFichiersTuto,
	validerDemandePost,
} from "@weekli/core";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { Octokit } from "octokit";
import { ecrireBrouillons, lireBrouillons, sauverPosts } from "../lib/brouillons";
import { capturer, ErreurCapture, type Format, verifierUrl } from "../lib/capture";
import {
	ajouterDomaine,
	domainesRevalides,
	ecrireDomaines,
	jeton,
	lireDomaines,
	nomTxt,
	normaliserHote,
	urlFichier,
	valeurAttendue,
	verifier,
} from "../lib/domaines";
import { effacerDonnees } from "../lib/donnees";
import { commitsDisponibles, IntrouvablePost, ou, preparerPost } from "../lib/posts";
import { creerPub, LimitePubs, lirePub, lirePubs, remplacerPub, resume, supprimerPub } from "../lib/pubs";
import { lireSession, supprimerSession } from "../lib/session";
import { ecrireStyle, lireStyle, supprimerStyle } from "../lib/style";
import { cleCache, ecrireCache, lireCache, reserverPhrase, synthetiser, TEXTE_MAX } from "../lib/voix";
import { NOM_REPO, SHA } from "../lib/validation";
import type { AppEnv } from "../types";

// API JSON du tableau de bord. Toutes les routes exigent une session GitHub valide.
export const api = new Hono<AppEnv>();

api.use("*", async (c, next) => {
	const session = await lireSession(c);
	if (!session) return c.json({ erreur: "Non connecte" }, 401);

	const { success } = await c.env.LIMITE_API.limit({ key: `api:${session.id}` });
	if (!success) return c.json({ erreur: "Trop de requetes, reessaie dans une minute" }, 429);

	c.set("session", session);
	await next();
});

// Aucun detail interne n'est renvoye au navigateur : il reste dans les logs
api.onError((err, c) => {
	console.error("API :", err);
	if (err instanceof IntrouvablePost) return c.json({ erreur: err.message }, 404);
	const statut = (err as { status?: number }).status;
	if (statut === 404) return c.json({ erreur: "Introuvable" }, 404);
	return c.json({ erreur: "Erreur lors de la lecture de GitHub" }, 502);
});

const octokit = (token: string) => new Octokit({ auth: token });

api.get("/moi", (c) => {
	const { id, login, nom, avatar } = c.get("session");
	return c.json({ id, login, nom, avatar });
});

api.get("/activite", async (c) => {
	const jours = Math.min(Math.max(Number.parseInt(c.req.query("jours") ?? "7", 10) || 7, 1), 30);
	const { login, token } = c.get("session");
	return c.json(await activiteGithub(octokit(token), login, jours));
});

api.get("/repos", async (c) => c.json(await listerRepos(octokit(c.get("session").token))));

api.get("/repos/:repo", async (c) => {
	const repo = c.req.param("repo");
	if (!NOM_REPO.test(repo)) return c.json({ erreur: "Nom de repo invalide" }, 400);
	const { login, token } = c.get("session");
	return c.json(await detailsRepo(octokit(token), login, repo));
});

const ID = /^[0-9a-f-]{36}$/;
const corpsLimite = bodyLimit({
	maxSize: 64 * 1024,
	onError: (c) => c.json({ erreur: "Requete trop volumineuse" }, 413),
});

// Commits du compte sur ce repo, pour choisir ceux d'un post (coulisses, lecon)
api.get("/repos/:repo/commits", async (c) => {
	const repo = c.req.param("repo");
	if (!NOM_REPO.test(repo)) return c.json({ erreur: "Nom de repo invalide" }, 400);
	const jours = Math.min(Math.max(Number.parseInt(c.req.query("jours") ?? "30", 10) || 30, 1), 90);
	const { login, token } = c.get("session");
	return c.json(await commitsDisponibles(octokit(token), login, repo, jours));
});

// Apercu de ce que Weekli lirait pour un tuto : aucun fichier n'est telecharge
api.get("/repos/:repo/fichiers-tuto", async (c) => {
	const repo = c.req.param("repo");
	if (!NOM_REPO.test(repo)) return c.json({ erreur: "Nom de repo invalide" }, 400);
	const { login, token } = c.get("session");
	return c.json(await ou(proposerFichiersTuto(octokit(token), login, repo)));
});

api.get("/repos/:repo/commits/:sha", async (c) => {
	const { repo, sha } = c.req.param();
	if (!NOM_REPO.test(repo) || !SHA.test(sha)) return c.json({ erreur: "Parametres invalides" }, 400);
	const { login, token } = c.get("session");
	return c.json(await detailsCommit(octokit(token), login, repo, sha));
});

// Donnees et regles d'un post selon son type. Le serveur ne redige pas : Claude ou le navigateur le fait.
api.post("/posts/donnees", corpsLimite, async (c) => {
	const { demande, erreur } = validerDemandePost(await c.req.json().catch(() => null));
	if (!demande) return c.json({ erreur }, 400);
	const { id, login, token } = c.get("session");
	return c.json(await preparerPost(c.env, octokit(token), { id, login }, demande));
});

// Droit d'acces et de portabilite (ADR-12) : tout ce que Weekli stocke pour le compte, jamais le token GitHub
api.get("/moi/donnees", async (c) => {
	const { id, login, nom } = c.get("session");
	const [brouillons, pubs, style, domaines] = await Promise.all([
		lireBrouillons(c.env, id),
		lirePubs(c.env, id),
		lireStyle(c.env, id),
		lireDomaines(c.env, id),
	]);
	return c.json(
		{
			exporte: new Date().toISOString(),
			profil: { id, login, nom },
			brouillons,
			pubs,
			style,
			domaines,
			conservation: "90 jours apres la derniere modification",
		},
		200,
		{ "Content-Disposition": 'attachment; filename="weekli-donnees.json"' },
	);
});

// Droit a l'effacement : donnees du compte supprimees, puis session detruite et cookie efface
api.delete("/moi/donnees", async (c) => {
	try {
		await effacerDonnees(c.env, c.get("session"));
	} catch {
		return c.json({ erreur: "Suppression incomplete, reessaie" }, 500);
	}
	await supprimerSession(c, c.get("session"));
	return c.body(null, 204);
});

// Historique des brouillons

api.get("/brouillons", async (c) => c.json(await lireBrouillons(c.env, c.get("session").id)));

api.post("/brouillons", corpsLimite, async (c) => {
	const corps = await c.req.json().catch(() => null);
	const posts = (Array.isArray(corps?.posts) ? corps.posts : [])
		.slice(0, 5)
		.map(nettoyerPost)
		.filter(Boolean) as Post[];
	if (posts.length === 0) return c.json({ erreur: "Aucun post valide" }, 400);
	return c.json(await sauverPosts(c.env, c.get("session").id, posts), 201);
});

api.patch("/brouillons/:id", corpsLimite, async (c) => {
	const idBrouillon = c.req.param("id");
	if (!ID.test(idBrouillon)) return c.json({ erreur: "Identifiant invalide" }, 400);
	const corps = (await c.req.json().catch(() => null)) as { texte?: unknown; publie?: unknown } | null;
	const { id } = c.get("session");
	const brouillons = await lireBrouillons(c.env, id);
	const cible = brouillons.find((b) => b.id === idBrouillon);
	if (!cible) return c.json({ erreur: "Introuvable" }, 404);

	if (typeof corps?.texte === "string") {
		const propre = nettoyerPost({ ...cible, texte: corps.texte });
		if (!propre) return c.json({ erreur: "Texte vide" }, 400);
		cible.texte = propre.texte;
	}
	if (typeof corps?.publie === "boolean") cible.publie = corps.publie;
	await ecrireBrouillons(c.env, id, brouillons);
	return c.json(cible);
});

api.delete("/brouillons/:id", async (c) => {
	const idBrouillon = c.req.param("id");
	if (!ID.test(idBrouillon)) return c.json({ erreur: "Identifiant invalide" }, 400);
	const { id } = c.get("session");
	const brouillons = await lireBrouillons(c.env, id);
	const restants = brouillons.filter((b) => b.id !== idBrouillon);
	if (restants.length === brouillons.length) return c.json({ erreur: "Introuvable" }, 404);
	await ecrireBrouillons(c.env, id, restants);
	return c.body(null, 204);
});

// Pubs video (ADR-05). Le script est toujours revalide par nettoyerScriptPub : rien d'inattendu n'est stocke.

async function scriptValide(c: Context<AppEnv>) {
	const corps = (await c.req.json().catch(() => null)) as { script?: unknown } | null;
	const { script, avertissements, erreurs } = nettoyerScriptPub(corps?.script);
	return script
		? { script, avertissements }
		: { refus: c.json({ erreur: "Script invalide", details: erreurs }, 400) };
}

api.get("/pubs", async (c) => c.json((await lirePubs(c.env, c.get("session").id)).map(resume)));

api.get("/pubs/:id", async (c) => {
	const idPub = c.req.param("id");
	if (!ID.test(idPub)) return c.json({ erreur: "Identifiant invalide" }, 400);
	const pub = await lirePub(c.env, c.get("session").id, idPub);
	return pub ? c.json(pub) : c.json({ erreur: "Introuvable" }, 404);
});

api.post("/pubs", corpsLimite, async (c) => {
	const { script, avertissements, refus } = await scriptValide(c);
	if (!script) return refus;
	try {
		return c.json({ pub: await creerPub(c.env, c.get("session").id, script), avertissements }, 201);
	} catch (err) {
		if (err instanceof LimitePubs) return c.json({ erreur: "20 pubs au maximum, supprime une ancienne pub" }, 409);
		throw err;
	}
});

api.put("/pubs/:id", corpsLimite, async (c) => {
	const idPub = c.req.param("id");
	if (!ID.test(idPub)) return c.json({ erreur: "Identifiant invalide" }, 400);
	const { script, avertissements, refus } = await scriptValide(c);
	if (!script) return refus;
	const pub = await remplacerPub(c.env, c.get("session").id, idPub, script);
	return pub ? c.json({ pub, avertissements }) : c.json({ erreur: "Introuvable" }, 404);
});

api.delete("/pubs/:id", async (c) => {
	const idPub = c.req.param("id");
	if (!ID.test(idPub)) return c.json({ erreur: "Identifiant invalide" }, 400);
	return (await supprimerPub(c.env, c.get("session").id, idPub))
		? c.body(null, 204)
		: c.json({ erreur: "Introuvable" }, 404);
});

// Style d'ecriture memorise

api.get("/style", async (c) => c.json(await lireStyle(c.env, c.get("session").id)));

api.put("/style", corpsLimite, async (c) => {
	const style = await ecrireStyle(c.env, c.get("session").id, await c.req.json().catch(() => null));
	return style ? c.json(style) : c.json({ erreur: "Style vide" }, 400);
});

api.delete("/style", async (c) => {
	await supprimerStyle(c.env, c.get("session").id);
	return c.body(null, 204);
});

// Voix off : l'audio est genere par le service de lecture d'Edge, le front bascule sur Kokoro en cas de 502.
// `scene` n'est pas transmise a Microsoft : elle est seulement validee (le corps est strict).
const SCENE = /^[a-z0-9_-]{1,64}$/i;

api.post("/voix", corpsLimite, async (c) => {
	const corps = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
	const texte = typeof corps?.texte === "string" ? corps.texte.trim() : "";
	const valide =
		corps !== null &&
		typeof corps === "object" &&
		Object.keys(corps).every((k) => k === "texte" || k === "scene") &&
		texte.length >= 1 &&
		texte.length <= TEXTE_MAX &&
		typeof corps.scene === "string" &&
		SCENE.test(corps.scene);
	if (!valide) return c.json({ erreur: `Texte de 1 a ${TEXTE_MAX} caracteres et scene requis` }, 400);

	// Le quota compte aussi les reponses du cache : sans cela, la vitesse de reponse dirait si une phrase exacte a deja
	// ete synthetisee par quelqu'un d'autre
	if (!(await reserverPhrase(c.env, c.get("session").id))) {
		return c.json({ erreur: "60 phrases par heure au maximum" }, 429);
	}
	const repondre = (mp3: Uint8Array<ArrayBuffer>) => c.body(mp3, 200, { "Content-Type": "audio/mpeg" });
	const cle = await cleCache(texte);
	const connu = await lireCache(c.env, cle);
	if (connu) return repondre(new Uint8Array(connu));

	let mp3: Uint8Array<ArrayBuffer>;
	try {
		mp3 = await synthetiser(texte);
	} catch (err) {
		console.error("Voix :", err instanceof Error ? err.message : "echec");
		return c.json({ erreur: "Voix indisponible" }, 502);
	}
	await ecrireCache(c.env, cle, mp3).catch((err: unknown) =>
		console.error("Voix, cache :", err instanceof Error ? err.name : "echec"),
	);
	return repondre(mp3);
});

// Domaines verifies et captures

api.get("/domaines", async (c) => c.json(await lireDomaines(c.env, c.get("session").id)));

// Donne les instructions de verification ; rien n'est enregistre tant que la preuve n'est pas faite
api.post("/domaines/preparer", corpsLimite, async (c) => {
	const corps = (await c.req.json().catch(() => null)) as { hote?: unknown } | null;
	const hote = typeof corps?.hote === "string" ? normaliserHote(corps.hote) : null;
	if (!hote) return c.json({ erreur: "Nom de domaine invalide (exemple : monsite.dev)" }, 400);
	const attendu = valeurAttendue(await jeton(c.env.COOKIE_ENCRYPTION_KEY, c.get("session").id, hote));
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
	const { id } = c.get("session");
	const { success } = await c.env.LIMITE_CAPTURE.limit({ key: `verif:${id}` });
	if (!success) return c.json({ erreur: "Trop de tentatives, reessaie dans une minute" }, 429);

	const attendu = valeurAttendue(await jeton(c.env.COOKIE_ENCRYPTION_KEY, id, hote));
	if (!(await verifier(hote, attendu))) {
		return c.json(
			{ erreur: "Preuve introuvable. L'enregistrement DNS peut mettre quelques minutes a se propager." },
			422,
		);
	}
	try {
		return c.json(await ajouterDomaine(c.env, id, hote));
	} catch (err) {
		return c.json({ erreur: err instanceof Error ? err.message : "Impossible d'ajouter le domaine" }, 400);
	}
});

api.delete("/domaines/:hote", async (c) => {
	const hote = normaliserHote(c.req.param("hote"));
	if (!hote) return c.json({ erreur: "Nom de domaine invalide" }, 400);
	const { id } = c.get("session");
	await ecrireDomaines(
		c.env,
		id,
		(await lireDomaines(c.env, id)).filter((d) => d.hote !== hote),
	);
	return c.body(null, 204);
});

api.post("/captures", corpsLimite, async (c) => {
	const corps = (await c.req.json().catch(() => null)) as { url?: unknown; format?: unknown } | null;
	const format: Format = corps?.format === "mobile" ? "mobile" : "bureau";
	const { id } = c.get("session");

	const { success } = await c.env.LIMITE_CAPTURE.limit({ key: `capture:${id}` });
	if (!success) return c.json({ erreur: "5 captures par minute au maximum" }, 429);

	try {
		const domaines = await domainesRevalides(c.env, id);
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
