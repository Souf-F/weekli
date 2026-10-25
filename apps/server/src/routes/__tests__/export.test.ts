import { describe, expect, it, vi } from "vitest";
import { ecrireBrouillons } from "../../lib/brouillons";
import { ajouterDomaine } from "../../lib/domaines";
import { creerPub } from "../../lib/pubs";
import { ecrireStyle } from "../../lib/style";
import { api } from "../api";
import { avecSessions, faux, SID } from "./aide";

vi.mock("../../lib/capture", () => ({ capturer: vi.fn(), ErreurCapture: class extends Error {}, verifierUrl: vi.fn() }));

const brouillon = (id: string, texte: string) => ({ id, titre: "t", format: "retour", source: "s", texte, cree: new Date().toISOString(), publie: false });
const GET = (env: Env, sid?: string) => api.request("/moi/donnees", { headers: sid ? { Cookie: `weekli=${sid}` } : {} }, env);

async function peupler(env: Env) {
	await avecSessions(env);
	for (const [id, nom] of [["1", "alice"], ["2", "bob"]]) {
		await ecrireBrouillons(env, id, [brouillon(`b-${nom}`, `Texte de ${nom}`)]);
		await creerPub(env, id, { version: 1, titre: `Pub de ${nom}`, projet: { nom: "N" }, scenes: [] } as never);
		await ecrireStyle(env, id, { profil: `Style de ${nom}`, exemples: "Exemple" });
		await ajouterDomaine(env, id, `${nom}.dev`);
	}
}

describe("GET /api/moi/donnees", () => {
	it("exporte le JSON complet du compte en telechargement", async () => {
		const { env } = faux();
		await peupler(env);
		const res = await GET(env, SID("b"));
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("application/json");
		expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="weekli-donnees.json"');
		const corps = (await res.json()) as Record<string, any>;
		expect(Object.keys(corps).sort()).toEqual(["brouillons", "conservation", "domaines", "exporte", "profil", "pubs", "style"]);
		expect(new Date(corps.exporte).toISOString()).toBe(corps.exporte);
		expect(corps.profil).toEqual({ id: "1", login: "alice", nom: "alice" });
		expect(corps.brouillons.map((b: { texte: string }) => b.texte)).toEqual(["Texte de alice"]);
		expect(corps.pubs).toHaveLength(1);
		expect(corps.pubs[0]).toMatchObject({ script: { titre: "Pub de alice" } });
		expect(corps.style).toMatchObject({ profil: "Style de alice", exemples: "Exemple" });
		expect(corps.domaines.map((d: { hote: string }) => d.hote)).toEqual(["alice.dev"]);
		expect(corps.conservation).toBe("90 jours apres la derniere modification");
	});

	it("n'exporte aucun token ni donnee d'un autre compte", async () => {
		const { env } = faux();
		await peupler(env);
		const texte = await (await GET(env, SID("b"))).text();
		expect(texte).not.toContain("gho_");
		expect(texte).not.toMatch(/token|jeton|avatar/i);
		expect(texte).not.toContain("bob");
	});

	it("exporte des collections vides pour un compte sans donnees", async () => {
		const { env } = faux();
		await avecSessions(env);
		const corps = (await (await GET(env, SID("b"))).json()) as Record<string, unknown>;
		expect(corps).toMatchObject({ brouillons: [], pubs: [], domaines: [], style: { exemples: "", profil: "", maj: null } });
	});

	it("refuse sans session (401) et respecte le debit (429)", async () => {
		const { env } = faux();
		await peupler(env);
		expect((await GET(env)).status).toBe(401);
		const limite = { ...env, LIMITE_API: { limit: async () => ({ success: false }) } } as unknown as Env;
		expect((await GET(limite, SID("b"))).status).toBe(429);
	});
});
