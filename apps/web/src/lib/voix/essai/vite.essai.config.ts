// Configuration Vite de la page d'essai seule. Elle reprend celle du site et ajoute :
// - la CSP de production, lue dans public/_headers et envoyée en en-tête sur toutes les réponses
//   (une balise meta ne couvrirait pas le Worker, qui reçoit sa propre politique) ;
// - l'isolation cross-origin (COOP + COEP) pour mesurer onnxruntime-web en multithread.
// Lancement depuis apps/web : npx vite --config src/lib/voix/essai/vite.essai.config.ts
// puis ouvrir http://127.0.0.1:5173/src/lib/voix/essai/index.html
import { readFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vite";
import base from "../../../../vite.config";

const enTetes = readFileSync(new URL("../../../../public/_headers", import.meta.url), "utf8");
const csp = enTetes.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
if (!csp) throw new Error("CSP introuvable dans public/_headers");

export default mergeConfig(
	base,
	defineConfig({
		server: {
			host: "127.0.0.1",
			headers: {
				"Content-Security-Policy": csp,
				"Cross-Origin-Opener-Policy": "same-origin",
				"Cross-Origin-Embedder-Policy": "require-corp",
			},
		},
	}),
);
