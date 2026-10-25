import { describe, expect, it } from "vitest";
import { EXEMPLE } from "./exemple.fixture";
import { nettoyerScriptPub } from "./nettoyer";
import type { ScenePub, ScriptPub } from "./types";

type Brut = Record<string, any>;
const copie = (): Brut => structuredClone(EXEMPLE) as Brut;
const scene = (b: Brut, id: string) => b.scenes.find((s: Brut) => s.id === id);

// Script de reference, voix allongee pour tenir dans 120 a 170 mots et 50 a 65 s
function bon(): Brut {
	const b = copie();
	for (const s of b.scenes) s.voix += " Tout est prevu ici.";
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
		const r = avertit(copie(), "Duree totale estimee de 43 s : vise 50 a 65 s");
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
