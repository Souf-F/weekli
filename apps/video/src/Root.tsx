import { Composition } from "remotion";
import { VideoProjet } from "./compositions/VideoProjet";
import { dimensions, dureeTotale } from "./temps";
import { IPS } from "./theme";
import type { Script } from "./types";

// Script d'exemple pour le studio Remotion ; en production, produire.mjs passe le vrai script en props
const exemple: Script = {
	titre: "Exemple",
	projet: "weekli",
	format: "portrait",
	ambiance: "energique",
	segments: [
		{ id: "a", voix: "Ton code de la semaine, raconté sur LinkedIn.", duree: 2.5, visuel: { type: "accroche", texte: "Ton code, *raconté.*" } },
		{ id: "b", voix: "Voici Weekli.", duree: 1.5, visuel: { type: "revelation", nom: "Weekli", slogan: "De GitHub à LinkedIn" } },
	],
};

// Les deux formats du skill partagent le meme moteur : seule l'ambiance et le contenu changent
export function Racine() {
	return (
		<>
			{(["Presentation", "Histoire"] as const).map((id) => (
				<Composition
					key={id}
					id={id}
					component={VideoProjet}
					fps={IPS}
					width={1080}
					height={1350}
					durationInFrames={300}
					defaultProps={{ script: exemple }}
					calculateMetadata={({ props }) => ({
						durationInFrames: dureeTotale(props.script),
						...dimensions(props.script),
					})}
				/>
			))}
		</>
	);
}
