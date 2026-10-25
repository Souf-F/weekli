import { COULEUR_HEX, DUREES_SCENE, LIMITES_PUB, REGEX_ID, REGEX_NOM_REPO, TRANSITIONS } from "./limites";
import { calculerTimeline } from "./timeline";
import type {
	Cadrage,
	CaptureRef,
	Carte,
	Geste,
	Hex,
	MotsAccent,
	Rect,
	ResultatNettoyage,
	ScenePub,
	ScriptPub,
	Visuel,
} from "./types";
import { BUTS, GESTES, GESTES_PUB } from "./types";

type Rec = Record<string, unknown>;
type Rapport = { erreurs: string[]; avertissements: string[] };

const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const sans = <T extends object>(o: T): T => {
	for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
	return o;
};
const borne = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const mots = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Retire les caracteres de controle (dont les marques bidirectionnelles), remplace les tirets longs
// ou moyens par une virgule, puis tronque sans couper un mot
const CONTROLES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g;
function texte(v: unknown, max: number): string {
	if (typeof v !== "string") return "";
	const propre = v
		.replace(/[\t\n\r\u2028\u2029]/g, " ")
		.replace(CONTROLES, "")
		.replace(/\s*[\u2014\u2013]\s*/g, ", ")
		.replace(/\s+/g, " ")
		.replace(/^[,\s]+/, "")
		.trim();
	const signes = Array.from(propre);
	if (signes.length <= max) return propre;
	const coupe = signes.slice(0, max).join("");
	const fin = signes[max] === " " ? coupe : coupe.slice(0, Math.max(coupe.lastIndexOf(" "), 0)) || coupe;
	return fin.replace(/[\s,;:]+$/, "");
}

function urlHttps(v: unknown, max: number): string | null {
	const s = texte(v, 1000);
	if (!s || s.length > max || s.includes(" ")) return null;
	try {
		const u = new URL(s);
		return u.protocol === "https:" && u.hostname && !u.username && !u.password ? s : null;
	} catch {
		return null;
	}
}

function outils(prefixe: string, r: Rapport) {
	const err = (m: string) => void r.erreurs.push(`${prefixe} : ${m}`);
	const avert = (m: string) => void r.avertissements.push(`${prefixe} : ${m}`);
	const requis = (v: unknown, max: number, nom: string) => {
		const t = texte(v, max);
		if (!t) err(`champ "${nom}" obligatoire`);
		return t;
	};
	const optionnel = (v: unknown, max: number) => texte(v, max) || undefined;
	const motsAccent = (v: unknown, max: number, nom: string, obligatoire = true): MotsAccent | undefined => {
		const e = typeof v === "string" ? { texte: v } : rec(v);
		const t = texte(e?.texte, max);
		if (!t) {
			if (obligatoire) err(`champ "${nom}" obligatoire`);
			return undefined;
		}
		const accent = texte(e?.accent, max);
		if (accent && !t.includes(accent)) {
			avert(`l'accent de "${nom}" n'est pas contenu dans le texte, il est retire`);
			return { texte: t };
		}
		return sans({ texte: t, accent: accent || undefined });
	};
	const liste = (v: unknown, min: number, max: number, len: number, nom: string): string[] => {
		const l = (Array.isArray(v) ? v : [])
			.map((x) => texte(x, len))
			.filter(Boolean)
			.slice(0, max);
		if (l.length < min) err(`"${nom}" demande au moins ${min} element${min > 1 ? "s" : ""}`);
		return l;
	};
	const carte = (v: unknown, obligatoire: boolean, nom = "carte"): Carte | undefined => {
		const e = rec(v);
		const titre = texte(e?.titre, 30);
		if (!titre) {
			if (obligatoire) err(`champ "${nom}.titre" obligatoire`);
			return undefined;
		}
		return sans({ titre, detail: optionnel(e?.detail, 40) });
	};
	return { err, avert, requis, optionnel, motsAccent, liste, carte };
}

function rect(v: unknown): Rect | undefined {
	const e = rec(v);
	const [x, y, l, h] = ["x", "y", "largeur", "hauteur"].map((k) => nombre(e?.[k]));
	if (x === null || y === null || l === null || h === null || l <= 0 || h <= 0) return undefined;
	const cx = borne(x, 0, 0.99);
	const cy = borne(y, 0, 0.99);
	return { x: cx, y: cy, largeur: Math.min(l, 1 - cx), hauteur: Math.min(h, 1 - cy) };
}

function cadrage(v: unknown): Cadrage | undefined {
	return v === "haut" || v === "milieu" || v === "bas" || v === "complet" ? v : rect(v);
}

function visuel(v: unknown, captures: Set<string>, o: ReturnType<typeof outils>): Visuel | undefined {
	const e = rec(v);
	if (e?.type === "capture") {
		const id = typeof e.capture === "string" ? e.capture : "";
		if (captures.has(id))
			return sans({ type: "capture" as const, capture: id, cadrage: cadrage(e.cadrage), focus: rect(e.focus) });
		o.avert(`la capture "${texte(id, 24)}" n'existe pas, la scene passe en liste vide`);
		return { type: "liste", titre: "", elements: [] };
	}
	if (e?.type === "liste")
		return {
			type: "liste",
			titre: o.requis(e.titre, 30, "visuel.titre"),
			elements: o.liste(e.elements, 2, 4, 40, "visuel.elements"),
		};
	o.err(`champ "visuel" obligatoire (capture ou liste)`);
	return undefined;
}

// Champs propres a chaque type de scene (design.md 8.9, bornes de api-contract.md 2.1)
function corps(e: Rec, captures: Set<string>, o: ReturnType<typeof outils>): Rec | null {
	const { requis, optionnel, motsAccent, liste, carte } = o;
	switch (e.type) {
		case "ouverture":
			return { moment: requis(e.moment, 14, "moment"), detail: optionnel(e.detail, 30) };
		case "repetition": {
			const lignes = (Array.isArray(e.lignes) ? e.lignes : [])
				.slice(0, 3)
				.map((l) => motsAccent(l, 30, "lignes", false))
				.filter(Boolean);
			if (lignes.length < 2) o.err(`"lignes" demande au moins 2 elements`);
			return { lignes, impact: requis(e.impact, 14, "impact"), carte: carte(e.carte, false) };
		}
		case "boucle":
			return {
				phrase: motsAccent(e.phrase, 70, "phrase"),
				reperes: liste(e.reperes, 2, 4, 14, "reperes"),
				carte: carte(e.carte, true),
			};
		case "chorus":
			return {
				titre: motsAccent(e.titre, 50, "titre"),
				chute: motsAccent(e.chute, 50, "chute"),
				bulles: liste(e.bulles, 3, 6, 28, "bulles"),
			};
		case "rupture":
			return { texte: motsAccent(e.texte, 80, "texte") };
		case "revelation":
			return { slogan: motsAccent(e.slogan, 60, "slogan"), signature: optionnel(e.signature, 30) };
		case "etape":
			return {
				titre: motsAccent(e.titre, 50, "titre"),
				texte: optionnel(e.texte, 110),
				filigrane: requis(e.filigrane, 14, "filigrane"),
				onglet: requis(e.onglet, 14, "onglet"),
				visuel: visuel(e.visuel, captures, o),
			};
		case "resultat":
			return {
				titre: motsAccent(e.titre, 50, "titre"),
				avant: requis(e.avant, 24, "avant"),
				tampon: requis(e.tampon, 12, "tampon"),
				apres: requis(e.apres, 24, "apres"),
				chute: motsAccent(e.chute, 70, "chute", false),
			};
		case "preuve": {
			const cartes = (Array.isArray(e.cartes) ? e.cartes : [])
				.slice(0, 3)
				.map((c) => {
					const x = rec(c);
					const titre = texte(x?.titre, 30);
					return titre ? sans({ titre, texte: optionnel(x?.texte, 60) }) : null;
				})
				.filter(Boolean);
			return {
				surtitre: requis(e.surtitre, 30, "surtitre"),
				elements: liste(e.elements, 1, 4, 30, "elements"),
				cartes: cartes.length ? cartes : undefined,
			};
		}
		case "appel":
			return {
				question: motsAccent(e.question, 70, "question"),
				badge: motsAccent(e.badge, 30, "badge", false),
				action: requis(e.action, 20, "action"),
				bouton: requis(e.bouton, 30, "bouton"),
			};
		case "fin":
			return {
				slogan: optionnel(e.slogan, 40),
				bouton: optionnel(e.bouton, 30),
				liens: liste(e.liens, 1, 2, 40, "liens"),
				mentionWeekli: e.mentionWeekli === true ? true : undefined,
			};
		default:
			o.err(`type de scene inconnu`);
			return null;
	}
}

function nettoyerScene(brut: unknown, i: number, ids: Set<string>, captures: Set<string>, r: Rapport): ScenePub | null {
	const e = rec(brut);
	const id = typeof e?.id === "string" ? e.id : "";
	const o = outils(`Scene ${i + 1}`, r);
	if (!e) return (o.err("objet attendu"), null);
	if (!REGEX_ID.test(id)) return (o.err(`identifiant invalide (a-z, 0-9 et tirets, 24 caracteres maximum)`), null);
	if (ids.has(id)) return (o.err(`identifiant "${id}" en double`), null);
	ids.add(id);
	const avant = r.erreurs.length;
	const champs = corps(e, captures, outils(`Scene ${i + 1} (${id})`, r));
	if (!champs || r.erreurs.length > avant) return null;
	if (e.but !== undefined && !BUTS.some((b) => b === e.but))
		o.avert(`"but" doit valoir ${BUTS.join(", ")}, la valeur par defaut du type est utilisee`);
	const type = e.type as keyof typeof DUREES_SCENE;
	const duree = nombre(e.duree);
	return sans({
		id,
		type,
		voix: texte(e.voix, LIMITES_PUB.voix),
		duree: duree === null ? undefined : borne(duree, DUREES_SCENE[type].min, DUREES_SCENE[type].max),
		transition: TRANSITIONS.find((t) => t === e.transition),
		but: BUTS.find((b) => b === e.but),
		masquee: e.masquee === true ? true : undefined,
		...sans(champs),
	}) as ScenePub;
}

function nettoyerCaptures(brut: unknown, r: Rapport): CaptureRef[] {
	const liste = Array.isArray(brut) ? brut : [];
	if (liste.length > LIMITES_PUB.captures.max)
		r.avertissements.push(`Captures : ${LIMITES_PUB.captures.max} au maximum, les suivantes sont ignorees`);
	const ids = new Set<string>();
	const captures: CaptureRef[] = [];
	liste.slice(0, LIMITES_PUB.captures.max).forEach((brute, i) => {
		const e = rec(brute);
		const o = outils(`Capture ${i + 1}`, r);
		const id = typeof e?.id === "string" ? e.id : "";
		if (!REGEX_ID.test(id)) return o.err("identifiant invalide (a-z, 0-9 et tirets, 24 caracteres maximum)");
		if (ids.has(id)) return o.err(`identifiant "${id}" en double`);
		ids.add(id);
		const source = e?.source === "importee" ? "importee" : "site";
		const url = source === "site" ? urlHttps(e?.url, 500) : null;
		if (source === "site" && !url) return o.err(`"${id}" : une capture "site" demande une URL https`);
		captures.push(
			sans({
				id,
				source,
				url: url ?? undefined,
				format: e?.format === "mobile" ? "mobile" : "bureau",
				legende: o.optionnel(e?.legende, LIMITES_PUB.legende),
			}),
		);
	});
	return captures;
}

const COULEUR_OU_RIEN = (v: unknown) =>
	typeof v === "string" && COULEUR_HEX.test(v) ? (v.toLowerCase() as Hex) : undefined;

// Gestes choisis pour la pub : 2 ou 3 identifiants connus, sans doublon. Sinon le champ est ignore (le moteur
// applique alors les gestes par defaut de chaque scene) et un avertissement l'explique.
function nettoyerGestes(brut: unknown, o: ReturnType<typeof outils>): Geste[] | undefined {
	if (brut === undefined) return undefined;
	const valides = [...new Set((Array.isArray(brut) ? brut : []).filter((g): g is Geste => GESTES.some((x) => x === g)))];
	const lus = Array.isArray(brut) ? brut.length : 0;
	if (valides.length < lus) o.avert(`"gestes" : identifiants inconnus ou en double retires (connus : ${GESTES.join(", ")})`);
	if (valides.length < GESTES_PUB.min) {
		o.avert(`"gestes" demande ${GESTES_PUB.min} a ${GESTES_PUB.max} gestes distincts, le champ est ignore`);
		return undefined;
	}
	if (valides.length > GESTES_PUB.max)
		o.avert(`"gestes" : plus de ${GESTES_PUB.max} gestes, seuls les ${GESTES_PUB.max} premiers sont gardes`);
	return valides.slice(0, GESTES_PUB.max);
}

const CODE = /[`$]|(?<![\p{L}\p{N}_])(?:npm|git|commit|const|function)(?![\p{L}\p{N}_])/iu;
const CLES_TECHNIQUES = new Set(["id", "type", "capture", "transition"]);
const contientCode = (v: unknown): boolean =>
	typeof v === "string"
		? CODE.test(v)
		: Array.isArray(v)
			? v.some(contientCode)
			: rec(v) !== null && Object.entries(v as Rec).some(([k, x]) => !CLES_TECHNIQUES.has(k) && contientCode(x));

// Valide et borne un script venu de Claude, de l'API ou de l'editeur : rien d'inattendu n'atteint le rendu.
// Rejets (script nul + erreurs) et avertissements : api-contract.md 2.1
export function nettoyerScriptPub(entree: unknown): ResultatNettoyage {
	const r: Rapport = { erreurs: [], avertissements: [] };
	const echec = (): ResultatNettoyage => ({ script: null, ...r });
	const e = rec(entree);
	if (!e || e.version !== 1) return (r.erreurs.push("Script : objet de version 1 attendu"), echec());

	const o = outils("Script", r);
	const titre = o.requis(e.titre, LIMITES_PUB.titre, "titre");
	const p = rec(e.projet);
	const repo = typeof p?.repo === "string" && REGEX_NOM_REPO.test(p.repo) ? p.repo : "";
	if (!repo) o.err(`champ "projet.repo" invalide (nom de repo GitHub)`);
	const lien = urlHttps(p?.lien, LIMITES_PUB.lien);
	if (!lien) o.err(`champ "projet.lien" invalide (URL https de ${LIMITES_PUB.lien} caracteres maximum)`);
	const nom = o.requis(p?.nom, LIMITES_PUB.nom, "projet.nom");

	const rep = rec(e.reponses);
	const m = rec(e.marque);
	const primaire = COULEUR_OU_RIEN(m?.primaire);
	if (!primaire) o.err(`champ "marque.primaire" obligatoire (#rrggbb)`);
	const optionnelle = (cle: "accent" | "alerte") => {
		const c = COULEUR_OU_RIEN(m?.[cle]);
		if (m?.[cle] !== undefined && !c)
			o.avert(`"marque.${cle}" n'est pas une couleur #rrggbb, la valeur par defaut est utilisee`);
		return c;
	};
	const logo = m?.logo === "image" ? "image" : "monogramme";
	const monogramme =
		Array.from(texte(m?.monogramme, 100)).slice(0, LIMITES_PUB.monogramme).join("") ||
		Array.from(nom)[0]?.toUpperCase();

	const v = rec(e.voix);
	const vitesse = nombre(v?.vitesse);
	const prononciation: Record<string, string> = {};
	for (const [cle, valeur] of Object.entries(rec(v?.prononciation) ?? {}).slice(0, LIMITES_PUB.prononciation.entrees)) {
		const c = texte(cle, LIMITES_PUB.prononciation.texte);
		const x = texte(valeur, LIMITES_PUB.prononciation.texte);
		if (c && x)
			Object.defineProperty(prononciation, c, { value: x, enumerable: true, writable: true, configurable: true });
	}

	const captures = nettoyerCaptures(e.captures, r);
	const idsCaptures = new Set(captures.map((c) => c.id));

	const brutes = Array.isArray(e.scenes) ? e.scenes : [];
	const { min, max } = LIMITES_PUB.scenes;
	if (brutes.length < min || brutes.length > max)
		return (r.erreurs.push(`Script : "scenes" demande de ${min} a ${max} scenes`), echec());
	const ids = new Set<string>();
	const scenes = brutes
		.map((s, i) => nettoyerScene(s, i, ids, idsCaptures, r))
		.filter((s): s is ScenePub => s !== null);

	// Les etapes au-dela de la quatrieme sont masquees
	let etapes = 0;
	for (const s of scenes) {
		if (s.type !== "etape" || s.masquee || ++etapes <= LIMITES_PUB.etapes.max) continue;
		s.masquee = true;
		r.avertissements.push(`Scene "${s.id}" : au-dela de ${LIMITES_PUB.etapes.max} etapes, la scene est masquee`);
	}

	const visibles = scenes.filter((s) => !s.masquee);
	if (!visibles.some((s) => s.type === "revelation")) o.err(`une scene "revelation" est obligatoire`);
	if (visibles.at(-1)?.type !== "fin") o.err(`la derniere scene non masquee doit etre de type "fin"`);
	if (r.erreurs.length || !primaire || !lien) return echec();

	for (const s of visibles) {
		if (contientCode(s)) r.avertissements.push(`Scene "${s.id}" : la pub ne montre pas de code`);
	}

	const gestes = nettoyerGestes(e.gestes, o);
	if (gestes) {
		for (const s of visibles) {
			if (s.transition && s.transition !== "coupe" && !gestes.includes(s.transition))
				r.avertissements.push(
					`Scene "${s.id}" : la transition "${s.transition}" ne fait pas partie des gestes choisis (${gestes.join(", ")})`,
				);
		}
	}

	const script: ScriptPub = {
		version: 1,
		titre,
		projet: { nom, repo, lien },
		reponses: {
			pourQui: texte(rep?.pourQui, LIMITES_PUB.reponse),
			probleme: texte(rep?.probleme, LIMITES_PUB.reponse),
			promesse: texte(rep?.promesse, LIMITES_PUB.reponse),
		},
		marque: sans({
			primaire,
			accent: optionnelle("accent"),
			alerte: optionnelle("alerte"),
			logo,
			monogramme,
			typo: m?.typo === "editoriale" ? "editoriale" : "nette",
		}),
		voix: {
			mode: v?.mode === "importee" || v?.mode === "aucune" ? v.mode : "synthese",
			vitesse: borne(vitesse ?? LIMITES_PUB.vitesse.defaut, LIMITES_PUB.vitesse.min, LIMITES_PUB.vitesse.max),
			prononciation,
		},
		musique: e.musique === "calme" || e.musique === "aucune" ? e.musique : "energique",
		...(gestes ? { gestes } : {}),
		captures,
		scenes,
	};

	if (new TextEncoder().encode(JSON.stringify(script)).length > LIMITES_PUB.tailleJsonOctets)
		return (
			r.erreurs.push(
				`Script : plus de ${LIMITES_PUB.tailleJsonOctets / 1024} Ko apres nettoyage, raccourcis les textes`,
			),
			echec()
		);

	const total = visibles.reduce((n, s) => n + mots(s.voix), 0);
	if (total < LIMITES_PUB.motsVoix.min || total > LIMITES_PUB.motsVoix.max)
		r.avertissements.push(
			`Voix totale de ${total} mots : vise ${LIMITES_PUB.motsVoix.min} a ${LIMITES_PUB.motsVoix.max} mots pour tenir en 60 s`,
		);
	const duree = Math.round(calculerTimeline(script).duree);
	if (duree < LIMITES_PUB.dureeTotale.min || duree > LIMITES_PUB.dureeTotale.max)
		r.avertissements.push(
			`Duree totale estimee de ${duree} s : vise ${LIMITES_PUB.dureeTotale.min} a ${LIMITES_PUB.dureeTotale.max} s`,
		);
	return { script, ...r };
}
