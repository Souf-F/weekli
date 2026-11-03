import { LIMITES_PUB } from "./limites";
import type { ScenePub } from "./types";

// Anti-repetition (design.md 8.18) : chaque argument (gratuite, securite, rapidite...) ne se dit qu'une fois dans
// la pub, voix et visuels confondus. Deux detecteurs, sans IA :
// - les idees : une liste fermee d'arguments reconnus par leur vocabulaire, au plus 1 scene chacune ;
// - les mots : un mot significatif (lemme simple, hors mots outils et nom du projet) dans 3 scenes ou plus.
// Les scenes de tension (repetition, boucle, chorus) repetent par construction et sont exclues. La fin reprend le
// slogan (et la signature) de la revelation : ces phrases sont retirees de son texte avant l'analyse.

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const IDEES_PUB: readonly { cle: string; nom: string; motif: RegExp }[] = [
	{ cle: "gratuite", nom: "gratuite", motif: /gratuit|gratis|offert|sans frais|sans payer|zero euro/ },
	{
		cle: "securite",
		nom: "securite des donnees",
		motif: /securi|chiffr|confidential|vie privee|rgpd|protege|effac|sans trace/,
	},
	{
		cle: "rapidite",
		nom: "rapidite",
		motif:
			/rapide|\bvite\b|instantan|immediat|gain de temps|en un (clin|instant|eclair)|en quelques (minutes|secondes|clics)|\b(une|deux|trois|quatre|cinq|dix|vingt|trente|\d+) (minutes?|secondes?)\b/,
	},
	{
		cle: "simplicite",
		nom: "simplicite",
		motif: /\bsimple|simplifi|facile|sans effort|sans rien (installer|chercher|faire)|en un clic|d'un clic|un seul clic/,
	},
	{ cle: "ouvert", nom: "code ouvert", motif: /open source|code ouvert|logiciel libre/ },
	{ cle: "sans-compte", nom: "absence d'inscription", motif: /sans (inscription|compte|engagement|carte)/ },
	{
		cle: "controle",
		nom: "controle de l'utilisateur",
		motif: /sans (toi|vous)\b|relis|relir|lecture seule|gardes? le controle|garde(?:z)? la main/,
	},
];

const EXEMPTEES = new Set<ScenePub["type"]>(["repetition", "boucle", "chorus"]);
const CLES_IGNOREES = new Set(["id", "type", "transition", "but", "masquee", "duree", "icone", "capture", "cadrage", "liens"]);

const MOTS_OUTILS = new Set(
	[
		"alors", "apres", "aussi", "assez", "autre", "avant", "avec", "avoir", "cette", "chaque", "comme", "comment", "dans",
		"depuis", "donc", "encore", "enfin", "entre", "etait", "etre", "faire", "faut", "fois", "jamais", "leurs", "lors",
		"meme", "moins", "notre", "nous", "votre", "vous", "parce", "pendant", "peut", "plus", "pour", "puis", "quand",
		"quel", "quelle", "quelques", "sans", "selon", "sera", "seul", "seule", "sont", "sous", "tous", "tout", "toute",
		"toutes", "tres", "trop", "vers", "voici", "voila", "vraiment", "ainsi", "mais", "dont", "ceux", "celle", "celui",
		"certain", "chez", "deja", "enfin", "etes", "fait", "font", "ici", "juste", "mieux", "rien", "seulement", "toujours",
		"tient", "reste", "restent", "devient", "deviennent", "prend", "prennent", "passe", "passent", "arrive", "arrivent",
		"va", "vont", "veut", "peuvent", "pouvez", "pouvoir", "savoir", "voir", "mettre", "donne", "donner",
	].map((m) => lemme(m)),
);

// Lemme simple : sans accents, minuscule, pluriel (s, x) puis e final retires
function lemme(m: string): string {
	let l = m.replace(/[sx]$/, "");
	if (l.length > 5) l = l.replace(/e$/, "");
	return l;
}

function textes(v: unknown, sortie: string[]): void {
	if (typeof v === "string") sortie.push(v);
	else if (Array.isArray(v)) for (const x of v) textes(x, sortie);
	else if (v && typeof v === "object")
		for (const [k, x] of Object.entries(v)) if (!CLES_IGNOREES.has(k)) textes(x, sortie);
}

const nettoye = (s: string) => sansAccents(s).replace(/[^a-z0-9]+/g, " ").trim();

// Phrases de marque que la fin a le droit de reprendre
function refrains(scenes: readonly ScenePub[]): string[] {
	const r: string[] = [];
	for (const s of scenes) {
		if (s.type === "revelation") r.push(s.slogan.texte, ...(s.signature ? [s.signature] : []));
		if (s.type === "fin" && s.slogan) r.push(s.slogan);
	}
	return r.map(nettoye).filter(Boolean);
}

const texteDeScene = (s: ScenePub, reprises: readonly string[]) => {
	const t: string[] = [];
	textes(s, t);
	let texte = ` ${nettoye(t.join(" "))} `;
	if (s.type === "fin")
		for (const phrase of reprises) {
			// deux passes : deux occurrences voisines se partagent leur espace
			texte = texte.split(` ${phrase} `).join("  ").split(` ${phrase} `).join("  ");
		}
	return texte;
};

export function avertissementsRepetition(visibles: readonly ScenePub[], nomProjet: string): string[] {
	const sortie: string[] = [];
	const comptees = visibles.filter((s) => !EXEMPTEES.has(s.type));
	const reprises = refrains(visibles);
	const corps = comptees.map((s) => ({ id: s.id, type: s.type, texte: texteDeScene(s, reprises) }));

	for (const idee of IDEES_PUB) {
		const ids = corps.filter((c) => idee.motif.test(c.texte)).map((c) => c.id);
		if (ids.length > LIMITES_PUB.repetition.scenesParIdee - 1)
			sortie.push(
				`Repetition : l'argument "${idee.nom}" revient dans ${ids.length} scenes (${ids.join(", ")}). Chaque argument ne se dit qu'une fois, voix et visuels confondus`,
			);
	}

	const exclus = new Set(sansAccents(nomProjet).split(/[^a-z0-9]+/).filter(Boolean).map(lemme));
	const parMot = new Map<string, { forme: string; ids: Set<string> }>();
	for (const c of corps) {
		for (const m of c.texte.split(/[^a-z0-9]+/)) {
			if (m.length < LIMITES_PUB.repetition.longueurMot || /^\d/.test(m)) continue;
			const l = lemme(m);
			if (MOTS_OUTILS.has(l) || exclus.has(l)) continue;
			const entree = parMot.get(l) ?? { forme: m, ids: new Set<string>() };
			entree.ids.add(c.id);
			parMot.set(l, entree);
		}
	}
	for (const { forme, ids } of parMot.values())
		if (ids.size >= LIMITES_PUB.repetition.scenesParMot)
			sortie.push(
				`Repetition : le mot "${forme}" revient dans ${ids.size} scenes (${[...ids].join(", ")}). Dis-le une fois, ailleurs change d'idee`,
			);
	return sortie;
}
