import { describe, expect, it, vi } from "vitest";
import wrangler from "../../../wrangler.jsonc?raw";
import { jeton, domainesRevalides, ecrireDomaines, lireDomaines, valeurAttendue } from "../domaines";
import { MOTIFS_SENSIBLES, SCRIPT_FLOU } from "../flou";
import { pageConsentement, pageErreur } from "../pages";
import { verifierConfiguration } from "../securite";
import { estDomaineVerifie } from "../url-capture";

const SECRET = "a".repeat(64);
const domaines = [{ hote: "monsite.dev", verifie: "" }];

describe("estDomaineVerifie", () => {
	it("accepte une page https d'un domaine verifie", () =>
		expect(estDomaineVerifie("https://monsite.dev/a?b=1", domaines)).toBe(true));
	it.each([
		"http://monsite.dev",
		"https://autre.dev",
		"https://monsite.dev.pirate.dev",
		"about:blank",
		"",
		"chrome-error://chromewebdata/",
	])("refuse %s", (u) => expect(estDomaineVerifie(u, domaines)).toBe(false));
});

describe("flou", () => {
	const masque = (texte: string) => MOTIFS_SENSIBLES.some((m) => ((m.lastIndex = 0), m.test(texte)));
	it.each([
		"contact : jean.dupont@exemple.fr",
		"serveur 192.168.1.20",
		"ipv6 2001:db8:85a3:0:0:8a2e:370:7334",
		"tel +33 6 12 34 56 78",
		"tel 06.12.34.56.78",
		"ghp_" + "a".repeat(30),
	])("masque %s", (t) => expect(masque(t)).toBe(true));
	it.each(["Bonjour tout le monde", "Version 2.4", "En 2026"])("laisse %s", (t) => expect(masque(t)).toBe(false));

	it("produit un script JavaScript valide qui retire les cadres, parcourt le shadow DOM et masque les champs", () => {
		expect(() => new Function(SCRIPT_FLOU)).not.toThrow();
		expect(SCRIPT_FLOU).toContain("iframe");
		expect(SCRIPT_FLOU).toContain("shadowRoot");
		expect(SCRIPT_FLOU).toContain("textarea");
		expect(SCRIPT_FLOU).toContain("contenteditable");
	});
});

describe("verifierConfiguration", () => {
	const env = (cle?: string) => ({ COOKIE_ENCRYPTION_KEY: cle }) as unknown as Env;
	it("accepte une cle de 64 caracteres", () => expect(verifierConfiguration(env(SECRET))).toBeNull());
	it.each([undefined, "", "court", "a".repeat(31)])("refuse la cle %j", (cle) => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		expect(verifierConfiguration(env(cle))?.status).toBe(500);
	});
});

describe("pages du Worker", () => {
	it("la page de consentement n'autorise ni style ni script inline hors nonce", async () => {
		const r = pageConsentement(
			{ clientName: "App", clientDomain: "app.dev", redirectHost: "app.dev", redirectIsLoopback: false } as never,
			"h",
			new Headers(),
		);
		const csp = r.headers.get("Content-Security-Policy") ?? "";
		const nonce = /style-src 'nonce-([^']+)'/.exec(csp)?.[1];
		expect(csp).not.toContain("unsafe-inline");
		expect(csp).toContain(`script-src 'nonce-${nonce}'`);
		expect(await r.text()).toContain(`<style nonce="${nonce}">`);
	});

	it("la page d'erreur a son propre nonce de style et aucun script", async () => {
		const r = pageErreur("oups");
		const csp = r.headers.get("Content-Security-Policy") ?? "";
		const nonce = /style-src 'nonce-([^']+)'/.exec(csp)?.[1];
		expect(csp).not.toContain("unsafe-inline");
		expect(csp).not.toContain("script-src");
		expect(await r.text()).toContain(`<style nonce="${nonce}">`);
	});
});

describe("domainesRevalides", () => {
	const JOUR = 24 * 3600 * 1000;
	function faux() {
		const donnees = new Map<string, string>();
		return {
			OAUTH_KV: {
				get: async (k: string) => donnees.get(k) ?? null,
				put: async (k: string, v: string) => void donnees.set(k, v),
				delete: async (k: string) => void donnees.delete(k),
			},
			COOKIE_ENCRYPTION_KEY: SECRET,
		} as unknown as Env;
	}
	const avant = (jours: number) => new Date(Date.now() - jours * JOUR).toISOString();

	// Simule le fichier de preuve : present ou non selon l'hote
	function simulerPreuve(hotesAvecPreuve: string[], attendu: Record<string, string>) {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (entree: URL | string) => {
				const url = new URL(String(entree));
				if (url.hostname === "cloudflare-dns.com") return new Response(JSON.stringify({}), { status: 200 });
				return hotesAvecPreuve.includes(url.hostname)
					? new Response(attendu[url.hostname], { status: 200 })
					: new Response("", { status: 404 });
			}),
		);
	}

	it("ne reverifie rien quand les preuves ont moins de 7 jours", async () => {
		const env = faux();
		const fetchEspion = vi.fn();
		vi.stubGlobal("fetch", fetchEspion);
		await ecrireDomaines(env, "souf", [{ hote: "a.dev", verifie: avant(3) }]);
		expect(await domainesRevalides(env, "souf")).toHaveLength(1);
		expect(fetchEspion).not.toHaveBeenCalled();
	});

	it("garde et rafraichit un domaine dont la preuve est toujours la, retire les autres", async () => {
		const env = faux();
		const attendu = {
			"garde.dev": valeurAttendue(await jeton(SECRET, "souf", "garde.dev")),
			"perdu.dev": valeurAttendue(await jeton(SECRET, "souf", "perdu.dev")),
		};
		simulerPreuve(["garde.dev"], attendu);
		await ecrireDomaines(env, "souf", [
			{ hote: "garde.dev", verifie: avant(10) },
			{ hote: "perdu.dev", verifie: avant(10) },
			{ hote: "recent.dev", verifie: avant(1) },
		]);

		const liste = await domainesRevalides(env, "souf");
		expect(liste.map((d) => d.hote)).toEqual(["garde.dev", "recent.dev"]);
		expect(Date.now() - Date.parse(liste[0].verifie)).toBeLessThan(60_000);
		expect((await lireDomaines(env, "souf")).map((d) => d.hote)).toEqual(["garde.dev", "recent.dev"]);
		vi.unstubAllGlobals();
	});
});

describe("wrangler.jsonc", () => {
	// Fichier JSONC : on retire les lignes de commentaire avant l'analyse
	const config = JSON.parse(
		wrangler
			.split("\n")
			.filter((l: string) => !/^\s*(\/\/|\/?\*)/.test(l))
			.join("\n"),
	);

	it("borne le CPU par requete", () => expect(config.limits?.cpu_ms).toBeLessThanOrEqual(5000));

	it("envoie les chemins commencant par un point au Worker (404) au lieu du repli SPA", () => {
		expect(config.assets.run_worker_first).toContain("/.*");
		expect(config.assets.not_found_handling).toBe("single-page-application");
	});
});
