import { chiffrer, cleHmac, dechiffrer } from "./chiffrement";
import { CONSERVATION_SECONDES } from "./conservation";

// Preuve de propriete d'un domaine avant toute capture : sans elle, Weekli pourrait servir
// a capturer le site de quelqu'un d'autre.

export type Domaine = { hote: string; verifie: string };

const MAX_DOMAINES = 10;
const USAGE = "domaines";
export const cleDomaines = (id: string) => `domaines:${id}`;
const FICHIER = "/.well-known/weekli-verification.txt";

// Nom d'hote public uniquement : pas d'IP, pas de localhost, pas de domaine interne
export function normaliserHote(entree: string): string | null {
	const hote = entree.trim().toLowerCase().replace(/\.$/, "");
	if (hote.length > 253 || !hote.includes(".")) return null;
	if (!/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(hote)) return null;
	if (/^\d+(\.\d+){3}$/.test(hote)) return null;
	if (/(^|\.)(localhost|local|internal|lan|home|test|invalid|example)$/.test(hote)) return null;
	return hote;
}

// Jeton deterministe : HMAC du couple (id GitHub numerique, hote), rien a stocker pour le retrouver
export async function jeton(secret: string, id: string, hote: string): Promise<string> {
	const k = await cleHmac(secret, `jeton:${USAGE}`);
	const sig = new Uint8Array(
		await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${id}:${hote}`)),
	);
	return Array.from(sig.slice(0, 16), (o) => o.toString(16).padStart(2, "0")).join("");
}

export const valeurAttendue = (j: string) => `weekli-verification=${j}`;
export const nomTxt = (hote: string) => `_weekli.${hote}`;
export const urlFichier = (hote: string) => `https://${hote}${FICHIER}`;

async function parDns(hote: string, attendu: string): Promise<boolean> {
	const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nomTxt(hote))}&type=TXT`;
	const res = await fetch(url, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) });
	if (!res.ok) return false;
	const corps = (await res.json()) as { Answer?: { data?: string }[] };
	return (corps.Answer ?? []).some((r) => (r.data ?? "").replace(/"/g, "").trim() === attendu);
}

async function parFichier(hote: string, attendu: string): Promise<boolean> {
	// Pas de redirection suivie, temps et taille limites : on ne lit que ce fichier, sur ce domaine
	const res = await fetch(urlFichier(hote), { redirect: "manual", signal: AbortSignal.timeout(5000) });
	if (res.status !== 200) return false;
	const texte = (await res.text()).slice(0, 1024);
	return texte.split(/\r?\n/).some((ligne) => ligne.trim() === attendu);
}

export async function verifier(hote: string, attendu: string): Promise<boolean> {
	const [dns, fichier] = await Promise.allSettled([parDns(hote, attendu), parFichier(hote, attendu)]);
	return (dns.status === "fulfilled" && dns.value) || (fichier.status === "fulfilled" && fichier.value);
}

export async function lireDomaines(env: Env, id: string): Promise<Domaine[]> {
	const donnee = await env.OAUTH_KV.get(cleDomaines(id));
	return (donnee && (await dechiffrer<Domaine[]>(env.COOKIE_ENCRYPTION_KEY, USAGE, donnee, cleDomaines(id)))) || [];
}

export async function ecrireDomaines(env: Env, id: string, domaines: Domaine[]) {
	await env.OAUTH_KV.put(cleDomaines(id), await chiffrer(env.COOKIE_ENCRYPTION_KEY, USAGE, domaines.slice(0, MAX_DOMAINES), cleDomaines(id)), {
		expirationTtl: CONSERVATION_SECONDES,
	});
}

// Un domaine dont la preuve date de plus de 7 jours est reverifie avant usage : si le proprietaire
// a change ou retire la preuve, il disparait de la liste au lieu de rester autorise 90 jours
const REVERIFICATION_MS = 7 * 24 * 3600 * 1000;

export async function domainesRevalides(env: Env, id: string): Promise<Domaine[]> {
	const domaines = await lireDomaines(env, id);
	const limite = Date.now() - REVERIFICATION_MS;
	if (!domaines.some((d) => Date.parse(d.verifie) < limite)) return domaines;

	const maintenant = new Date().toISOString();
	const liste = (
		await Promise.all(
			domaines.map(async (d) => {
				if (Date.parse(d.verifie) >= limite) return d;
				const preuve = valeurAttendue(await jeton(env.COOKIE_ENCRYPTION_KEY, id, d.hote));
				return (await verifier(d.hote, preuve)) ? { ...d, verifie: maintenant } : null;
			}),
		)
	).filter((d): d is Domaine => d !== null);
	await ecrireDomaines(env, id, liste);
	return liste;
}

export const supprimerDomaines = (env: Env, id: string) => env.OAUTH_KV.delete(cleDomaines(id));

export async function ajouterDomaine(env: Env, id: string, hote: string): Promise<Domaine[]> {
	const domaines = (await lireDomaines(env, id)).filter((d) => d.hote !== hote);
	if (domaines.length >= MAX_DOMAINES) throw new Error(`${MAX_DOMAINES} domaines au maximum`);
	const liste = [{ hote, verifie: new Date().toISOString() }, ...domaines];
	await ecrireDomaines(env, id, liste);
	return liste;
}
