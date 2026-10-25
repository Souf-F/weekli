import { describe, expect, it } from "vitest";
import { EXEMPLE } from "./exemple.fixture";
import { nettoyerScriptPub } from "./nettoyer";
import { SCHEMA_SCRIPT_PUB } from "./schema";
import { calculerTimeline, dureeScene } from "./timeline";
import { BUT_DEFAUT, type ScenePub, type ScriptPub } from "./types";

type Brut = Record<string, any>;
const copie = (): Brut => structuredClone(EXEMPLE) as Brut;
const scene = (b: Brut, id: string) => b.scenes.find((s: Brut) => s.id === id);

// Phrases d'appoint toutes differentes : une meme phrase repetee declencherait l'avertissement de repetition
const APPOINTS = [
	"Rien n'échappe à personne ici, vraiment.",
	"Chaque détail compte beaucoup ce soir.",
	"Personne ne s'y perd jamais longtemps.",
	"Les équipes respirent enfin, tranquillement.",
	"Aucune mauvaise surprise ne les attend.",
	"L'ambiance change dès les premières minutes.",
	"Les habitués sourient devant leur assiette.",
	"Les soirées s'allongent avec bonheur.",
	"Les plats sortent chauds, à la bonne cadence.",
	"La cuisine suit sans jamais ralentir.",
	"Les verres tintent joyeusement jusqu'au dessert.",
	"Chacun trouve sa place sans détour.",
];

// Script de reference, voix allongee pour tenir dans 120 a 170 mots et 50 a 65 s (sauf les captures, brèves)
function bon(): Brut {
	const b = copie();
	b.scenes.forEach((s: Brut, i: number) => {
		if (s.visuel?.type !== "capture") s.voix += ` ${APPOINTS[i % APPOINTS.length]}`;
	});
	return b;
}
const valide = (b: Brut): ScriptPub => {
	const r = nettoyerScriptPub(b);
	expect(r.erreurs).toEqual([]);
	return r.script as ScriptPub;
};
const rejet = (b: unknown, extrait: string) => {
	const r = nettoyerScriptPub(b);
	expect(r.script).toBeNull();
	expect(r.erreurs.join("\n")).toContain(extrait);
};
const avertit = (b: Brut, extrait: string) => {
	const r = nettoyerScriptPub(b);
	expect(r.erreurs).toEqual([]);
	expect(r.script).not.toBeNull();
	expect(r.avertissements.join("\n")).toContain(extrait);
	return r;
};
const preuve = (id: string) => ({
	id,
	type: "preuve",
	surtitre: "Promesses",
	elements: ["Gratuit"],
	voix: "x ".repeat(100),
});

describe("script nominal", () => {
	it("accepte le script de reference sans erreur ni avertissement", () => {
		const r = nettoyerScriptPub(bon());
		expect(r).toMatchObject({ erreurs: [], avertissements: [] });
		expect(r.script?.scenes).toHaveLength(12);
	});

	it("applique les valeurs par defaut", () => {
		const b = bon();
		b.marque = { primaire: "#C2410C" };
		b.voix = {};
		delete b.musique;
		const s = valide(b);
		expect(s.marque).toEqual({ primaire: "#c2410c", logo: "monogramme", monogramme: "T", typo: "nette" });
		expect(s.voix).toEqual({ mode: "synthese", vitesse: 1, prononciation: {} });
		expect(s.musique).toBe("energique");
	});

	it("ignore les champs inconnus", () => {
		const b = bon();
		b.admin = true;
		b.projet.secret = "x";
		scene(b, "fin").onclick = "alert(1)";
		const s = valide(b);
		expect(s).not.toHaveProperty("admin");
		expect(s.projet).not.toHaveProperty("secret");
		expect(s.scenes.at(-1)).not.toHaveProperty("onclick");
	});
});

describe("rejets (api-contract.md 2.1)", () => {
	it.each([null, undefined, "texte", 42, [], { version: 2 }, {}])("rejette l'entree %j", (entree) =>
		rejet(entree, "version 1"),
	);

	it("rejette un script sans scene revelation", () => {
		const b = bon();
		b.scenes = b.scenes.filter((s: Brut) => s.type !== "revelation");
		b.scenes.push(preuve("p1"), preuve("p2"));
		rejet(b, 'une scene "revelation" est obligatoire');
	});

	it("ne compte pas une revelation masquee", () => {
		const b = bon();
		scene(b, "revelation").masquee = true;
		rejet(b, 'une scene "revelation" est obligatoire');
	});

	it("rejette un script dont la derniere scene n'est pas une fin", () => {
		const b = bon();
		b.scenes.reverse();
		rejet(b, 'la derniere scene non masquee doit etre de type "fin"');
	});

	it("rejette une fin masquee", () => {
		const b = bon();
		scene(b, "fin").masquee = true;
		rejet(b, 'la derniere scene non masquee doit etre de type "fin"');
	});

	it("accepte une scene masquee apres la fin", () => {
		const b = bon();
		b.scenes.push({ ...preuve("apres"), masquee: true });
		const s = valide(b);
		expect(s.scenes.at(-1)?.masquee).toBe(true);
	});

	it("rejette moins de 8 et plus de 14 scenes", () => {
		const peu = bon();
		peu.scenes = peu.scenes.slice(-7);
		rejet(peu, "de 8 a 14 scenes");
		const trop = bon();
		trop.scenes = [...trop.scenes, preuve("a"), preuve("b"), preuve("c")];
		rejet(trop, "de 8 a 14 scenes");
		rejet({ ...bon(), scenes: "x" }, "de 8 a 14 scenes");
	});

	it("rejette un script de plus de 24 Ko apres nettoyage", () => {
		const technique = [
			"id",
			"type",
			"capture",
			"transition",
			"version",
			"primaire",
			"logo",
			"typo",
			"mode",
			"musique",
			"repo",
			"lien",
			"source",
			"format",
			"url",
			"vitesse",
		];
		const emoji = (v: unknown, cle = ""): unknown => {
			if (typeof v === "string") return technique.includes(cle) ? v : "\u{1F600}".repeat(300);
			if (Array.isArray(v)) return v.map((x) => emoji(x, cle));
			if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, emoji(x, k)]));
			return v;
		};
		const b = emoji(bon()) as Brut;
		b.voix.prononciation = Object.fromEntries(
			Array.from({ length: 20 }, (_, i) => [`${"\u{1F600}".repeat(39)}${i}`, "\u{1F600}".repeat(40)]),
		);
		const r = nettoyerScriptPub(b);
		expect(r.erreurs).toEqual(["Script : plus de 24 Ko apres nettoyage, raccourcis les textes"]);
	});

	it("rejette les champs obligatoires du projet et de la marque", () => {
		const sans = (chemin: (b: Brut) => void) => {
			const b = bon();
			chemin(b);
			return b;
		};
		rejet(
			sans((b) => delete b.titre),
			'champ "titre" obligatoire',
		);
		rejet(
			sans((b) => (b.projet.nom = "  ")),
			'champ "projet.nom" obligatoire',
		);
		rejet(
			sans((b) => (b.projet.repo = "../etc")),
			'champ "projet.repo" invalide',
		);
		rejet(
			sans((b) => (b.projet.repo = "a".repeat(101))),
			'champ "projet.repo" invalide',
		);
		rejet(
			sans((b) => delete b.marque.primaire),
			'champ "marque.primaire" obligatoire',
		);
		rejet(
			sans((b) => (b.marque.primaire = "rouge")),
			'champ "marque.primaire" obligatoire',
		);
		rejet(
			sans((b) => (b.marque.primaire = "#fff")),
			'champ "marque.primaire" obligatoire',
		);
	});

	it.each([
		"http://tablee.example",
		"javascript:alert(1)",
		"tablee.example",
		"https://u:p@tablee.example",
		`https://t.example/${"a".repeat(120)}`,
		"https://a b.example",
	])("rejette le lien %s", (lien) => {
		const b = bon();
		b.projet.lien = lien;
		rejet(b, 'champ "projet.lien" invalide');
	});

	it("rejette un type de scene inconnu, un id invalide ou en double", () => {
		const inconnu = bon();
		inconnu.scenes[1] = { id: "x", type: "script", voix: "" };
		rejet(inconnu, "type de scene inconnu");
		const invalide = bon();
		invalide.scenes[1].id = "Mauvais Id";
		rejet(invalide, "identifiant invalide");
		const double = bon();
		double.scenes[1].id = double.scenes[0].id;
		rejet(double, 'identifiant "ouverture" en double');
		const long = bon();
		long.scenes[1].id = "a".repeat(25);
		rejet(long, "identifiant invalide");
	});

	it("rejette une scene sans ses champs obligatoires ou avec trop peu d'elements", () => {
		const b = bon();
		delete scene(b, "ouverture").moment;
		rejet(b, 'champ "moment" obligatoire');
		const c = bon();
		scene(c, "chorus").bulles = ["a", "b"];
		rejet(c, '"bulles" demande au moins 3 elements');
		const d = bon();
		scene(d, "repetition").lignes = [{ texte: "Une seule" }];
		rejet(d, '"lignes" demande au moins 2 elements');
		const e = bon();
		scene(e, "etape-reserver").visuel = { type: "video" };
		rejet(e, 'champ "visuel" obligatoire');
		const f = bon();
		scene(f, "fin").liens = [];
		rejet(f, '"liens" demande au moins 1 element');
	});

	it("rejette une capture mal formee", () => {
		const b = bon();
		b.captures[0].url = "http://tablee.example";
		rejet(b, 'une capture "site" demande une URL https');
		const c = bon();
		c.captures[1].id = c.captures[0].id;
		rejet(c, "en double");
		const d = bon();
		d.captures[0].id = "ID!";
		rejet(d, "identifiant invalide");
	});

	it("explique tous les problemes d'un coup", () => {
		const b = bon();
		delete b.titre;
		b.projet.repo = "";
		expect(nettoyerScriptPub(b).erreurs).toHaveLength(2);
	});
});

describe("avertissements (api-contract.md 2.1)", () => {
	it("masque les etapes au-dela de la quatrieme", () => {
		const b = bon();
		const etape = scene(b, "etape-servir");
		const cinq = [1, 2].map((i) => ({ ...structuredClone(etape), id: `etape-${i + 3}` }));
		b.scenes.splice(9, 0, ...cinq);
		const r = avertit(b, 'Scene "etape-5" : au-dela de 4 etapes');
		const masquees = (r.script?.scenes ?? []).filter((s: ScenePub) => s.masquee).map((s: ScenePub) => s.id);
		expect(masquees).toEqual(["etape-5"]);
		expect(r.script?.scenes.filter((s) => s.type === "etape" && !s.masquee)).toHaveLength(4);
	});

	it("passe en liste vide une scene qui reference une capture absente", () => {
		const b = bon();
		scene(b, "etape-reserver").visuel = { type: "capture", capture: "fantome" };
		const r = avertit(b, 'la capture "fantome" n\'existe pas');
		const s = r.script?.scenes.find((x) => x.id === "etape-reserver");
		expect(s?.type === "etape" && s.visuel).toEqual({ type: "liste", titre: "", elements: [] });
	});

	it("garde une capture existante avec son cadrage et son focus", () => {
		const s = valide(bon()).scenes.find((x) => x.id === "etape-servir");
		expect(s?.type === "etape" && s.visuel).toMatchObject({ type: "capture", capture: "salle", cadrage: "milieu" });
	});

	it.each([
		["trop courte", (s: Brut) => (s.voix = "Un."), "Voix totale de"],
		["trop longue", (s: Brut) => (s.voix += " mot".repeat(20)), "Voix totale de"],
	])("signale une voix %s", (_nom, modifie, message) => {
		const b = bon();
		for (const s of b.scenes) modifie(s);
		const r = nettoyerScriptPub(b);
		expect(r.avertissements.some((a) => a.includes(message) && a.includes("vise 120 a 170 mots"))).toBe(true);
	});

	it("n'avertit pas pour 120 et 170 mots pile", () => {
		for (const total of [120, 170]) {
			const b = bon();
			b.scenes.forEach((s: Brut, i: number) => {
				const mots = Math.floor(total / 12) + (i < total % 12 ? 1 : 0);
				s.voix = Array.from({ length: mots }, () => "mot").join(" ");
			});
			expect(nettoyerScriptPub(b).avertissements.some((a) => a.startsWith("Voix totale"))).toBe(false);
		}
	});

	it("ne compte pas la voix des scenes masquees", () => {
		const b = bon();
		b.scenes.push({ ...preuve("cachee"), masquee: true });
		const r = nettoyerScriptPub(b);
		expect(r.avertissements).toEqual([]);
	});

	it("signale une duree estimee sous 50 s", () => {
		const r = avertit(copie(), "Duree totale estimee de 39 s : vise 50 a 65 s");
		expect(r.avertissements).toHaveLength(2);
	});

	it("signale une duree estimee au-dela de 65 s", () => {
		const b = bon();
		b.scenes.splice(-1, 0, preuve("p1"), preuve("p2"));
		for (const s of b.scenes) s.voix = "mot ".repeat(40).trim();
		avertit(b, "vise 50 a 65 s");
	});

	it.each([
		["accent grave", "Lancez `ls` ici"],
		["signe dollar", "Un abonnement a 5 $ par mois"],
		["npm", "Faites npm install"],
		["git", "Un git pull de plus"],
		["commit", "Chaque Commit compte"],
		["const", "const x = 1"],
		["function", "une function utile"],
	])("avertit quand le texte ressemble a du code : %s", (_nom, texte) => {
		const b = bon();
		scene(b, "rupture").texte = { texte };
		avertit(b, 'Scene "rupture" : la pub ne montre pas de code');
	});

	it("avertit aussi quand le code est dans la voix ou une carte", () => {
		const b = bon();
		scene(b, "ouverture").voix = "Tapez npm start";
		scene(b, "boucle").carte.detail = "git push";
		const r = nettoyerScriptPub(b);
		expect(r.avertissements.filter((a) => a.includes("ne montre pas de code"))).toHaveLength(2);
	});

	it("ne confond pas avec des mots proches ni avec les identifiants", () => {
		const b = bon();
		scene(b, "rupture").texte = { texte: "GitHub, constants et fonctions" };
		scene(b, "boucle").id = "git-flow";
		const r = nettoyerScriptPub(b);
		expect(r.avertissements.some((a) => a.includes("code"))).toBe(false);
	});

	it("ignore une couleur optionnelle invalide avec un avertissement", () => {
		const b = bon();
		b.marque.accent = "bleu";
		b.marque.alerte = "#12";
		const r = avertit(b, '"marque.accent" n\'est pas une couleur');
		expect(r.script?.marque).not.toHaveProperty("accent");
		expect(r.script?.marque).not.toHaveProperty("alerte");
	});

	it("retire un accent qui n'est pas dans le texte", () => {
		const b = bon();
		scene(b, "rupture").texte = { texte: "Et si tout changeait ?", accent: "autre chose" };
		const r = avertit(b, "l'accent de \"texte\" n'est pas contenu dans le texte");
		const s = r.script?.scenes.find((x) => x.id === "rupture");
		expect(s?.type === "rupture" && s.texte).toEqual({ texte: "Et si tout changeait ?" });
	});

	it("ignore les captures au-dela de 6", () => {
		const b = bon();
		b.captures = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, source: "importee", format: "bureau" }));
		const r = avertit(b, "6 au maximum");
		expect(r.script?.captures).toHaveLength(6);
	});
});

describe("nettoyage des textes", () => {
	it("remplace les tirets longs et moyens par une virgule", () => {
		const b = bon();
		b.titre = "Pub \u2014 Tablee \u2013 v1";
		scene(b, "ouverture").voix = "Samedi\u2014plein service";
		const s = valide(b);
		expect(s.titre).toBe("Pub, Tablee, v1");
		expect(s.scenes[0].voix).toBe("Samedi, plein service");
		expect(JSON.stringify(s)).not.toMatch(/[\u2013\u2014]/);
	});

	it("retire les caracteres de controle et normalise les espaces", () => {
		const b = bon();
		b.titre = "  Pub\u0000 \u202e Tablee\n\tpropre\u200b  ";
		expect(valide(b).titre).toBe("Pub Tablee propre");
	});

	it("tronque sans couper un mot", () => {
		const b = bon();
		scene(b, "ouverture").moment = "Samedi soir complet";
		scene(b, "ouverture").detail = "x".repeat(50);
		b.titre = `${"mot ".repeat(30)}fin`;
		const s = valide(b);
		const o = s.scenes[0];
		expect(o.type === "ouverture" && o.moment).toBe("Samedi soir");
		expect(o.type === "ouverture" && o.detail).toBe("x".repeat(30));
		expect(s.titre.length).toBeLessThanOrEqual(80);
		expect(s.titre.endsWith("mot")).toBe(true);
	});

	it("respecte les limites de chaque champ", () => {
		const b = bon();
		const long = "abc ".repeat(200);
		b.reponses = { pourQui: long, probleme: long, promesse: long };
		scene(b, "ouverture").voix = long;
		const s = valide(b);
		expect(s.reponses.pourQui.length).toBeLessThanOrEqual(300);
		expect(s.scenes[0].voix.length).toBeLessThanOrEqual(220);
	});

	it("borne la vitesse, les durees et la prononciation", () => {
		const b = bon();
		b.voix = { mode: "importee", vitesse: 9, prononciation: {} };
		for (let i = 0; i < 30; i++) b.voix.prononciation[`mot${i}`] = "v".repeat(60);
		b.voix.prononciation.__proto__x = "";
		Object.defineProperty(b.voix.prononciation, "__proto__", { value: "x", enumerable: true });
		scene(b, "ouverture").duree = 99;
		scene(b, "rupture").duree = -1;
		scene(b, "fin").duree = "long";
		const s = valide(b);
		expect(s.voix.vitesse).toBe(1.2);
		expect(Object.keys(s.voix.prononciation).length).toBeLessThanOrEqual(20);
		expect(Object.values(s.voix.prononciation).every((v) => v.length <= 40)).toBe(true);
		expect(Object.getPrototypeOf(s.voix.prononciation)).toBe(Object.prototype);
		expect(s.scenes[0].duree).toBe(3.5);
		expect(s.scenes.find((x) => x.id === "rupture")?.duree).toBe(2.5);
		expect(s.scenes.at(-1)).not.toHaveProperty("duree");
		b.voix.vitesse = 0.1;
		expect(valide(b).voix.vitesse).toBe(0.85);
	});

	it("borne les tableaux trop longs et ecarte les elements vides", () => {
		const b = bon();
		scene(b, "chorus").bulles = ["a", "", "b", "c", "d", "e", "f", "g", "h"];
		scene(b, "repetition").lignes = Array.from({ length: 5 }, (_, i) => ({ texte: `Ligne ${i}` }));
		const s = valide(b);
		const chorus = s.scenes.find((x) => x.type === "chorus");
		const rep = s.scenes.find((x) => x.type === "repetition");
		expect(chorus?.type === "chorus" && chorus.bulles).toEqual(["a", "b", "c", "d", "e", "f"]);
		expect(rep?.type === "repetition" && rep.lignes).toHaveLength(3);
	});

	it("borne le cadrage et le focus a l'image", () => {
		const b = bon();
		scene(b, "etape-servir").visuel.focus = { x: 0.9, y: -3, largeur: 5, hauteur: 0.2 };
		scene(b, "etape-servir").visuel.cadrage = { x: "a" };
		const v = valide(b).scenes.find((x) => x.id === "etape-servir");
		const visuel = v?.type === "etape" ? v.visuel : null;
		expect(visuel).toMatchObject({ focus: { x: 0.9, y: 0, hauteur: 0.2 } });
		expect(visuel && "cadrage" in visuel).toBe(false);
		expect(visuel?.type === "capture" && visuel.focus && visuel.focus.x + visuel.focus.largeur).toBeCloseTo(1);
	});
});

describe("gestes et but", () => {
	it("garde 2 ou 3 gestes connus, sans doublon", () => {
		const b = bon();
		b.gestes = ["accent", "impact", "accent", "rayons"];
		const r = nettoyerScriptPub(b);
		expect(r.script?.gestes).toEqual(["accent", "impact", "rayons"]);
		expect(r.avertissements.join("\n")).toContain("en double");
	});

	it("laisse le champ absent sans avertissement", () => {
		const r = nettoyerScriptPub(bon());
		expect(r.script).not.toHaveProperty("gestes");
		expect(r.avertissements).toEqual([]);
	});

	it("retire les identifiants inconnus, tronque au-dela de 3 et ignore moins de 2", () => {
		const b = bon();
		b.gestes = ["accent", "confettis", "impact", "lettres", "rayons"];
		const r = avertit(b, "inconnus");
		expect(r.script?.gestes).toEqual(["accent", "impact", "lettres"]);
		expect(r.avertissements.join("\n")).toContain("seuls les 3 premiers");

		b.gestes = ["accent"];
		expect(avertit(b, "le champ est ignore").script).not.toHaveProperty("gestes");
		b.gestes = "accent";
		expect(avertit(b, "le champ est ignore").script).not.toHaveProperty("gestes");
	});

	it("avertit quand une transition choisie ne fait pas partie des gestes", () => {
		const b = bon();
		b.gestes = ["accent", "impact"];
		scene(b, "fin").transition = "pixels";
		scene(b, "etape-reserver").transition = "coupe";
		const r = avertit(b, `la transition "pixels" ne fait pas partie des gestes`);
		expect(r.avertissements.filter((a) => a.includes("transition"))).toHaveLength(1);
		scene(b, "fin").transition = "flou";
		b.gestes = ["accent", "flou"];
		expect(nettoyerScriptPub(b).avertissements).toEqual([]);
	});

	it("garde le but d'une scene et ignore une valeur inconnue", () => {
		const b = bon();
		scene(b, "fin").but = "montrer";
		scene(b, "rupture").but = "danser";
		const r = avertit(b, `"but" doit valoir lire, comprendre, montrer`);
		const scenes = r.script?.scenes as ScenePub[];
		expect(scenes.find((s) => s.id === "fin")?.but).toBe("montrer");
		expect(scenes.find((s) => s.id === "rupture")).not.toHaveProperty("but");
	});
});

describe("trame", () => {
	it("garde une trame connue et laisse le champ absent sans avertissement", () => {
		const b = bon();
		expect(nettoyerScriptPub(b).script).not.toHaveProperty("trame");
		b.trame = "vision-manifeste";
		const r = nettoyerScriptPub(b);
		expect(r.erreurs).toEqual([]);
		expect(r.script?.trame).toBe("vision-manifeste");
		expect(r.avertissements).toEqual([]);
	});

	it("ignore une trame inconnue avec un avertissement", () => {
		const b = bon();
		b.trame = "Stepwize";
		const r = avertit(b, `"trame" doit valoir`);
		expect(r.script).not.toHaveProperty("trame");
	});
});

const remplace = (b: Brut, id: string, nouvelle: Brut) => {
	b.scenes[b.scenes.findIndex((s: Brut) => s.id === id)] = nouvelle;
};
const transformation = (id = "transformation"): Brut => ({
	id,
	type: "transformation",
	titre: { texte: "Une semaine devient un post.", accent: "un post." },
	entree: { icone: "calendrier", libelle: "Une semaine entière" },
	operateur: "Claude",
	sortie: { icone: "message", libelle: "Un post prêt" },
	voix: "Votre semaine entre d'un côté. Un post ressort de l'autre.",
});
const flux = (id = "flux"): Brut => ({
	id,
	type: "flux",
	titre: { texte: "Trois gestes seulement.", accent: "seulement." },
	noeuds: [
		{ icone: "personne", libelle: "Vous demandez" },
		{ icone: "engrenage", libelle: "On s'en charge", detail: "à votre place" },
		{ icone: "coche", libelle: "Vous recevez" },
	],
	voix: "Vous demandez, on s'en charge, vous recevez.",
});
const avantapres = (id = "avantapres"): Brut => ({
	id,
	type: "avantapres",
	titre: { texte: "Hier, puis demain.", accent: "puis demain." },
	paires: [
		{ avant: "Posts à écrire", apres: "Post prêt" },
		{ avant: "Vidéo à monter", apres: "Pub prête" },
	],
	voix: "Hier, tout restait à faire. Demain, tout est prêt.",
});

describe("scenes d'explication en motion design", () => {
	it("accepte transformation, flux et avantapres sans erreur ni avertissement de format", () => {
		const b = bon();
		remplace(b, "etape-confirmer", transformation());
		remplace(b, "resultat", flux());
		b.scenes.splice(-2, 0, avantapres());
		const r = nettoyerScriptPub(b);
		expect(r.erreurs).toEqual([]);
		expect(r.avertissements.filter((a) => !/Voix totale|Duree totale/.test(a))).toEqual([]);
		const types = (r.script?.scenes as ScenePub[]).map((s) => s.type);
		expect(types).toEqual(expect.arrayContaining(["transformation", "flux", "avantapres"]));
		expect(r.script?.scenes.find((s) => s.id === "transformation")).toMatchObject({
			entree: { icone: "calendrier", libelle: "Une semaine entière" },
			operateur: "Claude",
		});
	});

	it("remplace une icone inconnue par l'icone par defaut, avec un avertissement", () => {
		const b = bon();
		const t = transformation();
		t.entree.icone = "licorne";
		remplace(b, "etape-confirmer", t);
		const r = avertit(b, `l'icone de "entree" est inconnue, "etoile" est utilisee`);
		expect((r.script?.scenes.find((s) => s.id === "transformation") as any).entree.icone).toBe("etoile");
	});

	it("borne les textes, les noeuds et les paires", () => {
		const b = bon();
		const t = transformation();
		t.entree.libelle = "Un libellé beaucoup trop long pour tenir";
		t.operateur = "Un operateur bien trop long";
		remplace(b, "etape-confirmer", t);
		const f = flux();
		f.noeuds.push({ icone: "etoile", libelle: "Quatrième" });
		remplace(b, "resultat", f);
		const a = avantapres();
		a.paires.push({ avant: "Un", apres: "Deux" }, { avant: "Trois", apres: "Quatre" }, { avant: "Cinq", apres: "Six" });
		a.avant = "Un etiquette beaucoup trop longue";
		b.scenes.splice(-2, 0, a);
		const s = valide(b);
		const par = (id: string) => s.scenes.find((x) => x.id === id) as any;
		expect(Array.from(par("transformation").entree.libelle).length).toBeLessThanOrEqual(20);
		expect(Array.from(par("transformation").operateur).length).toBeLessThanOrEqual(14);
		expect(par("flux").noeuds).toHaveLength(3);
		expect(par("avantapres").paires).toHaveLength(3);
		expect(Array.from(par("avantapres").avant).length).toBeLessThanOrEqual(12);
	});

	it("rejette les champs obligatoires manquants", () => {
		const t = transformation();
		delete t.sortie.libelle;
		const b = bon();
		remplace(b, "etape-confirmer", t);
		rejet(b, "sortie.libelle");
		const c = bon();
		remplace(c, "etape-confirmer", { ...flux(), noeuds: flux().noeuds.slice(0, 2) });
		rejet(c, `"noeuds" demande 3 elements`);
		const d = bon();
		remplace(d, "etape-confirmer", { ...avantapres(), paires: [{ avant: "Seul", apres: "" }, { avant: "Un", apres: "Deux" }] });
		rejet(d, `"paires" demande au moins 2 elements`);
		const e = bon();
		const sansOperateur = transformation();
		delete sansOperateur.operateur;
		remplace(e, "etape-confirmer", sansOperateur);
		rejet(e, `"operateur"`);
	});

	it("les trois types sont dans le schema de sortie structuree", () => {
		const json = JSON.stringify(SCHEMA_SCRIPT_PUB);
		for (const t of ["transformation", "flux", "avantapres"]) expect(json).toContain(`"enum":["${t}"]`);
		expect(json).not.toContain('"licorne"');
		expect(json).toContain('"calendrier"');
	});

	it("leur but par defaut est comprendre et ils ne comptent pas comme des etapes", () => {
		const b = bon();
		remplace(b, "etape-confirmer", transformation());
		const tl = calculerTimeline(valide(b));
		expect(tl.scenes.filter((s) => s.etape)).toHaveLength(2);
		expect(BUT_DEFAUT.transformation).toBe("comprendre");
		expect(BUT_DEFAUT.flux).toBe("comprendre");
		expect(BUT_DEFAUT.avantapres).toBe("comprendre");
	});
});

describe("captures rares et breves", () => {
	const capture = (id: string, capt: string): Brut => ({
		id,
		type: "etape",
		onglet: "Vue",
		filigrane: "VUE",
		titre: { texte: "Un coup d'œil.", accent: "d'œil." },
		visuel: { type: "capture", capture: capt, cadrage: "haut" },
		voix: "Un simple coup d'œil.",
	});

	it("pose le but montrer et plafonne la duree d'une capture a 2,5 s", () => {
		const b = bon();
		scene(b, "etape-reserver").duree = 6;
		scene(b, "etape-servir").but = "lire";
		const r = avertit(b, `une capture est un but "montrer", "lire" est remplace`);
		const s = r.script as ScriptPub;
		const e = s.scenes.filter((x) => x.type === "etape" && x.visuel.type === "capture");
		expect(e.map((x) => x.but)).toEqual(["montrer", "montrer"]);
		expect(e[0].duree).toBe(2.5);
		expect(e.every((x) => dureeScene(x, s) <= 2.5)).toBe(true);
	});

	it("passe la troisieme capture en liste vide et conseille une explication", () => {
		const b = bon();
		b.scenes.splice(9, 0, capture("etape-extra", "accueil"));
		const r = avertit(b, "2 captures au maximum par pub");
		expect(r.avertissements.join("\n")).toContain("transformation, flux, avantapres");
		const extra = r.script?.scenes.find((x) => x.id === "etape-extra") as any;
		expect(extra.visuel).toEqual({ type: "liste", titre: "", elements: [] });
	});

	it("ne compte pas une capture masquee, ni une etape en liste", () => {
		const b = bon();
		const extra = capture("etape-extra", "accueil");
		extra.masquee = true;
		b.scenes.splice(9, 0, extra);
		const r = nettoyerScriptPub(b);
		expect(r.avertissements.join("\n")).not.toContain("captures au maximum");
	});

	it("signale une voix trop longue pour 2,5 s", () => {
		const b = bon();
		scene(b, "etape-reserver").voix = "Vos clients réservent en ligne depuis leur téléphone.";
		avertit(b, "sa voix tient en 5 mots (elle en compte 8)");
	});

	it("une capture est facultative : un script sans capture est valide", () => {
		const b = bon();
		b.captures = [];
		remplace(b, "etape-reserver", transformation());
		remplace(b, "etape-servir", flux());
		const r = nettoyerScriptPub(b);
		expect(r.erreurs).toEqual([]);
		expect(r.avertissements.filter((a) => /capture/i.test(a))).toEqual([]);
	});
});

describe("anti-repetition des arguments", () => {
	const ajoute = (b: Brut, ids: string[], phrase: string) => {
		for (const id of ids) scene(b, id).voix += ` ${phrase}`;
	};

	it("avertit quand la gratuite est dite dans deux scenes, voix et visuels confondus", () => {
		const b = bon();
		ajoute(b, ["rupture"], "C'est gratuit.");
		scene(b, "appel").badge = { texte: "Gratuit pour tous", accent: "pour tous" };
		const r = nettoyerScriptPub(b);
		expect(r.avertissements.join("\n")).toContain(`l'argument "gratuite" revient dans 2 scenes (rupture, appel)`);
		expect(r.avertissements.join("\n")).toContain("Chaque argument ne se dit qu'une fois");
	});

	it("n'avertit pas quand l'argument est dit une seule fois, dans la voix et l'ecran de la meme scene", () => {
		const b = bon();
		ajoute(b, ["etape-confirmer"], "Vos données sont chiffrées.");
		scene(b, "etape-confirmer").texte = "Tout est chiffré, de bout en bout.";
		expect(nettoyerScriptPub(b).avertissements).toEqual([]);
	});

	it("reconnait la securite, la rapidite, la simplicite, le code ouvert, l'absence de compte et le controle", () => {
		const cas: [string, string][] = [
			["securite des donnees", "Vos données sont chiffrées."],
			["rapidite", "C'est prêt en cinq secondes."],
			["simplicite", "Tout est très simple."],
			["code ouvert", "Le projet est open source."],
			["absence d'inscription", "Sans inscription."],
			["controle de l'utilisateur", "Rien ne part sans toi."],
		];
		for (const [nom, phrase] of cas) {
			const b = bon();
			ajoute(b, ["rupture", "appel"], phrase);
			expect(nettoyerScriptPub(b).avertissements.join("\n"), nom).toContain(`l'argument "${nom}" revient dans 2 scenes`);
		}
	});

	it("avertit quand un meme mot significatif revient dans trois scenes, pas deux", () => {
		const b = bon();
		ajoute(b, ["rupture", "resultat"], "Un cadeau turquoise.");
		expect(nettoyerScriptPub(b).avertissements).toEqual([]);
		ajoute(b, ["appel"], "Un autre cadeau turquoise.");
		const r = nettoyerScriptPub(b);
		expect(r.avertissements.join("\n")).toContain('le mot "turquoise" revient dans 3 scenes (rupture, resultat, appel)');
	});

	it("reconnait le pluriel et le feminin comme le meme mot", () => {
		const b = bon();
		ajoute(b, ["rupture"], "Une belle ardoise.");
		ajoute(b, ["resultat"], "Des ardoises partout.");
		ajoute(b, ["appel"], "Votre ardoise.");
		expect(nettoyerScriptPub(b).avertissements.join("\n")).toContain('le mot "ardoise" revient dans 3 scenes');
	});

	it("ignore les mots outils, les mots courts et le nom du projet", () => {
		const b = bon();
		ajoute(b, ["rupture", "resultat", "appel"], "Avec vous, pour tout, chaque fois. Tablée aussi.");
		expect(nettoyerScriptPub(b).avertissements.filter((a) => a.startsWith("Repetition"))).toEqual([]);
	});

	it("exclut les scenes de tension, qui repetent par construction", () => {
		const b = bon();
		ajoute(b, ["repetition", "boucle", "chorus", "rupture"], "Un cadeau turquoise chiffré.");
		expect(nettoyerScriptPub(b).avertissements).toEqual([]);
	});

	it("laisse la fin reprendre le slogan, mais pas un argument nouveau repete", () => {
		const b = bon();
		scene(b, "revelation").slogan = { texte: "Open source pour tous, toujours.", accent: "toujours." };
		scene(b, "fin").slogan = "Open source pour tous, toujours.";
		scene(b, "fin").voix = "Tablée. Open source pour tous, toujours.";
		expect(nettoyerScriptPub(b).avertissements).toEqual([]);
		scene(b, "fin").voix = "Tablée. Open source pour tous, toujours. Et son code ouvert.";
		expect(nettoyerScriptPub(b).avertissements.join("\n")).toContain(`l'argument "code ouvert" revient dans 2 scenes (revelation, fin)`);
	});

	it("ne compte pas les scenes masquees", () => {
		const b = bon();
		ajoute(b, ["rupture", "resultat"], "Vos données sont chiffrées.");
		scene(b, "resultat").masquee = true;
		expect(nettoyerScriptPub(b).avertissements.join("\n")).not.toContain("securite des donnees");
	});
});
