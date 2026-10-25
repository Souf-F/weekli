// Dictionnaire de prononciation : espeak-ng lit les mots anglais à l'anglaise (« GitHub » devient « ji eub »).
// Chaque entrée réécrit le mot en orthographe française ; les phonèmes obtenus sont vérifiés par prononciation.test.ts.
export const DICTIONNAIRE: Readonly<Record<string, string>> = {
	Weekli: "Ouikli",
	GitHub: "Guite-Heub",
	LinkedIn: "Linne-kédine",
	MCP: "Èm-cé-pé",
	API: "A-pé-i",
	IA: "I-A",
	Anthropic: "Anne-tropique",
	"Claude Code": "Clôde Code",
	"pull request": "poule-riquouest",
	"pull requests": "poule-riquouests",
	push: "pouche",
	"open source": "opène-source",
	"open-source": "opène-source",
	README: "Rid-mi",
	React: "Riacte",
	TypeScript: "Taïpe-scripte",
	JSON: "Djé-sonne",
	Python: "Païtonne",
	Rust: "Reusste",
	backend: "bakènnde",
	frontend: "frontènnde",
	feature: "fitcheur",
	features: "fitcheurs",
	Docker: "Dokeur",
	Cloudflare: "Claoude-flère",
	"Node.js": "Naude-djé-èsse",
	"Next.js": "Nekst-djé-èsse",
	SaaS: "Sasse",
	git: "guite",
};

const LETTRE = "\\p{L}\\p{N}";

function echapper(mot: string): string {
	return mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compiler(dictionnaire: Readonly<Record<string, string>>) {
	const cles = Object.keys(dictionnaire).sort((a, b) => b.length - a.length);
	if (cles.length === 0) return null;
	const parCle = new Map(cles.map((cle) => [cle.toLowerCase(), dictionnaire[cle]]));
	const motif = new RegExp(`(?<![${LETTRE}])(?:${cles.map(echapper).join("|")})(?![${LETTRE}])`, "giu");
	return { motif, parCle };
}

const PAR_DEFAUT = compiler(DICTIONNAIRE);

/**
 * Remplace les mots du dictionnaire (mots entiers, sans tenir compte de la casse).
 * Un dictionnaire propre au projet peut compléter celui de Weekli ; ses entrées passent devant.
 */
export function appliquerPrononciation(texte: string, complement: Readonly<Record<string, string>> = {}): string {
	const regles = Object.keys(complement).length ? compiler({ ...DICTIONNAIRE, ...complement }) : PAR_DEFAUT;
	if (!regles) return texte;
	return texte.replace(regles.motif, (trouve) => regles.parCle.get(trouve.toLowerCase()) ?? trouve);
}
