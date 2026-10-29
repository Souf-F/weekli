import { nettoyerScriptPub, type PubEnregistree, type PubResume, type RepoResume, type ScriptPub, scriptPubDepuisReponses } from "@weekli/core";

// Faux serveur pour la recette du studio en developpement (VITE_DEMO=1 uniquement, jamais dans le build).
// Il remplace fetch pour les routes /api utiles au studio : compte, repos, domaines, captures, pubs. Les pubs vivent
// en memoire de l'onglet.

const REPOS: RepoResume[] = [
	{ repo: "tablee", description: "Réservation de tables pour les restaurants indépendants", site: "https://tablee.example", url: "https://github.com/demo/tablee", maj: "2026-10-24T10:00:00Z" },
	{ repo: "poterie-lyon", description: "Ateliers de poterie à Lyon", site: "", url: "https://github.com/demo/poterie-lyon", maj: "2026-10-12T10:00:00Z" },
	{ repo: "carnet-de-bord", description: "Journal de bord pour les petits équipages", site: "https://carnet.example", url: "https://github.com/demo/carnet-de-bord", maj: "2026-09-02T10:00:00Z" },
];

const json = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });
const maintenant = () => new Date().toISOString();

function depart(repo: string, nom: string): ScriptPub {
	const script = scriptPubDepuisReponses({
		nom,
		repo,
		lien: `https://${repo}.example`,
		reponses: {
			pourQui: "Les restaurateurs qui prennent les réservations au téléphone pendant le service.",
			probleme: "Le téléphone sonne en plein service, et les réservations se perdent sur des bouts de papier.",
			promesse: "Les réservations arrivent toutes seules, le service reste calme.",
		},
		marque: { primaire: "#2f5d50" },
	});
	return { ...script, titre: `Pub ${nom}`, voix: { ...script.voix, mode: "aucune" } };
}

const pubs = new Map<string, PubEnregistree>();
function ajouter(script: ScriptPub, ancien = maintenant()): PubEnregistree {
	const pub = { id: crypto.randomUUID(), cree: ancien, maj: ancien, script };
	pubs.set(pub.id, pub);
	return pub;
}

const resume = (p: PubEnregistree): PubResume => ({ id: p.id, titre: p.script.titre, projet: p.script.projet.nom, cree: p.cree, maj: p.maj, scenes: p.script.scenes.filter((s) => !s.masquee).length });

// Capture factice : une page de site dessinee a la volee, aux couleurs de l'hote
async function fausseCapture(url: string, format: string): Promise<Response> {
	const [l, h] = format === "mobile" ? [780, 1688] : [1280, 800];
	const toile = new OffscreenCanvas(l, h);
	const ctx = toile.getContext("2d") as OffscreenCanvasRenderingContext2D;
	ctx.fillStyle = "#f6f3ee";
	ctx.fillRect(0, 0, l, h);
	ctx.fillStyle = "#c4512d";
	ctx.fillRect(0, 0, l, h * 0.09);
	ctx.fillStyle = "#1c1b19";
	ctx.font = `700 ${l * 0.05}px sans-serif`;
	ctx.fillText("Votre table est prête", l * 0.06, h * 0.3);
	ctx.fillStyle = "#c4512d";
	ctx.fillRect(l * 0.06, h * 0.4, l * 0.22, h * 0.09);
	ctx.fillStyle = "#cfc8bd";
	for (let i = 0; i < 3; i++) ctx.fillRect(l * (0.06 + i * 0.3), h * 0.6, l * 0.26, h * 0.28);
	ctx.fillStyle = "#1c1b19";
	ctx.font = `400 ${l * 0.018}px sans-serif`;
	ctx.fillText(url, l * 0.06, h * 0.97);
	const blob = await toile.convertToBlob({ type: "image/jpeg", quality: 0.85 });
	return new Response(blob, { headers: { "Content-Type": "image/jpeg" } });
}

async function traiter(chemin: string, methode: string, corps: unknown): Promise<Response | null> {
	if (chemin === "/api/moi") return json({ id: "1", login: "demo", nom: "Compte de démonstration", avatar: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" });
	if (chemin === "/api/repos") return json(REPOS);
	const repo = /^\/api\/repos\/([^/]+)$/.exec(chemin);
	if (repo) {
		const r = REPOS.find((x) => x.repo === repo[1]);
		return r ? json({ ...r, sujets: [], langages: [], etoiles: 0, readme: `# ${r.repo}\n\n${r.description}.` }) : json({ erreur: "Introuvable" }, 404);
	}
	if (chemin === "/api/domaines") return json([{ hote: "tablee.example", verifie: maintenant() }]);
	if (chemin === "/api/captures") {
		const { url, format } = corps as { url: string; format: string };
		return fausseCapture(url, format);
	}
	if (chemin === "/api/voix") return json({ erreur: "Voix indisponible en démonstration" }, 503);
	if (chemin === "/api/brouillons") return json([]);

	if (chemin === "/api/pubs") {
		if (methode === "GET") return json([...pubs.values()].sort((a, b) => b.maj.localeCompare(a.maj)).map(resume));
		if (methode === "POST") {
			if (pubs.size >= 20) return json({ erreur: "20 pubs au maximum, supprime une ancienne pub" }, 409);
			const r = nettoyerScriptPub((corps as { script: unknown }).script);
			if (!r.script) return json({ erreur: "Script invalide", details: r.erreurs }, 400);
			return json({ pub: ajouter(r.script), avertissements: r.avertissements }, 201);
		}
	}
	const un = /^\/api\/pubs\/([0-9a-f-]{36})$/.exec(chemin);
	if (un) {
		const pub = pubs.get(un[1]);
		if (!pub) return json({ erreur: "Pub introuvable" }, 404);
		if (methode === "GET") return json(pub);
		if (methode === "DELETE") {
			pubs.delete(pub.id);
			return new Response(null, { status: 204 });
		}
		if (methode === "PUT") {
			const r = nettoyerScriptPub((corps as { script: unknown }).script);
			if (!r.script) return json({ erreur: "Script invalide", details: r.erreurs }, 400);
			const maj = { ...pub, maj: maintenant(), script: r.script };
			pubs.set(pub.id, maj);
			return json({ pub: maj, avertissements: r.avertissements });
		}
	}
	return null;
}

export function installerDemo(): void {
	if (!import.meta.env.DEV) return;
	ajouter(depart("tablee", "Tablée"), "2026-10-24T10:00:00.000Z");
	const reel = window.fetch.bind(window);
	window.fetch = async (entree, init) => {
		const url = new URL(typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url, location.href);
		if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
			const corps = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
			const reponse = await traiter(url.pathname, (init?.method ?? "GET").toUpperCase(), corps);
			if (reponse) return reponse;
		}
		return reel(entree, init);
	};
	console.info("Weekli : API de démonstration active (développement uniquement)");
}
