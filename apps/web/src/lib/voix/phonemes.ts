// Du texte aux identifiants de Kokoro, sans dépendance au navigateur (testable sous Node).
// Reproduit le pipeline de kokoro-onnx 0.6.1 (phonemizer Python, preserve_punctuation, with_stress),
// celui qui a produit l'écoute de référence .bench-voix/ecoute/09, à une différence près :
// les drapeaux de changement de langue d'espeak-ng (« (en) ») sont retirés au lieu d'être lus.
import { LONGUEUR_MAX, VOCABULAIRE } from "./vocabulaire";

const car = String.fromCharCode;
const TIRET_CADRATIN = car(0x2014);
const POINTS_SUSPENSION = car(0x2026);

// Signes de ponctuation de phonemizer : le texte est découpé autour, chaque morceau passe dans espeak-ng,
// puis les signes sont remis tels quels pour que Kokoro marque les pauses.
const SIGNES = `;:!?¡¿${TIRET_CADRATIN}${POINTS_SUSPENSION}"«»${car(0x201c)}${car(0x201d)}(){}[]`.replace(/[\]\\[^-]/g, "\\$&");
// Virgule et point ne comptent pas entre deux chiffres (« 1,5 »).
const RE_PONCTUATION = new RegExp(`(?:\\s*(?:[${SIGNES}]|(?<![0-9])[,.]|[,.](?![0-9]))+\\s*)+`, "gu");

const FIN_PHRASE = `.!?${POINTS_SUSPENSION}`;
const FIN_PROPOSITION = ",;:";

/** Nettoie la sortie de text_to_phonemes d'espeak-ng (séparateurs « _ », propositions « | », drapeaux de langue). */
export function nettoyerSortieEspeak(brut: string): string {
	return brut
		.replace(/\([a-z]{2,3}(?:-[a-z0-9]+)?\)/gi, "")
		.replace(/\|/g, " ")
		.replace(/_/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** Phonémise un texte en gardant la ponctuation ; `morceau` reçoit chaque segment sans ponctuation. */
export function phonemiser(texte: string, morceau: (segment: string) => string): string {
	let sortie = "";
	let position = 0;
	const segment = (fin: number) => {
		const brut = texte.slice(position, fin);
		return brut.trim() ? nettoyerSortieEspeak(morceau(brut)) : "";
	};
	for (const signe of texte.matchAll(RE_PONCTUATION)) {
		sortie += segment(signe.index) + signe[0];
		position = signe.index + signe[0].length;
	}
	sortie += segment(texte.length);
	return garderConnus(sortie).replace(/\s+/g, " ").trim();
}

/** Retire les symboles absents du vocabulaire de Kokoro. */
export function garderConnus(phonemes: string): string {
	let sortie = "";
	for (const symbole of phonemes) if (VOCABULAIRE.has(symbole)) sortie += symbole;
	return sortie;
}

export function versIdentifiants(phonemes: string): number[] {
	const ids: number[] = [];
	for (const symbole of phonemes) {
		const id = VOCABULAIRE.get(symbole);
		if (id !== undefined) ids.push(id);
	}
	return ids;
}

// Points de coupe, du moins au plus gênant : fin de phrase, fin de proposition, espace.
const COUPES = [
	new RegExp(`(?<=[${FIN_PHRASE.replace(/[.?]/g, "\\$&")}])\\s+`, "u"),
	new RegExp(`(?<=[${FIN_PROPOSITION}])\\s+`, "u"),
	/\s+/u,
];

function* atomes(phonemes: string, max: number, niveau = 0): Generator<string> {
	if ([...phonemes].length <= max) {
		if (phonemes) yield phonemes;
		return;
	}
	for (let i = niveau; i < COUPES.length; i++) {
		const morceaux = phonemes.split(COUPES[i]);
		if (morceaux.length > 1) {
			for (const morceau of morceaux) yield* atomes(morceau.trim(), max, i + 1);
			return;
		}
	}
	const symboles = [...phonemes];
	for (let debut = 0; debut < symboles.length; debut += max) yield symboles.slice(debut, debut + max).join("");
}

function grouper(longueurs: number[], limite: number): [number, number][] {
	const lots: [number, number][] = [];
	let debut = 0;
	let taille = 0;
	longueurs.forEach((longueur, i) => {
		const candidat = i === debut ? longueur : taille + 1 + longueur;
		if (candidat > limite && i > debut) {
			lots.push([debut, i]);
			debut = i;
			taille = longueur;
		} else {
			taille = candidat;
		}
	});
	if (longueurs.length) lots.push([debut, longueurs.length]);
	return lots;
}

/**
 * Découpe en lots d'au plus `max` symboles, équilibrés comme dans kokoro-onnx : un lot court
 * serait dit à un autre débit et à un autre volume que ses voisins.
 */
export function decouperEnLots(phonemes: string, max = LONGUEUR_MAX): string[] {
	const liste = [...atomes(phonemes.trim(), max)];
	if (!liste.length) return [];
	const longueurs = liste.map((a) => [...a].length);
	const minimum = grouper(longueurs, max).length;
	let bas = Math.max(...longueurs);
	let haut = max;
	while (bas < haut) {
		const milieu = Math.floor((bas + haut) / 2);
		if (grouper(longueurs, milieu).length <= minimum) haut = milieu;
		else bas = milieu + 1;
	}
	return grouper(longueurs, bas).map(([debut, fin]) => liste.slice(debut, fin).join(" "));
}

/** Silence (en secondes) à placer après un lot, selon sa ponctuation finale. */
export function pauseApres(lot: string, phrase = 0.25, proposition = 0.1): number {
	const signe = lot.trimEnd().slice(-1);
	if (FIN_PHRASE.includes(signe)) return phrase;
	if (FIN_PROPOSITION.includes(signe)) return proposition;
	return 0;
}
