import { ICONES, type ScenePub, type ScriptPub } from "@weekli/core";
import type { Chemin } from "./edition";

// Champs editables de chaque type de scene (api-contract.md 2.1), avec la limite de caracteres du contrat
export type Genre = "court" | "long" | "liste" | "icone" | "capture" | "cadrage" | "case";
export type Champ = {
	chemin: Chemin;
	libelle: string;
	genre: Genre;
	max?: number;
	facultatif?: boolean;
	aide?: string;
};

export const CADRAGES = [
	{ valeur: "haut", libelle: "Haut de la page" },
	{ valeur: "milieu", libelle: "Milieu" },
	{ valeur: "bas", libelle: "Bas de la page" },
	{ valeur: "complet", libelle: "Page entière" },
] as const;
export { ICONES };

const c = (chemin: Chemin, libelle: string, max: number, extra: Partial<Champ> = {}): Champ => ({ chemin, libelle, genre: "court", max, ...extra });
const liste = (chemin: Chemin, libelle: string, max: number, aide: string): Champ => ({ chemin, libelle, genre: "liste", max, aide });
// Un texte avec un mot mis en couleur : l'accent doit etre contenu dans le texte
const accent = (cle: Chemin, libelle: string, max: number, facultatif = false): Champ[] => [
	c([...cle, "texte"], libelle, max, { facultatif }),
	c([...cle, "accent"], `${libelle} : mot en couleur`, max, { facultatif: true, aide: "Une partie exacte du texte ci-dessus" }),
];

export function champsScene(scene: ScenePub, script: Pick<ScriptPub, "captures">): Champ[] {
	switch (scene.type) {
		case "ouverture":
			return [c(["moment"], "Moment", 14), c(["detail"], "Détail", 30, { facultatif: true })];
		case "repetition":
			return [
				...scene.lignes.flatMap((_, i) => accent(["lignes", i], `Ligne ${i + 1}`, 30)),
				c(["impact"], "Mot d'impact", 14),
				c(["carte", "titre"], "Carte : titre", 30, { facultatif: true }),
				c(["carte", "detail"], "Carte : détail", 40, { facultatif: true }),
			];
		case "boucle":
			return [
				...accent(["phrase"], "Phrase", 70),
				liste(["reperes"], "Repères", 14, "Un par ligne, 2 à 4"),
				c(["carte", "titre"], "Carte : titre", 30),
				c(["carte", "detail"], "Carte : détail", 40, { facultatif: true }),
			];
		case "chorus":
			return [...accent(["titre"], "Titre", 50), ...accent(["chute"], "Chute", 50), liste(["bulles"], "Bulles", 28, "Une par ligne, 3 à 6")];
		case "rupture":
			return accent(["texte"], "Texte", 80);
		case "revelation":
			return [...accent(["slogan"], "Slogan", 60), c(["signature"], "Signature", 30, { facultatif: true })];
		case "etape": {
			const champs: Champ[] = [
				...accent(["titre"], "Titre", 50),
				{ ...c(["texte"], "Texte", 110, { facultatif: true }), genre: "long" as const },
				c(["filigrane"], "Filigrane", 14),
				c(["onglet"], "Onglet", 14),
				...(scene.visuel.type === "capture"
					? [
							{ chemin: ["visuel", "capture"], libelle: "Capture", genre: "capture" } as Champ,
							{ chemin: ["visuel", "cadrage"], libelle: "Cadrage", genre: "cadrage" } as Champ,
						]
					: [c(["visuel", "titre"], "Liste : titre", 30), liste(["visuel", "elements"], "Liste : éléments", 40, "Un par ligne, 2 à 4")]),
			];
			return champs.filter((champ) => champ.genre !== "capture" || script.captures.length > 0);
		}
		case "transformation":
			return [
				...accent(["titre"], "Titre", 50),
				c(["entree", "libelle"], "Entrée : libellé", 20),
				{ chemin: ["entree", "icone"], libelle: "Entrée : icône", genre: "icone" },
				c(["operateur"], "Opérateur", 14),
				c(["sortie", "libelle"], "Sortie : libellé", 20),
				{ chemin: ["sortie", "icone"], libelle: "Sortie : icône", genre: "icone" },
				{ ...c(["texte"], "Texte", 110, { facultatif: true }), genre: "long" },
			];
		case "flux":
			return [
				...accent(["titre"], "Titre", 50),
				...scene.noeuds.flatMap((_, i): Champ[] => [
					c(["noeuds", i, "libelle"], `Nœud ${i + 1} : libellé`, 16),
					c(["noeuds", i, "detail"], `Nœud ${i + 1} : détail`, 30, { facultatif: true }),
					{ chemin: ["noeuds", i, "icone"], libelle: `Nœud ${i + 1} : icône`, genre: "icone" },
				]),
			];
		case "avantapres":
			return [
				...accent(["titre"], "Titre", 50),
				c(["avant"], "Mot « avant »", 12, { facultatif: true }),
				c(["apres"], "Mot « après »", 12, { facultatif: true }),
				...scene.paires.flatMap((_, i) => [c(["paires", i, "avant"], `Paire ${i + 1} : avant`, 28), c(["paires", i, "apres"], `Paire ${i + 1} : après`, 28)]),
			];
		case "resultat":
			return [
				...accent(["titre"], "Titre", 50),
				c(["avant"], "Avant", 24),
				c(["tampon"], "Tampon", 12),
				c(["apres"], "Après", 24),
				...accent(["chute"], "Chute", 70, true),
			];
		case "preuve":
			return [
				c(["surtitre"], "Surtitre", 30),
				liste(["elements"], "Éléments", 30, "Un par ligne, 1 à 4, des faits vérifiables"),
				...(scene.cartes ?? []).flatMap((_, i) => [c(["cartes", i, "titre"], `Carte ${i + 1} : titre`, 30), c(["cartes", i, "texte"], `Carte ${i + 1} : texte`, 60, { facultatif: true })]),
			];
		case "appel":
			return [
				...accent(["question"], "Question", 70),
				...accent(["badge"], "Badge", 30, true),
				c(["action"], "Action", 20),
				c(["bouton"], "Bouton", 30),
			];
		case "fin":
			return [
				c(["slogan"], "Slogan", 40, { facultatif: true }),
				c(["bouton"], "Bouton", 30, { facultatif: true }),
				liste(["liens"], "Liens", 40, "Un par ligne, 1 à 2"),
				{ chemin: ["mentionWeekli"], libelle: "Ajouter « Fait avec Weekli »", genre: "case" },
			];
	}
}
