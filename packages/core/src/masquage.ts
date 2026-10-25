const MASQUE = "[secret masque]";

// Formats de jetons connus uniquement : pas de motif generique (entropie, "password="), trop de faux positifs sur du code
const SECRETS = new RegExp(
	[
		String.raw`\bgh[pousr]_[A-Za-z0-9]{36,}`,
		String.raw`\bgithub_pat_[A-Za-z0-9_]{22,}`,
		String.raw`\bsk-ant-[A-Za-z0-9_-]{20,}`,
		String.raw`\bsk-(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{32,}`,
		String.raw`\bAKIA[0-9A-Z]{16}\b`,
		String.raw`\bxox[baprs]-[A-Za-z0-9-]{10,}`,
		String.raw`-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)`,
	].join("|"),
	"g",
);

// Remplace les jetons reconnus par un marqueur (a appliquer avant toute troncature, qui pourrait couper un jeton)
export const masquerSecrets = (texte: string): string => texte.replace(SECRETS, MASQUE);
