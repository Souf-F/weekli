import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// En dev, Vite sert le front et relaie les routes dynamiques vers le Worker (wrangler dev).
// En Docker, API_URL pointe vers le service "server".
const cible = process.env.API_URL ?? "http://localhost:8788";
const routesWorker = ["/api", "/auth", "/mcp", "/authorize", "/token", "/register", "/callback", "/.well-known"];

export default defineConfig({
	plugins: [react()],
	resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
	server: {
		port: 5173,
		proxy: Object.fromEntries(routesWorker.map((r) => [r, { target: cible, changeOrigin: false }])),
	},
});
