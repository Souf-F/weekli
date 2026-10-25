// Script de reference : exemple de docs/design.md 8.15 (projet fictif Tablee)
export const EXEMPLE: unknown = {
	version: 1,
	titre: "Pub Tablée",
	projet: {
		nom: "Tablée",
		repo: "tablee",
		lien: "https://tablee.example",
	},
	reponses: {
		pourQui: "Les restaurateurs indépendants qui prennent les réservations au téléphone pendant le service.",
		probleme:
			"Le téléphone sonne en plein coup de feu, les réservations se perdent sur un carnet, des tables restent vides.",
		promesse: "Les réservations arrivent toutes seules et le service reste calme.",
	},
	marque: {
		primaire: "#c2410c",
		accent: "#ea580c",
		logo: "monogramme",
		monogramme: "T",
		typo: "nette",
	},
	voix: {
		mode: "synthese",
		vitesse: 1,
		prononciation: {
			Tablée: "Tablé",
		},
	},
	musique: "energique",
	captures: [
		{
			id: "accueil",
			source: "site",
			url: "https://tablee.example/",
			format: "bureau",
			legende: "Accueil",
		},
		{
			id: "salle",
			source: "site",
			url: "https://tablee.example/demo/salle",
			format: "bureau",
			legende: "Plan de salle",
		},
	],
	scenes: [
		{
			id: "ouverture",
			type: "ouverture",
			moment: "Samedi",
			detail: "20:30 · plein service",
			voix: "Samedi soir, vingt heures trente. Plein service.",
		},
		{
			id: "repetition",
			type: "repetition",
			lignes: [
				{
					texte: "Même carnet.",
					accent: "carnet.",
				},
				{
					texte: "Même téléphone.",
					accent: "téléphone.",
				},
			],
			impact: "ENCORE.",
			carte: {
				titre: "Appel manqué",
				detail: "Table pour 4, 21:00",
			},
			voix: "Le téléphone sonne. Encore.",
		},
		{
			id: "boucle",
			type: "boucle",
			phrase: {
				texte: "Service après service, les mêmes tables vides.",
				accent: "tables vides.",
			},
			reperes: ["Vendredi", "Samedi", "Dimanche"],
			carte: {
				titre: "Réservation perdue",
				detail: "Rappeler ?",
			},
			voix: "Service après service, les réservations se perdent sur un carnet, et les tables restent vides.",
		},
		{
			id: "chorus",
			type: "chorus",
			titre: {
				texte: "Tout le monde décroche.",
				accent: "décroche.",
			},
			chute: {
				texte: "Personne ne note.",
				accent: "ne note.",
			},
			bulles: ["C'est pour quand ?", "Vous avez mon nom ?", "On était quatre.", "Je rappelle plus tard."],
			voix: "Tout le monde décroche, personne ne note.",
		},
		{
			id: "rupture",
			type: "rupture",
			texte: {
				texte: "Et si les réservations arrivaient toutes seules ?",
				accent: "toutes seules ?",
			},
			voix: "Et si les réservations arrivaient toutes seules ?",
		},
		{
			id: "revelation",
			type: "revelation",
			slogan: {
				texte: "Vos réservations, sans le téléphone.",
				accent: "sans le téléphone.",
			},
			signature: "Le service reste calme.",
			voix: "Voici Tablée. Vos réservations, sans le téléphone.",
		},
		{
			id: "etape-reserver",
			type: "etape",
			onglet: "Réserver",
			filigrane: "RÉSERVER",
			titre: {
				texte: "Le client réserve en ligne.",
				accent: "en ligne.",
			},
			texte: "Un lien sur Google, Instagram ou votre site.",
			visuel: {
				type: "capture",
				capture: "accueil",
				cadrage: "haut",
			},
			voix: "Vos clients réservent en ligne, depuis Google ou Instagram, en trente secondes.",
		},
		{
			id: "etape-confirmer",
			type: "etape",
			onglet: "Confirmer",
			filigrane: "CONFIRMER",
			titre: {
				texte: "Tout est confirmé pour vous.",
				accent: "pour vous.",
			},
			texte: "Un message part la veille et le jour même.",
			visuel: {
				type: "liste",
				titre: "Rappels",
				elements: ["Confirmation envoyée", "Rappel la veille", "Table attribuée"],
			},
			voix: "La confirmation et le rappel partent tout seuls.",
		},
		{
			id: "etape-servir",
			type: "etape",
			onglet: "Servir",
			filigrane: "SERVIR",
			titre: {
				texte: "Votre salle, d'un coup d'œil.",
				accent: "d'un coup d'œil.",
			},
			visuel: {
				type: "capture",
				capture: "salle",
				cadrage: "milieu",
				focus: {
					x: 0.55,
					y: 0.3,
					largeur: 0.3,
					hauteur: 0.35,
				},
			},
			voix: "Pendant le service, toute votre salle tient sur un seul écran, à jour en direct.",
		},
		{
			id: "resultat",
			type: "resultat",
			titre: {
				texte: "Le service reste calme.",
				accent: "calme.",
			},
			avant: "Appel manqué",
			tampon: "Réservé",
			apres: "Table pleine",
			chute: {
				texte: "Samedi prochain : complet.",
				accent: "complet.",
			},
			voix: "Résultat : moins d'appels, et plus de tables pleines.",
		},
		{
			id: "appel",
			type: "appel",
			question: {
				texte: "Encore un samedi au téléphone ?",
				accent: "au téléphone ?",
			},
			badge: {
				texte: "Premier mois offert",
				accent: "offert",
			},
			action: "Essayez.",
			bouton: "Ouvrir mon carnet en ligne",
			voix: "Encore un samedi au téléphone ? Le premier mois est offert. Essayez.",
		},
		{
			id: "fin",
			type: "fin",
			slogan: "Le service reste calme.",
			bouton: "Essayer Tablée",
			liens: ["tablee.example"],
			voix: "Tablée. Le service reste calme.",
		},
	],
};
