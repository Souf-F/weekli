import { jetonGec, TOKEN_CLIENT } from "./voix-gec";

// Voix off Microsoft (ADR voix, changelog 2026-10-25) : meme protocole que edge-tts, sans compte Azure.
// Usage non officiel : si Microsoft refuse ou coupe le service, la route renvoie 502 et le front bascule sur Kokoro.
export const VOIX = "fr-FR-VivienneMultilingualNeural";
export const TEXTE_MAX = 400;
export const PHRASES_PAR_HEURE = 60;

// A mettre a jour avec edge-tts (constants.py) si le service refuse la version
const VERSION_CHROMIUM = "143.0.3650.75";
const ORIGINE = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";
const URL_SERVICE = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const DELAI_MS = 15_000;
const AUDIO_MAX = 2 * 1024 * 1024;

export class ErreurVoix extends Error {}

const hex = (octets: ArrayBuffer | Uint8Array) =>
	[...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, "0")).join("");
const identifiant = () => crypto.randomUUID().replaceAll("-", "");
const horodatage = () => new Date().toUTCString().replace("GMT", "GMT+0000 (Coordinated Universal Time)");
// Seuls &, <, > sont a echapper dans un contenu SSML ; les caracteres de controle sont retires
const echapper = (t: string) =>
	[...t]
		.filter((c) => c >= " " && c !== "\x7f")
		.join("")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");

// Une trame audio binaire : 2 octets de longueur d'en-tete (big-endian), l'en-tete texte, puis les octets MP3
function extraireAudio(trame: ArrayBuffer): Uint8Array | null {
	const vue = new DataView(trame);
	if (trame.byteLength < 2) return null;
	const debut = 2 + vue.getUint16(0);
	const entete = new TextDecoder().decode(trame.slice(2, debut));
	return entete.includes("Path:audio") ? new Uint8Array(trame.slice(debut)) : null;
}

// Renvoie le MP3 de la phrase. Seul le texte de la phrase est transmis a Microsoft, jamais l'identite de l'utilisateur.
export async function synthetiser(texte: string): Promise<Uint8Array<ArrayBuffer>> {
	const url = `${URL_SERVICE}?TrustedClientToken=${TOKEN_CLIENT}&ConnectionId=${identifiant()}&Sec-MS-GEC=${jetonGec(Date.now() / 1000)}&Sec-MS-GEC-Version=2-${VERSION_CHROMIUM}`;
	const reponse = await fetch(url, {
		headers: {
			Upgrade: "websocket",
			Origin: ORIGINE,
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
			"Accept-Language": "en-US,en;q=0.9",
			Cookie: `muid=${hex(crypto.getRandomValues(new Uint8Array(16))).toUpperCase()};`,
		},
	});
	const ws = reponse.webSocket;
	if (!ws) throw new ErreurVoix(`connexion refusee (${reponse.status})`);
	ws.accept();

	return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
		const morceaux: Uint8Array[] = [];
		let taille = 0;
		let fini = false;
		const finir = (erreur?: ErreurVoix) => {
			if (fini) return;
			fini = true;
			clearTimeout(minuteur);
			try {
				ws.close(1000);
			} catch {
				// deja ferme
			}
			if (erreur) return reject(erreur);
			if (taille === 0) return reject(new ErreurVoix("aucun audio recu"));
			const audio = new Uint8Array(taille);
			let decalage = 0;
			for (const m of morceaux) (audio.set(m, decalage), (decalage += m.length));
			resolve(audio);
		};
		const minuteur = setTimeout(() => finir(new ErreurVoix("delai depasse")), DELAI_MS);

		ws.addEventListener("message", (evenement) => {
			const { data } = evenement;
			if (typeof data === "string") {
				if (data.includes("Path:turn.end")) finir();
				return;
			}
			const audio = extraireAudio(data as ArrayBuffer);
			if (!audio) return;
			taille += audio.length;
			if (taille > AUDIO_MAX) return finir(new ErreurVoix("audio trop volumineux"));
			morceaux.push(audio);
		});
		ws.addEventListener("error", () => finir(new ErreurVoix("erreur de connexion")));
		ws.addEventListener("close", () => finir(new ErreurVoix("connexion fermee avant la fin")));

		ws.send(
			`X-Timestamp:${horodatage()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
				`{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`,
		);
		ws.send(
			`X-RequestId:${identifiant()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${horodatage()}Z\r\nPath:ssml\r\n\r\n` +
				`<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'><voice name='${VOIX}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${echapper(texte)}</prosody></voice></speak>`,
		);
	});
}

// Cache partage, 30 jours seulement : borne le volume stocke dans KV par les phrases de tous les comptes
const CACHE_SECONDES = 60 * 60 * 24 * 30;

// Cache partage : l'audio ne depend que de (voix, texte), il n'est lie a aucun compte
export async function cleCache(texte: string) {
	return `voix:${hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${VOIX}\n${texte}`)))}`;
}

export const lireCache = (env: Env, cle: string) => env.OAUTH_KV.get(cle, "arrayBuffer");
export const ecrireCache = (env: Env, cle: string, audio: Uint8Array) =>
	env.OAUTH_KV.put(cle, audio, { expirationTtl: CACHE_SECONDES });

// Compteur par utilisateur et par heure. Lecture puis ecriture non atomiques : une rafale simultanee peut depasser la
// limite de quelques phrases, ce qui est sans consequence ici (le plafond protege Microsoft, pas un quota payant).
export async function reserverPhrase(env: Env, id: string): Promise<boolean> {
	const cle = `voix-quota:${id}:${Math.floor(Date.now() / 3_600_000)}`;
	const utilise = Number.parseInt((await env.OAUTH_KV.get(cle)) ?? "0", 10) || 0;
	if (utilise >= PHRASES_PAR_HEURE) return false;
	await env.OAUTH_KV.put(cle, String(utilise + 1), { expirationTtl: 2 * 3600 });
	return true;
}
