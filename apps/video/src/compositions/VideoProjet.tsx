import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Pellicule, SousTitres, useUnite } from "../composants/base";
import { Monde3D } from "../composants/monde3d";
import { Scene, scenesSombres } from "../composants/scenes";
import { Eclat, effet, type NomEffet } from "../composants/transitions";
import { debuts, imagesSegment } from "../temps";
import { C, IPS, MONO, TRANSITION } from "../theme";
import type { Script, Visuel } from "../types";

// Les transitions tournent pour garder du rythme ; certaines scenes ont leur entree attitree
const CYCLE: NomEffet[] = ["pivot", "eclatement", "bascule", "plongee", "iris"];
const ENTREES: Partial<Record<Visuel["type"], NomEffet>> = { revelation: "plongee", appel: "iris", citation: "iris" };
const choisir = (type: Visuel["type"], i: number) => ENTREES[type] ?? CYCLE[i % CYCLE.length];

// Image (relative au debut de la scene) ou le nom frappe l'ecran dans la scene de revelation
export const IMPACT = 8;

// Musique qui s'efface sous la voix (ducking), avec fondu d'entree et de sortie
function volumeMusique(frame: number, script: Script, total: number) {
	const starts = debuts(script);
	// 1 pendant la voix, 0 entre deux phrases, avec des rampes douces pour eviter les sauts de volume
	const parole = Math.max(
		0,
		...script.segments.map((s, i) => {
			const fin = starts[i] + (s.duree ?? 0) * IPS;
			return interpolate(frame, [starts[i] - 6, starts[i] + 4, fin, fin + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
		}),
	);
	const base = 0.32 - 0.2 * parole;
	const fondu = interpolate(frame, [0, 20, total - 60, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	return base * fondu;
}

function Marque({ projet, sombre }: { projet: string; sombre: boolean }) {
	const u = useUnite();
	return (
		<div style={{ position: "absolute", top: 54 * u, left: 90 * u, right: 90 * u, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 24 * u, letterSpacing: "0.14em", textTransform: "uppercase", color: sombre ? C.mokaClair : C.moka, opacity: 0.85 }}>
			<span>{projet}</span>
			{projet.toLowerCase() !== "weekli" && <span>Fait avec Weekli</span>}
		</div>
	);
}

// Secousse de camera breve et amortie apres un impact
function secousse(frame: number, impacts: number[]) {
	let x = 0;
	let y = 0;
	for (const debut of impacts) {
		const t = frame - debut;
		if (t < 0 || t > 18) continue;
		const amorti = Math.exp(-t / 5);
		x += Math.sin(t * 2.7) * 14 * amorti;
		y += Math.cos(t * 3.3) * 10 * amorti;
	}
	return `translate(${x}px, ${y}px)`;
}

export function VideoProjet({ script }: { script: Script }) {
	const frame = useCurrentFrame();
	const starts = debuts(script);
	const total = starts.at(-1)! + imagesSegment(script.segments.at(-1)!);
	const impacts = script.segments.flatMap((s, i) => (s.visuel.type === "revelation" ? [starts[i] + IMPACT] : []));

	return (
		<AbsoluteFill style={{ background: C.espresso }}>
			<Monde3D script={script} />

			<AbsoluteFill style={{ transform: secousse(frame, impacts) }}>
				<TransitionSeries>
					{script.segments.flatMap((s, i) => {
						const sombre = scenesSombres.includes(s.visuel.type);
						const sequence = (
							<TransitionSeries.Sequence key={s.id} durationInFrames={imagesSegment(s)}>
								<Scene visuel={s.visuel} />
								<Marque projet={script.projet} sombre={sombre} />
								<SousTitres texte={s.voix} duree={s.duree ?? 3} sombre={sombre} />
								{s.audio && <Audio src={staticFile(s.audio)} />}
							</TransitionSeries.Sequence>
						);
						if (i === script.segments.length - 1) return [sequence];
						const suivante = script.segments[i + 1].visuel.type;
						return [
							sequence,
							<TransitionSeries.Transition key={`${s.id}-t`} presentation={effet(choisir(suivante, i))} timing={linearTiming({ durationInFrames: TRANSITION })} />,
						];
					})}
				</TransitionSeries>
			</AbsoluteFill>

			{starts.slice(1).map((debut, i) => (
				<Eclat key={i} debut={debut} duree={TRANSITION} sombre={scenesSombres.includes(script.segments[i + 1].visuel.type)} />
			))}
			<Pellicule />

			{script.musique && <Audio src={staticFile(script.musique)} volume={(f) => volumeMusique(f, script, total)} />}
			{starts.slice(1).map((debut, i) => (
				<Sequence key={i} from={Math.max(debut - 6, 0)} durationInFrames={30}>
					<Audio src={staticFile("sfx/transition.wav")} volume={0.4} />
				</Sequence>
			))}
			{/* Montee de tension puis impact sur la revelation du nom */}
			{impacts.map((f) => (
				<Sequence key={`m${f}`} from={Math.max(0, f - 54)} durationInFrames={60}>
					<Audio src={staticFile("sfx/montee.wav")} volume={0.45} />
				</Sequence>
			))}
			{impacts.map((f) => (
				<Sequence key={`i${f}`} from={f} durationInFrames={75}>
					<Audio src={staticFile("sfx/impact.wav")} volume={0.7} />
				</Sequence>
			))}
			{frame < 2 && <AbsoluteFill style={{ background: C.espresso }} />}
		</AbsoluteFill>
	);
}
