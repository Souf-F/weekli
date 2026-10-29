// Cache IndexedDB des fichiers vocaux : une entrée par rôle (modèle, voix, espeak), remplacée quand l'empreinte change.
// Rien de personnel n'y est stocké : seulement des fichiers publics servis par Weekli.

const BASE = "weekli-voix";
const MAGASIN = "fichiers";

interface Entree {
	role: string;
	sha256: string;
	donnees: ArrayBuffer;
}

function ouvrir(): Promise<IDBDatabase> {
	return new Promise((resoudre, rejeter) => {
		const requete = indexedDB.open(BASE, 1);
		requete.onupgradeneeded = () => requete.result.createObjectStore(MAGASIN, { keyPath: "role" });
		requete.onsuccess = () => resoudre(requete.result);
		requete.onerror = () => rejeter(requete.error ?? new Error("IndexedDB indisponible"));
	});
}

function transaction<T>(mode: IDBTransactionMode, action: (magasin: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return ouvrir().then(
		(base) =>
			new Promise<T>((resoudre, rejeter) => {
				const tx = base.transaction(MAGASIN, mode);
				const requete = action(tx.objectStore(MAGASIN));
				tx.oncomplete = () => {
					base.close();
					resoudre(requete.result);
				};
				tx.onerror = tx.onabort = () => {
					base.close();
					rejeter(tx.error ?? new Error("Transaction IndexedDB annulée"));
				};
			}),
	);
}

/** Renvoie le fichier en cache s'il a l'empreinte attendue, sinon null (cache absent ou périmé). */
export async function lireCache(role: string, sha256: string): Promise<ArrayBuffer | null> {
	const entree = (await transaction("readonly", (m) => m.get(role))) as Entree | undefined;
	return entree?.sha256 === sha256 ? entree.donnees : null;
}

export async function ecrireCache(role: string, sha256: string, donnees: ArrayBuffer): Promise<void> {
	const entree: Entree = { role, sha256, donnees };
	await transaction("readwrite", (m) => m.put(entree));
}

/** Vide le cache (utilisé par la page d'essai pour mesurer un premier chargement). */
export async function viderCache(): Promise<void> {
	await transaction("readwrite", (m) => m.clear());
}
