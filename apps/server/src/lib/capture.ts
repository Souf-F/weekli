import { connectBrowser } from "agents/browser";
import type { Domaine } from "./domaines";
import { SCRIPT_FLOU } from "./flou";
import { ErreurCapture } from "./url-capture";

export { ErreurCapture, verifierUrl } from "./url-capture";

// Capture d'ecran d'un site verifie, pilotee en Chrome DevTools Protocol via Browser Run.
// Aucune image n'est stockee : elle est renvoyee directement.

export type Format = "bureau" | "mobile";

const FORMATS: Record<Format, { width: number; height: number; deviceScaleFactor: number; mobile: boolean }> = {
	bureau: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
	mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
};

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function capturer(env: Env, url: URL, format: Format, domaines: Domaine[]): Promise<string> {
	// Une redirection HTTP vers un autre domaine est refusee avant meme d'ouvrir le navigateur
	const sonde = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(8000) }).catch(
		() => null,
	);
	const vers = sonde?.headers.get("Location");
	if (sonde && sonde.status >= 300 && sonde.status < 400 && vers) {
		const cible = new URL(vers, url);
		if (cible.protocol !== "https:" || !domaines.some((d) => d.hote === cible.hostname)) {
			throw new ErreurCapture("La page redirige vers un domaine non vérifié.");
		}
	}

	const cdp = await connectBrowser(env.BROWSER, 30_000);
	let cible: string | undefined;
	try {
		const { targetId } = (await cdp.send("Target.createTarget", { url: "about:blank" })) as { targetId: string };
		cible = targetId;
		const sessionId = await cdp.attachToTarget(targetId);
		const envoyer = (methode: string, params: unknown = {}) =>
			cdp.send(methode, params, { sessionId, timeoutMs: 20_000 });

		await envoyer("Emulation.setDeviceMetricsOverride", FORMATS[format]);
		await envoyer("Page.enable");
		const nav = (await envoyer("Page.navigate", { url: url.href })) as { errorText?: string };
		if (nav.errorText) throw new ErreurCapture("La page n'a pas pu être chargée.");

		// Attente du chargement complet, puis d'un court temps pour les animations d'entree
		for (let i = 0; i < 30; i++) {
			const etat = (await envoyer("Runtime.evaluate", { expression: "document.readyState", returnByValue: true })) as {
				result: { value?: string };
			};
			if (etat.result.value === "complete") break;
			await attendre(500);
		}
		await attendre(1500);

		// Une redirection en JavaScript vers un autre domaine est refusee aussi
		const ici = (await envoyer("Runtime.evaluate", { expression: "location.href", returnByValue: true })) as {
			result: { value?: string };
		};
		const finale = new URL(ici.result.value ?? "about:blank");
		if (finale.protocol !== "https:" || !domaines.some((d) => d.hote === finale.hostname)) {
			throw new ErreurCapture("La page a quitté le domaine vérifié.");
		}

		await envoyer("Runtime.evaluate", { expression: SCRIPT_FLOU, returnByValue: true });
		await attendre(200);
		const image = (await envoyer("Page.captureScreenshot", { format: "jpeg", quality: 82 })) as { data: string };
		return image.data;
	} finally {
		if (cible) await cdp.send("Target.closeTarget", { targetId: cible }).catch(() => undefined);
		cdp.close();
	}
}
