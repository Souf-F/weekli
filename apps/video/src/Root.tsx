import { Composition } from "remotion";
import { VideoProjet } from "./compositions/VideoProjet";
import { dimensions, dureeTotale } from "./temps";
import { IPS } from "./theme";
import type { Script } from "./types";

// Script d'exemple pour le studio Remotion ; en production, produire.mjs passe le vrai script en props
const exemple: Script = {
	titre: "Exemple",
	projet: "weekli",
	format: "paysage",
	ambiance: "energique",
	segments: [
		{ id: "a", voix: "Ton code de la semaine, raconté sur LinkedIn.", duree: 2.5, visuel: { type: "accroche", texte: "Ton code, *raconté.*" } },
		{ id: "b", voix: "Voici Weekli.", duree: 1.5, visuel: { type: "revelation", nom: "Weekli", slogan: "De GitHub à LinkedIn" } },
	],
};

export function Racine() {
	return (
		<Composition
			id="Presentation"
			component={VideoProjet}
			fps={IPS}
			width={1920}
			height={1080}
			durationInFrames={300}
			defaultProps={{ script: exemple }}
			calculateMetadata={({ props }: { props: { script: Script } }) => ({
				durationInFrames: dureeTotale(props.script),
				...dimensions(props.script),
			})}
		/>
	);
}
