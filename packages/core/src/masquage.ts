const MASQUE = "[secret masque]";

// Formats de jetons connus uniquement : pas de motif generique (entropie, "password="), trop de faux positifs sur du code
const SECRETS = new RegExp(
	[
		String.raw`\bgh[pousr]_[A-Za-z0-9]{36,}`,
		String.raw`\bgithub_pat_[A-Za-z0-9_]{22,}`,
		String.raw`\bsk-ant-[A-Za-z0-9_-]{20,}`,
		String.raw`\bsk-[A-Za-z0-9_-]{32,}`,
		String.raw`\b[sr]k_live_[A-Za-z0-9]{24,}`,
		String.raw`\bAIza[A-Za-z0-9_-]{35}`,
		String.raw`\bnpm_[A-Za-z0-9]{36}`,
		String.raw`\bglpat-[A-Za-z0-9_-]{20,}`,
		String.raw`\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}`,
		String.raw`\bAKIA[0-9A-Z]{16}\b`,
		String.raw`\bxox[baprs]-[A-Za-z0-9-]{10,}`,
		String.raw`-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)`,
	].join("|"),
	"g",
);

// Une cle "sk-" sans chiffre est presque toujours un nom (sk-learn-...) : le chiffre est verifie ici, sans
// anticipation dans le motif (une anticipation relancee a chaque "sk-" rendait le masquage quadratique)
const remplacer = (trouve: string) => (trouve.startsWith("sk-") && !trouve.startsWith("sk-ant-") && !/\d/.test(trouve) ? trouve : MASQUE);

// Marge au-dela du plafond : un jeton a cheval sur la coupure est vu en entier avant d'etre masque
const MARGE = 256;

// Remplace les jetons reconnus par un marqueur. Le texte doit etre plafonne avant (voir masquerEtTronquer)
export const masquerSecrets = (texte: string): string => texte.replace(SECRETS, remplacer);

// Tronque AVANT de masquer : le cout du masquage est borne par le plafond, jamais par la taille de la source
export const masquerEtTronquer = (texte: string, plafond: number): string =>
	masquerSecrets(texte.slice(0, plafond + MARGE)).slice(0, plafond);
