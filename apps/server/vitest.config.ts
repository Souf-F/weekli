import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Sous Node, le module `cloudflare:workers` (runtime Workers) est remplace par un socle minimal pour les tests
// qui font tourner le vrai OAuthProvider
export default defineConfig({
	resolve: {
		alias: { "cloudflare:workers": fileURLToPath(new URL("./src/routes/__tests__/workers-socle.ts", import.meta.url)) },
	},
	test: { server: { deps: { inline: ["@cloudflare/workers-oauth-provider"] } } },
});
