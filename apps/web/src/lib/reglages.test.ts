import { afterEach, describe, expect, it, vi } from "vitest";
import { BASES_INDEXEDDB, CLE_DERNIER_REPO, effacerDonneesLocales } from "./reglages";

function faux(): Storage {
	const m = new Map<string, string>();
	return {
		getItem: (k) => m.get(k) ?? null,
		setItem: (k, v) => void m.set(k, v),
		removeItem: (k) => void m.delete(k),
		clear: () => m.clear(),
		key: () => null,
		get length() {
			return m.size;
		},
	};
}

function fauxIndexedDB(supprimees: string[], echec?: string) {
	return {
		deleteDatabase(nom: string) {
			const req: Record<string, unknown> = { error: new Error("refus") };
			queueMicrotask(() => {
				if (nom === echec) (req.onerror as () => void)();
				else {
					supprimees.push(nom);
					(req.onsuccess as () => void)();
				}
			});
			return req;
		},
	};
}

afterEach(() => vi.unstubAllGlobals());

describe("effacerDonneesLocales", () => {
	it("vide les deux stockages et supprime les bases IndexedDB de Weekli", async () => {
		const local = faux();
		const session = faux();
		for (const k of ["weekli.cle", "weekli.prefs", CLE_DERNIER_REPO, "autre"]) local.setItem(k, "x");
		session.setItem("weekli.cle", "x");
		const supprimees: string[] = [];
		vi.stubGlobal("localStorage", local);
		vi.stubGlobal("sessionStorage", session);
		vi.stubGlobal("indexedDB", fauxIndexedDB(supprimees));

		await effacerDonneesLocales();

		expect(local.getItem("weekli.cle")).toBeNull();
		expect(local.getItem("weekli.prefs")).toBeNull();
		expect(local.getItem(CLE_DERNIER_REPO)).toBeNull();
		expect(local.getItem("autre")).toBe("x");
		expect(session.getItem("weekli.cle")).toBeNull();
		expect(supprimees.sort()).toEqual([...BASES_INDEXEDDB].sort());
	});

	it("tente tout puis signale l'echec d'une base", async () => {
		const local = faux();
		local.setItem(CLE_DERNIER_REPO, "x");
		const supprimees: string[] = [];
		vi.stubGlobal("localStorage", local);
		vi.stubGlobal("sessionStorage", faux());
		vi.stubGlobal("indexedDB", fauxIndexedDB(supprimees, "weekli-pub"));

		await expect(effacerDonneesLocales()).rejects.toThrow("weekli-pub");
		expect(local.getItem(CLE_DERNIER_REPO)).toBeNull();
		expect(supprimees).toEqual(["weekli-voix"]);
	});
});
