// Chiffrement AES-256-GCM des donnees sensibles stockees dans KV (sessions, token GitHub).
// Les cles sont derivees de COOKIE_ENCRYPTION_KEY par HKDF, avec un contexte par usage :
// une fuite de KV seule ne revele aucun token.
// Format : `v1.<iv>.<corps>`. La version permet de changer d'algorithme ou de cle plus tard ; les donnees
// associees (AAD, en pratique la cle KV) lient le chiffre a son emplacement : recopie sous une autre cle, il ne s'ouvre plus.

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();

type Derivation = Parameters<SubtleCrypto["deriveKey"]>;

async function deriver(secret: string, usage: string, algo: Derivation[2], droits: Derivation[4]) {
	const base = await crypto.subtle.importKey("raw", encodeur.encode(secret), "HKDF", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{ name: "HKDF", hash: "SHA-256", salt: encodeur.encode("weekli"), info: encodeur.encode(usage) },
		base,
		algo,
		false,
		droits,
	);
}

const cleAes = (secret: string, usage: string) =>
	deriver(secret, usage, { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]);

// Cle de signature HMAC, derivee comme les cles de chiffrement : un contexte par usage
export const cleHmac = (secret: string, usage: string) =>
	deriver(secret, usage, { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign"]);

// Par blocs : String.fromCharCode(...octets) depasse la pile d'appels au-dela d'environ 125 Ko
const BLOC = 0x8000;
function versBase64(octets: Uint8Array): string {
	let binaire = "";
	for (let i = 0; i < octets.length; i += BLOC) binaire += String.fromCharCode(...octets.subarray(i, i + BLOC));
	return btoa(binaire);
}

const depuisBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const VERSION = "v1";

export async function chiffrer(secret: string, usage: string, valeur: unknown, aad: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cle = await cleAes(secret, usage);
	const chiffre = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv, additionalData: encodeur.encode(aad) },
		cle,
		encodeur.encode(JSON.stringify(valeur)),
	);
	return `${VERSION}.${versBase64(iv)}.${versBase64(new Uint8Array(chiffre))}`;
}

async function ouvrir<T>(secret: string, usage: string, iv: string, corps: string, aad?: string): Promise<T | null> {
	try {
		const cle = await cleAes(secret, usage);
		const params = { name: "AES-GCM", iv: depuisBase64(iv), ...(aad !== undefined && { additionalData: encodeur.encode(aad) }) };
		return JSON.parse(decodeur.decode(await crypto.subtle.decrypt(params, cle, depuisBase64(corps)))) as T;
	} catch {
		return null;
	}
}

// Renvoie null si la donnee est alteree, tronquee, chiffree avec une autre cle ou lue sous une autre cle KV
export function dechiffrer<T>(secret: string, usage: string, donnee: string, aad: string): Promise<T | null> {
	const [version, iv, corps, reste] = donnee.split(".");
	if (version !== VERSION || !iv || !corps || reste !== undefined) return Promise.resolve(null);
	return ouvrir<T>(secret, usage, iv, corps, aad);
}

// Format d'avant m14 (`<iv>.<corps>`, sans version ni AAD), lu uniquement par la migration d'identite.
// A supprimer avec elle (B14).
export function dechiffrerAncien<T>(secret: string, usage: string, donnee: string): Promise<T | null> {
	const [iv, corps, reste] = donnee.split(".");
	if (!iv || !corps || reste !== undefined) return Promise.resolve(null);
	return ouvrir<T>(secret, usage, iv, corps);
}
