import { calculerTimeline, type ScenePub, type ScriptPub } from "@weekli/core";

const m = (texte: string) => ({ texte });
const carte = { titre: "Carte" };

function scenes(facteur: number): ScenePub[] {
	const d = (base: number) => base * facteur;
	return [
		{ id: "s1", type: "ouverture", voix: "", duree: d(2.5), moment: "Lundi matin" },
		{ id: "s2", type: "repetition", voix: "", duree: d(3.5), lignes: [m("Même réunion.")], impact: "ENCORE", carte },
		{ id: "s3", type: "boucle", voix: "", duree: d(4), phrase: m("Le même sujet revient."), reperes: ["S41", "S45"], carte },
		{ id: "s4", type: "chorus", voix: "", duree: d(4), titre: m("Tout le monde en parle."), chute: m("Personne ne le règle."), bulles: ["a", "b"] },
		{ id: "s5", type: "rupture", voix: "", duree: d(3.5), texte: m("Et si quelqu'un s'en occupait ?") },
		{ id: "s6", type: "revelation", voix: "", duree: d(6), slogan: m("Weekli, jusqu'au résultat.") },
		// etape sans capture : seul le titre s'affiche
		{ id: "s7", type: "etape", voix: "", duree: d(4.5), titre: m("Comprendre"), filigrane: "COMPRENDRE", onglet: "Comprendre", visuel: { type: "liste", titre: "", elements: [] } },
		{ id: "s8", type: "etape", voix: "", duree: d(4.5), titre: m("Décider"), filigrane: "DECIDER", onglet: "Décider", visuel: { type: "liste", titre: "", elements: [] } },
		{ id: "s9", type: "resultat", voix: "", duree: d(5), titre: m("Résolu"), avant: "Avant", tampon: "RÉSOLU", apres: "Après" },
		{ id: "s10", type: "preuve", voix: "", duree: d(4.5), surtitre: "Déjà utilisé avec", elements: ["A", "B"] },
		{ id: "s11", type: "appel", voix: "", duree: d(5), question: m("Un problème revient ?"), action: "Parlons-en", bouton: "Écrire" },
		{ id: "s12", type: "fin", voix: "", duree: d(4), liens: ["weekli.example"] },
	];
}

export function scriptDeTest(dureeCible: number): ScriptPub {
	const base = {
		version: 1 as const,
		titre: "Pub de test",
		projet: { nom: "Test", repo: "test", lien: "https://test.example" },
		reponses: { pourQui: "a", probleme: "b", promesse: "c" },
		marque: { primaire: "#3d4bff" as const, logo: "monogramme" as const, monogramme: "T", typo: "nette" as const },
		voix: { mode: "aucune" as const, vitesse: 1, prononciation: {} },
		musique: "aucune" as const,
		captures: [],
	};
	// durees bornees par type : dichotomie sur un facteur d'echelle pour approcher la duree cible
	let bas = 0.5;
	let haut = 2.5;
	for (let n = 0; n < 40; n++) {
		const milieu = (bas + haut) / 2;
		const duree = calculerTimeline({ ...base, scenes: scenes(milieu) }).duree;
		if (duree < dureeCible) bas = milieu;
		else haut = milieu;
	}
	return { ...base, scenes: scenes((bas + haut) / 2) };
}
