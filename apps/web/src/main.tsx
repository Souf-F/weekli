import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/fonts.css";
import "./styles/global.css";

// Recette en developpement sans session GitHub : VITE_DEMO=1 installe un faux serveur (retire du build)
async function demarrer() {
	if (import.meta.env.DEV && import.meta.env.VITE_DEMO === "1") (await import("./lib/demo/installer")).installerDemo();
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
void demarrer();
