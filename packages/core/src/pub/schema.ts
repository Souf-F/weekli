import { GESTES, TRAMES } from "./types";

// Schema JSON d'un ScriptPub pour la sortie structuree de Claude (mode cle API) et la description des outils MCP.
// Les bornes (longueurs, nombres d'elements, plages) ne sont pas exprimees ici : nettoyerScriptPub les applique.

const chaine = { type: "string" } as const;
const objet = (proprietes: Record<string, unknown>, requis: string[]) =>
	({ type: "object", properties: proprietes, required: requis, additionalProperties: false }) as const;
const liste = (items: unknown) => ({ type: "array", items }) as const;
const hex = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" } as const;
const rect = objet(
	{ x: { type: "number" }, y: { type: "number" }, largeur: { type: "number" }, hauteur: { type: "number" } },
	["x", "y", "largeur", "hauteur"],
);
const motsAccent = objet({ texte: chaine, accent: chaine }, ["texte"]);
const carte = objet({ titre: chaine, detail: chaine }, ["titre"]);

const scene = (type: string, proprietes: Record<string, unknown>, requis: string[]) =>
	objet(
		{
			id: chaine,
			type: { type: "string", enum: [type] },
			voix: chaine,
			duree: { type: "number" },
			transition: { type: "string", enum: ["coupe", "glitch", "flou", "pixels"] },
			but: { type: "string", enum: ["lire", "comprendre", "montrer"] },
			masquee: { type: "boolean" },
			...proprietes,
		},
		["id", "type", "voix", ...requis],
	);

export const SCHEMA_SCRIPT_PUB = objet(
	{
		version: { type: "integer", enum: [1] },
		titre: chaine,
		projet: objet({ nom: chaine, repo: chaine, lien: chaine }, ["nom", "repo", "lien"]),
		reponses: objet({ pourQui: chaine, probleme: chaine, promesse: chaine }, ["pourQui", "probleme", "promesse"]),
		marque: objet(
			{
				primaire: hex,
				accent: hex,
				alerte: hex,
				logo: { type: "string", enum: ["monogramme", "image"] },
				monogramme: chaine,
				typo: { type: "string", enum: ["nette", "editoriale"] },
			},
			["primaire", "logo", "typo"],
		),
		voix: objet(
			{
				mode: { type: "string", enum: ["synthese", "importee", "aucune"] },
				vitesse: { type: "number" },
				prononciation: { type: "object", additionalProperties: chaine },
			},
			["mode", "vitesse", "prononciation"],
		),
		musique: { type: "string", enum: ["energique", "calme", "aucune"] },
		trame: { type: "string", enum: [...TRAMES] },
		gestes: liste({ type: "string", enum: [...GESTES] }),
		captures: liste(
			objet(
				{
					id: chaine,
					source: { type: "string", enum: ["site", "importee"] },
					url: chaine,
					format: { type: "string", enum: ["bureau", "mobile"] },
					legende: chaine,
				},
				["id", "source", "format"],
			),
		),
		scenes: liste({
			anyOf: [
				scene("ouverture", { moment: chaine, detail: chaine }, ["moment"]),
				scene("repetition", { lignes: liste(motsAccent), impact: chaine, carte }, ["lignes", "impact"]),
				scene("boucle", { phrase: motsAccent, reperes: liste(chaine), carte }, ["phrase", "reperes", "carte"]),
				scene("chorus", { titre: motsAccent, chute: motsAccent, bulles: liste(chaine) }, ["titre", "chute", "bulles"]),
				scene("rupture", { texte: motsAccent }, ["texte"]),
				scene("revelation", { slogan: motsAccent, signature: chaine }, ["slogan"]),
				scene(
					"etape",
					{
						titre: motsAccent,
						texte: chaine,
						filigrane: chaine,
						onglet: chaine,
						visuel: {
							anyOf: [
								objet(
									{
										type: { type: "string", enum: ["capture"] },
										capture: chaine,
										cadrage: { anyOf: [{ type: "string", enum: ["haut", "milieu", "bas", "complet"] }, rect] },
										focus: rect,
									},
									["type", "capture"],
								),
								objet({ type: { type: "string", enum: ["liste"] }, titre: chaine, elements: liste(chaine) }, [
									"type",
									"titre",
									"elements",
								]),
							],
						},
					},
					["titre", "filigrane", "onglet", "visuel"],
				),
				scene("resultat", { titre: motsAccent, avant: chaine, tampon: chaine, apres: chaine, chute: motsAccent }, [
					"titre",
					"avant",
					"tampon",
					"apres",
				]),
				scene(
					"preuve",
					{
						surtitre: chaine,
						elements: liste(chaine),
						cartes: liste(objet({ titre: chaine, texte: chaine }, ["titre"])),
					},
					["surtitre", "elements"],
				),
				scene("appel", { question: motsAccent, badge: motsAccent, action: chaine, bouton: chaine }, [
					"question",
					"action",
					"bouton",
				]),
				scene("fin", { slogan: chaine, bouton: chaine, liens: liste(chaine), mentionWeekli: { type: "boolean" } }, [
					"liens",
				]),
			],
		}),
	},
	["version", "titre", "projet", "reponses", "marque", "voix", "musique", "captures", "scenes"],
);
