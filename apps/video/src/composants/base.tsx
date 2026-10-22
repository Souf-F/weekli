import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO, SANS, SERIF } from "../theme";
import type { Icone as NomIcone } from "../types";

// Unite de mise en page : 1 = 1 px sur un portrait 1080 de large, s'adapte au paysage
export function useUnite() {
	const { width, height } = useVideoConfig();
	// Portrait : 1 ; paysage : un peu plus grand, la hauteur etant la contrainte
	return Math.min(width, height * 1.15) / 1080;
}

// Ressort d'entree commun, decale de `retard` images
export function useEntree(retard = 0, raideur = 120) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	return spring({ frame: frame - retard, fps, config: { damping: 18, stiffness: raideur, mass: 0.8 } });
}

// Pellicule posee sur toute la video : grain argentique anime et legere aberration de bord
export function Pellicule() {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{ pointerEvents: "none" }}>
			<AbsoluteFill
				style={{
					opacity: 0.09,
					mixBlendMode: "overlay",
					backgroundImage:
						"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
					transform: `translate(${((frame * 37) % 60) - 30}px, ${((frame * 23) % 60) - 30}px)`,
				}}
			/>
			<AbsoluteFill style={{ boxShadow: "inset 0 0 220px rgba(20,13,9,0.35)" }} />
		</AbsoluteFill>
	);
}

// Texte cinetique : chaque mot monte et se net en cascade ; les *mots entre etoiles* passent en italique moka
export function Mots({
	texte,
	taille,
	retard = 0,
	cadence = 3,
	style,
	couleur = C.espresso,
	serif = true,
}: {
	texte: string;
	taille: number;
	retard?: number;
	cadence?: number;
	style?: CSSProperties;
	couleur?: string;
	serif?: boolean;
}) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	let italique = false;
	return (
		<div
			style={{
				fontFamily: serif ? SERIF : SANS,
				fontSize: taille,
				lineHeight: 1.04,
				letterSpacing: serif ? "-0.02em" : "-0.01em",
				color: couleur,
				display: "flex",
				flexWrap: "wrap",
				columnGap: taille * 0.24,
				...style,
			}}
		>
			{texte.split(/\s+/).map((brut, i) => {
				const debut = brut.startsWith("*");
				const fin = brut.endsWith("*");
				if (debut) italique = true;
				const mot = brut.replace(/\*/g, "");
				const enItalique = italique;
				if (fin) italique = false;
				const k = spring({ frame: frame - retard - i * cadence, fps, config: { damping: 15, stiffness: 120, mass: 0.9 } });
				// Chaque mot sort d'un masque en pivotant en 3D, comme un titrage de film
				return (
					<span key={i} style={{ display: "inline-block", overflow: "hidden", padding: "0.08em 0.04em 0.16em", margin: "-0.08em -0.04em -0.16em", perspective: taille * 8 }}>
						<span
							style={{
								display: "inline-block",
								transformOrigin: "50% 100%",
								transform: `translateY(${(1 - k) * 105}%) rotateX(${(1 - k) * -75}deg) skewY(${(1 - k) * 6}deg)`,
								opacity: Math.min(1, k * 1.4),
								filter: `blur(${Math.max(0, 1 - k) * 6}px)`,
								fontStyle: enItalique ? "italic" : "normal",
								color: enItalique ? (couleur === C.platine ? C.mokaClair : C.moka) : undefined,
							}}
						>
							{mot}
						</span>
					</span>
				);
			})}
		</div>
	);
}

// Bloc qui apparait en glissant
export function Apparition({ retard = 0, dx = 0, dy = 60, children, style }: { retard?: number; dx?: number; dy?: number; children: ReactNode; style?: CSSProperties }) {
	const k = useEntree(retard);
	return (
		<div style={{ transform: `perspective(1400px) translate3d(${(1 - k) * dx}px, ${(1 - k) * dy}px, ${(1 - k) * -160}px) rotateX(${(1 - k) * 22}deg) rotateY(${(1 - k) * (dx > 0 ? -18 : dx < 0 ? 18 : 0)}deg)`, opacity: Math.min(1, k * 1.3), filter: `blur(${(1 - Math.min(1, k)) * 5}px)`, ...style }}>
			{children}
		</div>
	);
}

// Etiquette de rubrique en majuscules, style mono
export function Rubrique({ texte, retard = 0, couleur = C.moka }: { texte: string; retard?: number; couleur?: string }) {
	const u = useUnite();
	const k = useEntree(retard);
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 16 * u, opacity: k, fontFamily: MONO, fontSize: 26 * u, letterSpacing: "0.18em", textTransform: "uppercase", color: couleur }}>
			<div style={{ width: 60 * u * k, height: 2 * u, background: couleur }} />
			{texte}
		</div>
	);
}

// Sous-titres : la phrase en cours, le mot prononce surligne (progression estimee sur la longueur des mots)
export function SousTitres({ texte, duree, sombre = false }: { texte: string; duree: number; sombre?: boolean }) {
	const frame = useCurrentFrame();
	const { fps, height } = useVideoConfig();
	const u = useUnite();
	const mots = texte.split(/\s+/);
	const total = mots.reduce((t, m) => t + m.length + 1, 0);
	const avance = (frame / fps / Math.max(duree, 0.5)) * total;
	// Fenetre glissante de mots autour du mot courant, pour rester sur deux lignes
	let cumul = 0;
	const courant = mots.findIndex((m) => (cumul += m.length + 1) >= avance);
	const index = courant === -1 ? mots.length - 1 : courant;
	const debut = Math.max(0, index - (index % 9));
	const visibles = mots.slice(debut, debut + 9);
	const opacite = interpolate(frame, [0, 6, duree * fps, duree * fps + 10], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	return (
		<div
			style={{
				position: "absolute",
				left: "50%",
				bottom: height * 0.05,
				transform: "translateX(-50%)",
				maxWidth: "86%",
				padding: `${14 * u}px ${26 * u}px`,
				borderRadius: 18 * u,
				background: sombre ? "rgba(255,255,255,0.12)" : "rgba(42,28,19,0.82)",
				backdropFilter: "blur(12px)",
				fontFamily: SANS,
				fontWeight: 500,
				fontSize: 34 * u,
				lineHeight: 1.35,
				textAlign: "center",
				color: "rgba(229,228,226,0.55)",
				opacity: opacite,
			}}
		>
			{visibles.map((m, i) => (
				<span key={i} style={{ color: debut + i <= index ? C.platine : undefined }}>
					{m}{" "}
				</span>
			))}
		</div>
	);
}

// Jeu d'icones simple, trace en SVG
const TRACES: Record<NomIcone, string> = {
	github: "M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z",
	ia: "M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2M9 9h6v6H9z",
	video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
	bouclier: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
	eclair: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
	code: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
	camera: "M3 8a2 2 0 0 1 2-2h3l1.5-2h5L16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z",
	historique: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 3",
	serveur: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
	cle: "M15 7a4 4 0 1 1-3.5 6L5 19.5V21h-2v-3l6.5-6.5A4 4 0 0 1 15 7z",
};

export function Icone({ nom, taille, couleur = C.platine }: { nom: NomIcone; taille: number; couleur?: string }) {
	return (
		<svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
			<path d={TRACES[nom] ?? TRACES.code} />
		</svg>
	);
}

// Carte en verre, base de la plupart des scenes
export function Carte({ children, style, sombre = false }: { children: ReactNode; style?: CSSProperties; sombre?: boolean }) {
	const u = useUnite();
	return (
		<div
			style={{
				borderRadius: 32 * u,
				background: sombre ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
				border: `1px solid ${sombre ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.9)"}`,
				boxShadow: "0 40px 90px -40px rgba(42,28,19,0.45)",
				...style,
			}}
		>
			{children}
		</div>
	);
}
