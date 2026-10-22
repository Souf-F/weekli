// Transitions maison en 3D : chaque scene sort et entre dans l'espace (perspective, profondeur, flou de mouvement)
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";

export type NomEffet = "plongee" | "pivot" | "iris" | "bascule" | "eclatement";
type Props = { effet: NomEffet };

const lisse = Easing.bezier(0.7, 0, 0.2, 1);

// p va de 0 a 1 ; `entree` distingue la scene qui arrive de celle qui part
function style(effet: NomEffet, brut: number, entree: boolean): CSSProperties {
	const p = lisse(brut);
	const q = 1 - p;
	switch (effet) {
		// On traverse la scene : elle grossit et s'efface, la suivante arrive du fond
		case "plongee":
			return entree
				? { transform: `scale(${0.6 + 0.4 * p})`, filter: `blur(${q * 14}px)`, opacity: Math.min(1, p * 1.6) }
				: { transform: `scale(${1 + 0.9 * p})`, filter: `blur(${p * 18}px)`, opacity: 1 - p };
		// Rotation autour d'un axe vertical, comme une porte qui tourne
		case "pivot":
			return entree
				? { transform: `perspective(1600px) translateX(${q * 45}%) translateZ(${-q * 700}px) rotateY(${-q * 70}deg)`, opacity: Math.min(1, p * 2), filter: `blur(${q * 6}px)` }
				: { transform: `perspective(1600px) translateX(${-p * 45}%) translateZ(${-p * 700}px) rotateY(${p * 70}deg)`, opacity: 1 - p, filter: `blur(${p * 6}px)` };
		// Ouverture circulaire depuis le centre
		case "iris":
			return entree
				? { clipPath: `circle(${p * 120}% at 50% 55%)`, transform: `scale(${1.15 - 0.15 * p})` }
				: { transform: `scale(${1 - 0.12 * p})`, filter: `blur(${p * 10}px) brightness(${1 - 0.3 * p})` };
		// Bascule vers l'avant sur un axe horizontal
		case "bascule":
			return entree
				? { transform: `perspective(1400px) translateY(${q * 60}%) rotateX(${q * 55}deg) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 2), transformOrigin: "50% 100%" }
				: { transform: `perspective(1400px) translateY(${-p * 40}%) rotateX(${-p * 45}deg) scale(${1 - 0.1 * p})`, opacity: 1 - p, transformOrigin: "50% 0%" };
		// Volets diagonaux qui decoupent l'ecran
		case "eclatement":
			return entree
				? { clipPath: `polygon(0 0, ${p * 160}% 0, ${p * 160 - 60}% 100%, 0 100%)`, transform: `translateX(${q * 8}%)` }
				: { transform: `translateX(${-p * 18}%) scale(${1 - 0.08 * p})`, filter: `blur(${p * 8}px)`, opacity: 1 - p * 0.6 };
	}
}

function Presentation({ children, presentationDirection, presentationProgress, passedProps }: TransitionPresentationComponentProps<Props>) {
	return <AbsoluteFill style={style(passedProps.effet, presentationProgress, presentationDirection === "entering")}>{children}</AbsoluteFill>;
}

export const effet = (nom: NomEffet): TransitionPresentation<Props> => ({ component: Presentation, props: { effet: nom } });

// Eclat lumineux au milieu de chaque transition : halo, rayon diagonal et fuite de lumiere chaude
export function Eclat({ debut, duree, sombre }: { debut: number; duree: number; sombre: boolean }) {
	const frame = useCurrentFrame();
	const p = (frame - debut) / duree;
	if (p < -0.2 || p > 1.4) return null;
	const pic = interpolate(p, [-0.2, 0.45, 1.4], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
	const rayon = interpolate(p, [-0.2, 1.4], [-60, 160]);
	return (
		<AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
			<AbsoluteFill style={{ opacity: pic * (sombre ? 0.55 : 0.75), background: `radial-gradient(ellipse at 50% 50%, #ffffff 0%, ${C.lavande}aa 25%, transparent 65%)` }} />
			<AbsoluteFill
				style={{
					opacity: pic,
					background: `linear-gradient(115deg, transparent ${rayon - 14}%, ${C.platine}cc ${rayon - 2}%, #ffffff ${rayon}%, ${C.platine}cc ${rayon + 2}%, transparent ${rayon + 14}%)`,
					filter: "blur(18px)",
				}}
			/>
			<AbsoluteFill style={{ opacity: pic * 0.6, background: `radial-gradient(circle at ${100 - rayon * 0.4}% 110%, ${C.mokaClair} 0%, transparent 55%)` }} />
		</AbsoluteFill>
	);
}
