import type { Domaine } from "./domaines";

// Validation de l'adresse a capturer, separee de la capture pour etre testable hors du runtime Workers

export class ErreurCapture extends Error {}

export function verifierUrl(brute: string, domaines: Domaine[]): URL {
	let url: URL;
	try {
		url = new URL(brute);
	} catch {
		throw new ErreurCapture("Adresse invalide.");
	}
	if (url.protocol !== "https:") throw new ErreurCapture("Seules les adresses https sont acceptées.");
	if (url.username || url.password || url.port) throw new ErreurCapture("Adresse refusée (identifiants ou port).");
	if (!domaines.some((d) => d.hote === url.hostname)) {
		throw new ErreurCapture(`Le domaine ${url.hostname} n'est pas vérifié. Vérifie-le d'abord dans les réglages.`);
	}
	return url;
}
