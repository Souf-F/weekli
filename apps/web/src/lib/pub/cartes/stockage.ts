// Images et logo importes : conservees dans IndexedDB, jamais envoyees au serveur (design.md 8.11).
// Cle : "<idPub>/<idMedia>" ; le logo porte l'id "logo".

export type GenreMedia = "image" | "logo";

export type Media = {
	cle: string;
	genre: GenreMedia;
	nom: string;
	type: string; // type MIME
	blob: Blob;
	ajoute: number; // horodatage ms
};

export type Stockage = {
	enregistrer(cle: string, genre: GenreMedia, nom: string, blob: Blob): Promise<void>;
	lire(cle: string): Promise<Media | undefined>;
	lister(prefixe: string): Promise<Media[]>;
	supprimer(cle: string): Promise<void>;
	supprimerPrefixe(prefixe: string): Promise<void>;
	fermer(): void;
};

const BASE = "weekli-pub";
const MAGASIN = "medias";

export const cleMedia = (idPub: string, idMedia: string) => `${idPub}/${idMedia}`;

const promesse = <T>(req: IDBRequest<T>): Promise<T> =>
	new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error("Erreur IndexedDB"));
	});

const termine = (tx: IDBTransaction): Promise<void> =>
	new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("Erreur IndexedDB"));
		tx.onabort = () => reject(tx.error ?? new Error("Transaction IndexedDB annulee"));
	});

// Borne haute exclusive d'un prefixe de cles (tous les caracteres suivants le prefixe)
const plage = (prefixe: string) => IDBKeyRange.bound(prefixe, `${prefixe}￿`);

export async function ouvrirStockage(nomBase = BASE): Promise<Stockage> {
	if (typeof indexedDB === "undefined") throw new Error("IndexedDB indisponible dans ce navigateur");
	const ouverture = indexedDB.open(nomBase, 1);
	ouverture.onupgradeneeded = () => ouverture.result.createObjectStore(MAGASIN, { keyPath: "cle" });
	const db = await promesse(ouverture);

	const magasin = (mode: IDBTransactionMode) => {
		const tx = db.transaction(MAGASIN, mode);
		return { tx, store: tx.objectStore(MAGASIN) };
	};

	return {
		async enregistrer(cle, genre, nom, blob) {
			const { tx, store } = magasin("readwrite");
			store.put({ cle, genre, nom, type: blob.type, blob, ajoute: Date.now() } satisfies Media);
			await termine(tx);
		},
		lire: (cle) => promesse<Media | undefined>(magasin("readonly").store.get(cle)),
		lister: (prefixe) => promesse<Media[]>(magasin("readonly").store.getAll(plage(prefixe))),
		async supprimer(cle) {
			const { tx, store } = magasin("readwrite");
			store.delete(cle);
			await termine(tx);
		},
		async supprimerPrefixe(prefixe) {
			const { tx, store } = magasin("readwrite");
			store.delete(plage(prefixe));
			await termine(tx);
		},
		fermer: () => db.close(),
	};
}
