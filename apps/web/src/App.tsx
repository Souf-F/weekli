import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MeshBackground } from "@/components/MeshBackground/MeshBackground";
import { Accueil } from "@/pages/Accueil/Accueil";

// L'app (et le SDK Anthropic qu'elle embarque) n'est chargee qu'a la premiere visite de /app
const AppLayout = lazy(() => import("@/layouts/AppLayout").then((m) => ({ default: m.AppLayout })));
const Tableau = lazy(() => import("@/pages/Tableau/Tableau").then((m) => ({ default: m.Tableau })));
const Reglages = lazy(() => import("@/pages/Reglages/Reglages").then((m) => ({ default: m.Reglages })));

export function App() {
	return (
		<BrowserRouter>
			<MeshBackground />
			<Suspense fallback={null}>
				<Routes>
					<Route path="/" element={<Accueil />} />
					<Route path="/app" element={<AppLayout />}>
						<Route index element={<Tableau />} />
						<Route path="reglages" element={<Reglages />} />
					</Route>
					<Route path="*" element={<Accueil />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}
