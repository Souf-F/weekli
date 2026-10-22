import { describe, expect, it } from "vitest";
import { ErreurCapture, verifierUrl } from "../url-capture";
import { jeton, normaliserHote } from "../domaines";

describe("normaliserHote", () => {
	it.each([
		["MonSite.dev", "monsite.dev"],
		["souf-f.github.io.", "souf-f.github.io"],
		["app.weekli.pages.dev", "app.weekli.pages.dev"],
	])("accepte %s", (e, s) => expect(normaliserHote(e)).toBe(s));

	it.each([
		"localhost",
		"127.0.0.1",
		"10.0.0.1",
		"intranet",
		"srv.local",
		"x.internal",
		"-a.com",
		"a..com",
		"a_b.com",
		"https://a.com",
		"a.com/x",
	])("refuse %s", (e) => expect(normaliserHote(e)).toBeNull());
});

describe("jeton", () => {
	it("est stable pour un meme couple et different sinon", async () => {
		const a = await jeton("s".repeat(64), "souf", "a.dev");
		expect(a).toMatch(/^[0-9a-f]{32}$/);
		expect(await jeton("s".repeat(64), "SOUF", "a.dev")).toBe(a);
		expect(await jeton("s".repeat(64), "autre", "a.dev")).not.toBe(a);
		expect(await jeton("t".repeat(64), "souf", "a.dev")).not.toBe(a);
	});
});

describe("verifierUrl", () => {
	const domaines = [{ hote: "monsite.dev", verifie: "" }];
	it("accepte une page https d'un domaine verifie", () => {
		expect(verifierUrl("https://monsite.dev/projets?x=1", domaines).hostname).toBe("monsite.dev");
	});
	it.each([
		"http://monsite.dev",
		"https://autre.dev",
		"https://sous.monsite.dev",
		"https://user:mdp@monsite.dev",
		"https://monsite.dev:8443",
		"file:///etc/passwd",
		"pas une url",
	])("refuse %s", (u) => expect(() => verifierUrl(u, domaines)).toThrow(ErreurCapture));
});
