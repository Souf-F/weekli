import { describe, expect, it } from "vitest";
import { chiffrer, dechiffrer } from "../chiffrement";
import { ajouterEnTetes, verifierOrigine } from "../securite";
import { NOM_REPO, SHA } from "../validation";

const SECRET = "a".repeat(64);

describe("chiffrement", () => {
	const AAD = "session:abc";

	it("dechiffre ce qu'il a chiffre, avec un prefixe de version", async () => {
		const donnee = await chiffrer(SECRET, "session", { token: "gho_exemple" }, AAD);
		expect(donnee).not.toContain("gho_exemple");
		expect(donnee.startsWith("v1.")).toBe(true);
		expect(await dechiffrer(SECRET, "session", donnee, AAD)).toEqual({ token: "gho_exemple" });
	});

	it("refuse une autre cle, un autre usage ou une donnee alteree", async () => {
		const donnee = await chiffrer(SECRET, "session", { a: 1 }, AAD);
		expect(await dechiffrer("b".repeat(64), "session", donnee, AAD)).toBeNull();
		expect(await dechiffrer(SECRET, "autre", donnee, AAD)).toBeNull();
		expect(await dechiffrer(SECRET, "session", donnee.slice(0, -4) + "AAAA", AAD)).toBeNull();
		expect(await dechiffrer(SECRET, "session", "n'importe quoi", AAD)).toBeNull();
	});

	it("lie le chiffre a sa cle KV : recopie sous une autre cle, il ne s'ouvre plus", async () => {
		const donnee = await chiffrer(SECRET, "brouillons", { a: 1 }, "brouillons:1");
		expect(await dechiffrer(SECRET, "brouillons", donnee, "brouillons:2")).toBeNull();
	});

	it("refuse une version inconnue et le format sans version", async () => {
		const donnee = await chiffrer(SECRET, "s", 1, AAD);
		expect(await dechiffrer(SECRET, "s", donnee.replace("v1.", "v2."), AAD)).toBeNull();
		expect(await dechiffrer(SECRET, "s", donnee.slice(3), AAD)).toBeNull();
	});

	it("chiffre et dechiffre une charge de 1 Mo", async () => {
		const gros = { texte: "x".repeat(1_000_000) };
		expect(await dechiffrer(SECRET, "brouillons", await chiffrer(SECRET, "brouillons", gros, AAD), AAD)).toEqual(gros);
	});

	it("utilise un IV different a chaque fois", async () => {
		expect(await chiffrer(SECRET, "s", 1, AAD)).not.toBe(await chiffrer(SECRET, "s", 1, AAD));
	});
});

describe("validation", () => {
	it.each(["weekli", "scanner-ssl", "mon.repo_2"])("accepte le repo %s", (r) => expect(NOM_REPO.test(r)).toBe(true));
	it.each(["../etc", "a/b", "repo?x=1", "", "a".repeat(101)])("refuse le repo %s", (r) =>
		expect(NOM_REPO.test(r)).toBe(false),
	);
	it("valide les SHA", () => {
		expect(SHA.test("a1b2c3d")).toBe(true);
		expect(SHA.test("a1b2c3")).toBe(false);
		expect(SHA.test("zzzzzzz")).toBe(false);
	});
});

describe("verifierOrigine", () => {
	const req = (methode: string, chemin: string, origine?: string) =>
		new Request(`https://weekli.dev${chemin}`, { method: methode, headers: origine ? { Origin: origine } : {} });

	it("laisse passer les lectures", () => expect(verifierOrigine(req("GET", "/api/moi"))).toBeNull());
	it("laisse passer un POST du site", () =>
		expect(verifierOrigine(req("POST", "/auth/logout", "https://weekli.dev"))).toBeNull());
	it("bloque un POST venant d'un autre site", () =>
		expect(verifierOrigine(req("POST", "/auth/logout", "https://pirate.example"))?.status).toBe(403));
	it("bloque un POST sans origine sur une route du site", () =>
		expect(verifierOrigine(req("POST", "/authorize"))?.status).toBe(403));
	it("laisse /token aux clients MCP", () => expect(verifierOrigine(req("POST", "/token"))).toBeNull());
});

describe("ajouterEnTetes", () => {
	it("pose les en-tetes de securite et interdit le cache de l'API", () => {
		const r = ajouterEnTetes(new Response("ok"), new Request("https://weekli.dev/api/moi"));
		expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(r.headers.get("X-Frame-Options")).toBe("DENY");
		expect(r.headers.get("Strict-Transport-Security")).toContain("max-age");
		expect(r.headers.get("Cache-Control")).toBe("no-store");
	});
});
