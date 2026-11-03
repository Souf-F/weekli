// Reconnaissance du vrai format d'un fichier par ses premiers octets (le type MIME declare ne suffit pas).

export type TypeImage = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

export function detecterTypeImage(octets: Uint8Array): TypeImage | null {
	const o = octets;
	if (o.length >= 8 && o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47) return "image/png";
	if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "image/jpeg";
	if (o.length >= 12 && ascii(o, 0, 4) === "RIFF" && ascii(o, 8, 12) === "WEBP") return "image/webp";
	const debut = new TextDecoder().decode(o.subarray(0, 1024)).replace(/^﻿/, "").trimStart();
	if (/^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(debut)) return "image/svg+xml";
	return null;
}

const ascii = (o: Uint8Array, a: number, b: number) => String.fromCharCode(...o.subarray(a, b));
