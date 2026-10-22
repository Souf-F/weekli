// Chiffrement AES-256-GCM des donnees sensibles stockees dans KV (sessions, token GitHub).
// La cle est derivee de COOKIE_ENCRYPTION_KEY par HKDF, avec un contexte par usage :
// une fuite de KV seule ne revele aucun token.

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();

async function deriver(secret: string, usage: string) {
	const base = await crypto.subtle.importKey("raw", encodeur.encode(secret), "HKDF", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{ name: "HKDF", hash: "SHA-256", salt: encodeur.encode("weekli"), info: encodeur.encode(usage) },
		base,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

const versBase64 = (o: Uint8Array) => btoa(String.fromCharCode(...o));
const depuisBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function chiffrer(secret: string, usage: string, valeur: unknown): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cle = await deriver(secret, usage);
	const chiffre = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, encodeur.encode(JSON.stringify(valeur)));
	return `${versBase64(iv)}.${versBase64(new Uint8Array(chiffre))}`;
}

// Renvoie null si la donnee est alteree, tronquee ou chiffree avec une autre cle
export async function dechiffrer<T>(secret: string, usage: string, donnee: string): Promise<T | null> {
	try {
		const [iv, corps] = donnee.split(".");
		const cle = await deriver(secret, usage);
		const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv: depuisBase64(iv) }, cle, depuisBase64(corps));
		return JSON.parse(decodeur.decode(clair)) as T;
	} catch {
		return null;
	}
}
