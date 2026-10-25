import { ACCENT_GRIS_DEFAUT, COULEUR_HEX, LIMITES_PUB, REGEX_ID } from "./limites";
import type { CaptureRef, Hex, MotsAccent, ScenePub, ScriptPub, Trame } from "./types";

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
};

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

// Parcours generique : sans IA, on ne connait pas les etapes du produit, seulement ses ecrans.
// Chaque voix reste sous le plafond de sa scene (duree maximale a 170 mots par minute, design.md 8.9)
const ETAPES = [
	{
		titre: "Vous arrivez, tout est clair.",
		accent: 3,
		voix: "Vous arrivez, et tout est clair dès le premier écran, sans la moindre explication.",
	},
	{
		titre: "L'essentiel, d'un coup d'œil.",
		accent: 3,
		voix: "L'essentiel tient sur un seul écran. Vous trouvez ce qu'il faut, sans rien chercher.",
	},
	{
		titre: "Chaque chose à sa place.",
		accent: 3,
		voix: "Chaque chose est à sa place, et vous avancez à votre rythme, sans effort.",
	},
	{
		titre: "Et c'est réglé.",
		accent: 2,
		voix: "Quelques instants plus tard, tout est réglé, et vous passez à la suite.",
	},
];

function scenesEtapes(captures: CaptureRef[], cible: string): ScenePub[] {
	// Une seule capture : deux etapes sur deux cadrages, pour garder un parcours de 2 a 4 etapes
	const plan =
		captures.length === 1
			? [
					{ capture: captures[0], cadrage: "haut" as const },
					{ capture: captures[0], cadrage: "bas" as const },
				]
			: captures
					.slice(0, LIMITES_PUB.etapes.max)
					.map((capture, i) => ({ capture, cadrage: i === 0 ? ("haut" as const) : ("milieu" as const) }));
	return plan.map(({ capture, cadrage }, i) => {
		const legende = tient(propre(capture.legende), 14);
		const onglet = legende ?? `Écran ${i + 1}`;
		const modele = ETAPES[i];
		return {
			id: `etape-${i + 1}`,
			type: "etape",
			onglet,
			filigrane: tient(onglet.toLocaleUpperCase("fr-FR"), 14) ?? `ÉCRAN ${i + 1}`,
			titre: accentue(modele.titre, modele.accent),
			texte: i === 0 && cible ? tient(`Pensé pour ${minuscule(cible)}.`, 110) : undefined,
			visuel: { type: "capture", capture: capture.id, cadrage },
			voix: modele.voix,
		};
	});
}

// Choix de la trame (design.md 8.13), sans IA, sur les reponses en minuscules sans accents. Premiere regle qui s'applique :
// 1. une conviction (croire, meriter, devoir, liberte, vie privee, open source...) dans le probleme ou la promesse : vision-manifeste ;
// 2. un probleme qui revient (toujours, encore, chaque, perd, retard, oubli...) ou moins de 4 captures : probleme-qui-revient ;
// 3. sinon : demonstration-directe.
// La demonstration n'a pas de tension pour faire la duree : elle exige 4 captures (4 etapes) pour tenir 50 s, et sans capture
// il n'y a rien a montrer (le script tomberait sous 8 scenes).
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const CONVICTION =
	/\b(croi[ts]|croyons|croire|conviction|merite|meritent|devrai(?:t|ent)|liberte|libre|vie privee|open source|independan|ethique|respect)/;
const RECURRENCE =
	/\b(toujours|encore|chaque|tous les|toutes les|sans cesse|revient|reviennent|repet|a nouveau|meme|sonne|perd|perdent|perdu|oubli|retard)/;

const CAPTURES_DEMONSTRATION = 4;

export function choisirTrame(
	reponses: ScriptPub["reponses"],
	nbCaptures: number,
): Trame {
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
	const bouton = tient(`Découvrir ${nom}`, 30) ?? "Découvrir le projet";
	const lien = propre(entree.lien);
	const captures = capturesUtilisables(entree.captures ?? []);
	const etapes = scenesEtapes(captures, cible);

	const demande = entree.trame ?? choisirTrame(reponses, captures.length);
	const trame: Trame = demande === "demonstration-directe" && !captures.length ? "probleme-qui-revient" : demande;

	const revelation = (suite: string): ScenePub => ({
		id: "revelation",
		type: "revelation",
		slogan: accentue(slogan, 2),
		voix: voix(`Voici ${nom}.`, slogan, suite),
	});
	const resultat: ScenePub = {
		id: "resultat",
		type: "resultat",
		titre: accentue(tient(phrase(promesse1), 50) ?? "Le problème est réglé.", 2),
		avant: tient(majuscule(probleme1), 24) ?? "Le même problème",
		tampon: "Réglé",
		apres: "L'esprit libre",
		chute: accentue("La prochaine fois, rien à refaire.", 3),
		voix: voix(
			`Le résultat : ${minuscule(tientEnMots(promesse1, 13) ?? "le problème est réglé")}.`,
			mots(promesse1).length <= 8 ? "Vous passez enfin à autre chose." : undefined,
		),
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
		voix: voix(`${nom}.`, slogan, "Le lien est juste en dessous. À tout de suite."),
	};

	// Trame 1 : le probleme qui revient (tension longue, puis rupture et revelation)
	const problemeQuiRevient = (): (ScenePub | false)[] => [
		{
			id: "ouverture",
			type: "ouverture",
			moment: "Chaque jour",
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
		// Facultative (design.md 8.13) : retiree avec 4 etapes pour rester sous 170 mots
		etapes.length < LIMITES_PUB.etapes.max && {
			id: "chorus",
			type: "chorus",
			titre: accentue("Tout le monde le sait.", 2),
			chute: accentue("Personne ne le règle.", 3),
			bulles: ["Encore ?", "Pas le temps.", "On verra demain.", "Comme d'habitude."],
			voix: "Tout le monde en parle, chaque semaine. Pourtant, personne ne le règle vraiment.",
		},
		{
			id: "rupture",
			type: "rupture",
			texte: accentue("Et si tout devenait simple, pour de vrai ?", 4),
			voix: "Et si tout devenait simple, enfin, et pour de vrai ?",
		},
		revelation("Conçu pour vous simplifier la vie, chaque jour."),
		...etapes,
		resultat,
		preuve,
		appel("Ce problème vous parle ?", 2, [
			`Essayez ${nom}, dès aujourd'hui.`,
			"C'est simple, et vous verrez la différence.",
		]),
		fin,
	];

	// Trame 2 : la demonstration directe (un contraste avant/apres en accroche, puis le produit en action)
	const demonstrationDirecte = (): (ScenePub | false)[] => [
		{
			id: "ouverture",
			type: "ouverture",
			moment: "Avant",
			detail: tient(majuscule(probleme1), 30),
			voix: voix(
				`Avant, ${minuscule(tientEnMots(probleme1, 9) ?? "tout prenait du temps")}.`,
				"Voyons concrètement ce qui change, étape par étape.",
			),
		},
		revelation("Voici comment ça se passe, pas à pas, du premier écran jusqu'au résultat."),
		...etapes,
		resultat,
		preuve,
		appel("Prêt à voir la différence ?", 3, [
			`Essayez ${nom}, c'est simple.`,
			"Un premier pas suffit pour que tout change, et vous le sentirez vite.",
		]),
		fin,
	];

	// Trame 3 : la vision ou manifeste (une conviction, la revelation qui l'incarne, puis la preuve par l'usage)
	const conviction =
		tient(`Notre conviction : ${minuscule(promesse1)}.`, 80) ??
		tient(`Notre conviction : ${minuscule(promesseCourte)}.`, 80) ??
		"Notre conviction : tout peut rester simple.";
	const visionManifeste = (): (ScenePub | false)[] => [
		{
			id: "ouverture",
			type: "ouverture",
			moment: "Notre idée",
			detail: tient(majuscule(cible), 30),
			voix: cible ? `Une idée simple, pensée pour ${minuscule(cible)}.` : "Une idée simple, pensée pour vous.",
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
		// Sans capture il n'y a pas d'etape : le chorus facultatif garde le script au-dessus de 8 scenes
		!etapes.length && {
			id: "chorus",
			type: "chorus",
			titre: accentue("Trop de gens s'y résignent.", 2),
			chute: accentue("Nous refusons de nous y faire.", 3),
			bulles: ["Ça a toujours été comme ça.", "On fait avec.", "Pas le choix."],
			voix: "Trop de gens s'y résignent, comme si c'était normal. Nous, nous refusons de nous y faire.",
		},
		revelation("Né de cette conviction, pensé pour être utile dès le premier jour, et simple à vivre."),
		...etapes,
		preuve,
		resultat,
		appel("On commence ensemble ?", 2, [
			`Rejoignez ${nom}, dès aujourd'hui.`,
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
		captures,
		scenes: scenes.filter((s): s is ScenePub => s !== false).map(sansVides),
	};
}
