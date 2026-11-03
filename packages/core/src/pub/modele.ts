import { ACCENT_GRIS_DEFAUT, COULEUR_HEX, LIMITES_PUB, REGEX_ID } from "./limites";
import type { CaptureRef, Geste, Hex, Icone, MotsAccent, ScenePub, ScriptPub, Trame } from "./types";

// Ce que le studio connait sans IA : le repo, ses 3 reponses, sa marque et ses captures.
// `repo` doit suivre NOM_REPO et `lien` etre une URL https (valides cote appelant).
export type EntreeScriptPub = {
	nom: string;
	repo: string;
	lien: string;
	reponses: ScriptPub["reponses"];
	slogan?: string;
	marque?: { primaire?: string; accent?: string; alerte?: string };
	captures?: readonly CaptureRef[];
	trame?: Trame; // force la trame, sinon choisirTrame
	graine?: number; // aleas deterministes (entier), sinon derivee du nom du repo : voir graineDepuisRepo
};

// Graine deterministe derivee du nom du repo (FNV-1a, 32 bits) : memes reponses et memes repos redonnent la meme pub,
// deux repos differents varient l'accroche, les scenes d'explication, les icones et les gestes (design.md 8.18)
export function graineDepuisRepo(repo: string): number {
	let h = 0x811c9dc5;
	for (const c of repo.toLowerCase()) h = Math.imul(h ^ (c.codePointAt(0) ?? 0), 0x01000193);
	return h >>> 0;
}

// Choix stable dans une liste : `sel` distingue les decisions entre elles pour qu'elles ne soient pas toutes liees
function choisir<T>(graine: number, sel: number, liste: readonly T[]): T {
	let h = Math.imul(graine ^ Math.imul(sel + 1, 0x9e3779b1), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return liste[(h >>> 0) % liste.length];
}

const JEUX_GESTES: readonly (readonly Geste[])[] = [
	["accent", "soulignement", "flou"], // sobre
	["impact", "glitch", "lettres"], // nerveux
	["surlignage", "frappe", "rayons"], // editorial
];
const EXPLICATIONS = ["transformation", "flux", "avantapres"] as const;

const CONTROLES = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g;
// Tirets moyen et long, construits par leur code pour ne jamais les ecrire dans le source
const TIRETS = new RegExp(`\\s*[${String.fromCharCode(0x2013, 0x2014)}]\\s*`, "g");
const propre = (s: unknown) =>
	typeof s === "string"
		? s
				.replace(/\s/g, " ")
				.replace(CONTROLES, "")
				.replace(TIRETS, ", ")
				.replace(/\s+/g, " ")
				.replace(/^[,\s]+/, "")
				.trim()
		: "";
const longueur = (s: string) => Array.from(s).length;
const mots = (s: string) => s.split(" ").filter(Boolean);
const tient = (s: string, max: number) => (s && longueur(s) <= max ? s : undefined);
const tientEnMots = (s: string, n: number) => (s && mots(s).length <= n ? s : undefined);
const majuscule = (s: string) => s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1);
// "Les restaurateurs" devient "les restaurateurs", mais "PME" reste tel quel
const minuscule = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLocaleLowerCase("fr-FR") + s.slice(1) : s);
const phrase = (s: string) => (s ? majuscule(s) + (/[.!?]$/.test(s) ? "" : ".") : "");

// Premiers mots qui tiennent en `max` caracteres, comme la troncature de nettoyerScriptPub
function debut(s: string, max: number): string {
	if (longueur(s) <= max) return s;
	let r = "";
	for (const m of mots(s)) {
		const suite = r ? `${r} ${m}` : m;
		if (longueur(suite) > max) break;
		r = suite;
	}
	return (r || Array.from(s).slice(0, max).join("")).replace(/[\s,;:]+$/, "");
}

// Propositions d'une reponse, sans ponctuation : "Le telephone sonne, les tables restent vides." en donne deux
const morceaux = (s: string) =>
	s
		.split(/[.;:!?\u2026]+|,\s+/u)
		.map((x) => x.trim())
		.filter(Boolean);

// "Les restaurateurs qui prennent les reservations" donne "Les restaurateurs"
const cibleCourte = (s: string) => s.split(/\s(?:qui|que|dont|avec|pour)\s/i)[0].replace(/^pour\s+/i, "");

// Les `n` derniers mots portent l'accent : contenu dans le texte par construction
function accentue(texte: string, n: number): MotsAccent {
	const m = mots(texte);
	return m.length > n ? { texte, accent: m.slice(-n).join(" ") } : { texte };
}

// Assemble des phrases sans depasser la limite de voix d'une scene
const voix = (...phrases: (string | undefined)[]) =>
	phrases
		.filter((p): p is string => Boolean(p))
		.reduce((v, p) => {
			const suite = v ? `${v} ${p}` : p;
			return longueur(suite) <= LIMITES_PUB.voix ? suite : v;
		}, "");

const couleur = (v: unknown) => (typeof v === "string" && COULEUR_HEX.test(v) ? (v.toLowerCase() as Hex) : undefined);

function estHttps(url: string | undefined): boolean {
	if (!url || longueur(url) > 500 || url.includes(" ")) return false;
	try {
		const u = new URL(url);
		return u.protocol === "https:" && !u.username && !u.password;
	} catch {
		return false;
	}
}

// Seules les captures que nettoyerScriptPub accepte peuvent porter une etape
function capturesUtilisables(liste: readonly CaptureRef[]): CaptureRef[] {
	const vus = new Set<string>();
	return liste
		.filter((c) => {
			if (!REGEX_ID.test(c.id) || vus.has(c.id) || (c.source === "site" && !estHttps(c.url))) return false;
			vus.add(c.id);
			return true;
		})
		.slice(0, LIMITES_PUB.captures.max);
}

function lienAffiche(lien: string): string {
	try {
		const u = new URL(lien);
		return Array.from(`${u.hostname}${u.pathname}`.replace(/^www\./, "").replace(/\/$/, ""))
			.slice(0, 40)
			.join("");
	} catch {
		return Array.from(lien).slice(0, 40).join("");
	}
}

// Sans IA, on ne connait pas les etapes du produit, seulement ses ecrans. Une capture est un clin d'oeil bref (une seule
// ici, 2 au plus pour un auteur, design.md 8.17) : voix de 5 mots, jamais une explication.
function sceneCapture(capture: CaptureRef, cible: string): ScenePub {
	const legende = tient(propre(capture.legende), 14);
	const onglet = legende ?? "Écran";
	return {
		id: "etape-1",
		type: "etape",
		onglet,
		filigrane: tient(onglet.toLocaleUpperCase("fr-FR"), 14) ?? "ÉCRAN",
		titre: accentue("Tout est clair, d'un coup d'œil.", 3),
		texte: cible ? tient(`Pensé pour ${minuscule(cible)}.`, 110) : undefined,
		visuel: { type: "capture", capture: capture.id, cadrage: "haut" },
		but: "montrer",
		voix: "Tout est clair dès l'arrivée.",
	};
}

// Choix de la trame (design.md 8.13), sans IA, sur les reponses en minuscules sans accents. Premiere regle qui s'applique :
// 1. une conviction (croire, meriter, devoir, liberte, vie privee, open source...) dans le probleme ou la promesse : vision-manifeste ;
// 2. un probleme qui revient (toujours, encore, chaque, perd, retard, oubli...) ou aucune capture : probleme-qui-revient ;
// 3. sinon : demonstration-directe (portee par les scenes d'explication en motion design).
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const CONVICTION =
	/\b(croi[ts]|croyons|croire|conviction|merite|meritent|devrai(?:t|ent)|liberte|libre|vie privee|open source|independan|ethique|respect)/;
const RECURRENCE =
	/\b(toujours|encore|chaque|tous les|toutes les|sans cesse|revient|reviennent|repet|a nouveau|meme|sonne|perd|perdent|perdu|oubli|retard)/;

// La demonstration n'a pas de tension pour faire la duree : elle veut au moins une capture (un clin d'oeil bref) en plus
// des 3 scenes d'explication. Sans capture, le probleme qui revient tient la duree.
const CAPTURES_DEMONSTRATION = 1;

export function choisirTrame(reponses: ScriptPub["reponses"], nbCaptures: number): Trame {
	if (CONVICTION.test(sansAccents(`${reponses.probleme} ${reponses.promesse}`))) return "vision-manifeste";
	if (RECURRENCE.test(sansAccents(reponses.probleme)) || nbCaptures < CAPTURES_DEMONSTRATION) return "probleme-qui-revient";
	return "demonstration-directe";
}

// Retire les champs facultatifs vides, comme le JSON enregistre
const sansVides = (s: ScenePub): ScenePub =>
	Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as ScenePub;

// Script de depart sans IA : structure type de design.md 8.13, textes tires des 3 reponses.
// Un morceau de reponse n'est repris que s'il tient en entier, sinon une phrase generique le remplace.
// Jamais d'etape sans capture, jamais de preuve inventee : la scene preuve est livree masquee, a remplir.
export function scriptPubDepuisReponses(entree: EntreeScriptPub): ScriptPub {
	const nom = debut(propre(entree.nom), LIMITES_PUB.nom);
	const reponses = {
		pourQui: debut(propre(entree.reponses.pourQui), LIMITES_PUB.reponse),
		probleme: debut(propre(entree.reponses.probleme), LIMITES_PUB.reponse),
		promesse: debut(propre(entree.reponses.promesse), LIMITES_PUB.reponse),
	};
	const cible = tientEnMots(cibleCourte(morceaux(reponses.pourQui)[0] ?? ""), 6) ?? "";
	const [probleme1 = "", probleme2 = ""] = morceaux(reponses.probleme);
	const promesse1 = morceaux(reponses.promesse)[0] ?? "";
	// "Les reservations arrivent toutes seules et le service reste calme" donne sa premiere moitie
	const promesseCourte = promesse1.split(/\s(?:et|mais|donc)\s/i)[0];
	const slogan = phrase(
		tient(propre(entree.slogan).replace(/[.!]+$/, ""), 59) ??
			tient(promesse1, 59) ??
			tient(promesseCourte, 59) ??
			"Tout devient simple",
	);
	// Un nom tres long est lu en entier une seule fois (la revelation) : ailleurs la voix dit "le projet"
	const nomDit = mots(nom).length <= 5 ? nom : "le projet";
	const bouton = tient(`Découvrir ${nom}`, 30) ?? "Découvrir le projet";
	const lien = propre(entree.lien);
	const captures = capturesUtilisables(entree.captures ?? []);
	const graine = Number.isInteger(entree.graine) ? (entree.graine as number) >>> 0 : graineDepuisRepo(entree.repo);
	const etapes = captures.slice(0, 1).map((c) => sceneCapture(c, cible));

	const demande = entree.trame ?? choisirTrame(reponses, captures.length);
	const trame: Trame = demande === "demonstration-directe" && !captures.length ? "probleme-qui-revient" : demande;

	// Scenes d'explication en motion design, sans capture (design.md 8.17). Seule la premiere reprend le probleme de
	// l'utilisateur, les autres restent generiques : un meme mot ne revient pas dans plus de deux scenes (8.18).
	const operateur = tient(nom, 14) ?? "Le projet";
	const probleme24 = tient(majuscule(probleme1), 20);
	const explication = (type: (typeof EXPLICATIONS)[number], i: number): ScenePub => {
		const premiere = i === 0 && trame === "probleme-qui-revient";
		if (type === "transformation")
			return {
				id: "transformation",
				type,
				titre: accentue("Du besoin au résultat.", 2),
				entree: {
					icone: choisir<Icone>(graine, 1, ["document", "dossier", "courrier", "calendrier"]),
					libelle: (premiere && probleme24) || "Votre besoin",
				},
				operateur,
				sortie: { icone: choisir<Icone>(graine, 2, ["coche", "etoile", "coeur"]), libelle: "Un résultat concret" },
				voix: "Votre besoin entre d'un côté. De l'autre, un résultat concret ressort, prêt à servir dès maintenant.",
			};
		if (type === "flux")
			return {
				id: "flux",
				type,
				titre: accentue("Trois gestes, et c'est fait.", 3),
				noeuds: [
					{ icone: choisir<Icone>(graine, 3, ["message", "personne", "loupe"]), libelle: "Vous demandez" },
					{ icone: "engrenage", libelle: operateur, detail: "s'en charge" },
					{ icone: "coche", libelle: "Vous recevez" },
				],
				voix: "Vous demandez. Le projet s'en charge. Vous recevez ce qu'il fallait, et vous passez enfin à autre chose.",
			};
		return {
			id: "avantapres",
			type,
			titre: accentue("Avant, puis après.", 2),
			paires: [
				{ avant: (premiere && tient(majuscule(probleme1), 28)) || "Le même casse-tête", apres: "Une vraie solution" },
				{ avant: "Des heures perdues", apres: "Des heures retrouvées" },
			],
			voix: "Avant, le même casse-tête revient sans cesse, jour après jour. Après, une vraie solution prend enfin sa place.",
		};
	};
	const nbExplications = EXPLICATIONS.length;
	const decalage = choisir(graine, 7, [0, 1, 2]);
	const choisies = Array.from({ length: nbExplications }, (_, i) => EXPLICATIONS[(decalage + i) % EXPLICATIONS.length]);
	// Les captures s'intercalent entre les explications : un clin d'oeil bref, jamais une explication
	const parcours: ScenePub[] = choisies.flatMap((type, i) => [explication(type, i), ...(etapes[i] ? [etapes[i]] : [])]);


	const revelation = (suite: string): ScenePub => ({
		id: "revelation",
		type: "revelation",
		slogan: accentue(slogan, 2),
		voix: voix(`Voici ${nom}.`, slogan, suite),
	});
	// Le slogan (promesse) est deja dit par la revelation, et par la rupture dans la vision : le resultat ne le redit pas
	// (chaque argument une seule fois, design.md 8.18). Il porte le probleme (avant) et une phrase generique.
	const vision = trame === "vision-manifeste";
	const resultat: ScenePub = {
		id: "resultat",
		type: "resultat",
		titre: accentue(vision ? "Le changement se voit." : "C'est réglé, pour de bon.", 3),
		avant: tient(majuscule(probleme1), 24) ?? "Le même problème",
		tampon: "Réglé",
		apres: "L'esprit tranquille",
		chute: accentue("La prochaine fois, rien à refaire.", 3),
		voix: vision
			? "Le changement se voit dès le premier jour. Et il reste, semaine après semaine."
			: "Le problème est réglé, pour de bon. Vous passez enfin à autre chose, l'esprit léger.",
	};
	// Jamais de preuve inventee : livree masquee, a remplir par l'utilisateur
	const preuve: ScenePub = {
		id: "preuve",
		type: "preuve",
		masquee: true,
		surtitre: "Nos engagements",
		elements: ["À compléter"],
		voix: "",
	};
	const appel = (question: string, accentMots: number, voixAppel: string[]): ScenePub => ({
		id: "appel",
		type: "appel",
		question: accentue(question, accentMots),
		action: "Essayez.",
		bouton,
		voix: voix(question, ...voixAppel),
	});
	const fin: ScenePub = {
		id: "fin",
		type: "fin",
		slogan: tient(slogan, 40),
		bouton,
		liens: [lienAffiche(lien)],
		voix: voix(`${majuscule(nomDit)}.`, slogan, "Le lien est juste en dessous. À tout de suite."),
	};

	// Trame 1 : le probleme qui revient (tension longue, puis rupture et revelation)
	const problemeQuiRevient = (): (ScenePub | false)[] => [
		{
			id: "ouverture",
			type: "ouverture",
			moment: choisir(graine, 4, ["Chaque jour", "Cette semaine", "Comme hier"]),
			detail: tient(majuscule(cible), 30),
			voix: cible
				? `Pour ${minuscule(cible)}, chaque journée se ressemble.`
				: "Chaque matin, la même journée recommence.",
		},
		{
			id: "repetition",
			type: "repetition",
			lignes: [accentue("Même journée.", 1), accentue("Même problème.", 1)],
			impact: "ENCORE.",
			carte: { titre: tient(majuscule(probleme1), 30) ?? "Encore à refaire" },
			voix: voix(phrase(tientEnMots(probleme1, 9) ?? "Le même problème revient"), "Encore, et encore."),
		},
		{
			id: "boucle",
			type: "boucle",
			phrase: accentue("Jour après jour, le même problème revient.", 1),
			reperes: ["Lundi", "Mercredi", "Vendredi"],
			carte: { titre: tient(majuscule(probleme2), 30) ?? "Toujours en attente" },
			voix: "Jour après jour, le même problème revient. Et au fond, rien ne change vraiment.",
		},
		// Le chorus (facultatif, design.md 8.13) est ecrit par l'auteur, jamais par le script de depart : 3 scenes d'explication suffisent
		{
			id: "rupture",
			type: "rupture",
			texte: accentue("Et si tout changeait, pour de vrai ?", 4),
			voix: "Et si tout changeait, enfin, et pour de vrai ?",
		},
		revelation("Conçu pour vous, dès le premier jour."),
		...parcours,
		resultat,
		preuve,
		appel("Ce problème vous parle ?", 2, [
			`Essayez ${nomDit}, dès aujourd'hui.`,
			"Vous verrez la différence dès le premier essai.",
		]),
		fin,
	];

	// Trame 2 : la demonstration directe (un contraste avant/apres en accroche, puis le produit en action)
	const demonstrationDirecte = (): (ScenePub | false)[] => [
		{
			id: "ouverture",
			type: "ouverture",
			moment: choisir(graine, 5, ["Avant", "Hier encore", "Jusqu'ici"]),
			detail: tient(majuscule(probleme1), 30),
			voix: voix(
				`Avant, ${minuscule(tientEnMots(probleme1, 9) ?? "tout prenait du temps")}.`,
				"Voyons concrètement ce qui change, étape par étape.",
			),
		},
		revelation("Voici comment ça marche, pas à pas, de votre demande jusqu'à la livraison."),
		...parcours,
		resultat,
		preuve,
		appel("Prêt à voir la différence ?", 3, [
			`Essayez ${nomDit}.`,
			"Un premier pas suffit pour que tout change, et vous le sentirez très bientôt.",
		]),
		fin,
	];

	// Trame 3 : la vision ou manifeste (une conviction, la revelation qui l'incarne, puis la preuve par l'usage)
	const conviction =
		tient(`Notre conviction : ${minuscule(promesse1)}.`, 80) ??
		tient(`Notre conviction : ${minuscule(promesseCourte)}.`, 80) ??
		"Notre conviction : chacun mérite mieux.";
	const visionManifeste = (): (ScenePub | false)[] => [
		{
			id: "ouverture",
			type: "ouverture",
			moment: choisir(graine, 6, ["Notre idée", "Notre pari", "Un parti pris"]),
			detail: tient(majuscule(cible), 30),
			voix: cible ? `Une idée, pensée pour ${minuscule(cible)}.` : "Une idée, pensée pour vous.",
		},
		{
			id: "rupture",
			type: "rupture",
			texte: accentue(conviction, 3),
			voix: voix(
				`${conviction.replace(/^Notre conviction : /, "Nous croyons que ")}`,
				"Et nous l'avons construit pour ça, rien d'autre.",
			),
		},
		revelation("Né de cette conviction, utile dès le premier jour."),
		...parcours,
		preuve,
		resultat,
		appel("On commence ensemble ?", 2, [
			`Rejoignez ${nomDit}, dès aujourd'hui.`,
			"Vous verrez ce que cette idée change, concrètement, dans votre quotidien.",
		]),
		fin,
	];

	const scenes = { "probleme-qui-revient": problemeQuiRevient, "demonstration-directe": demonstrationDirecte, "vision-manifeste": visionManifeste }[trame]();

	const accent = couleur(entree.marque?.accent);
	const alerte = couleur(entree.marque?.alerte);
	return {
		version: 1,
		titre: debut(`Pub ${nom}`, LIMITES_PUB.titre),
		projet: { nom, repo: entree.repo, lien },
		reponses,
		marque: {
			primaire: couleur(entree.marque?.primaire) ?? ACCENT_GRIS_DEFAUT,
			...(accent ? { accent } : {}),
			...(alerte ? { alerte } : {}),
			logo: "monogramme",
			monogramme: Array.from(nom)[0]?.toLocaleUpperCase("fr-FR") ?? "",
			typo: "nette",
		},
		voix: { mode: "synthese", vitesse: LIMITES_PUB.vitesse.defaut, prononciation: {} },
		musique: "energique",
		trame,
		gestes: [...choisir(graine, 0, JEUX_GESTES)],
		captures,
		scenes: scenes.filter((s): s is ScenePub => s !== false).map(sansVides),
	};
}
