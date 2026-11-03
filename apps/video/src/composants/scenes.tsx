import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO, SANS, SERIF } from "../theme";
import type { Visuel } from "../types";
import { Apparition, Carte, Icone, Mots, Rubrique, useEntree, useUnite } from "./base";

// Chaque scene occupe la zone utile au-dessus des sous-titres, avec un leger travelling avant
function Zone({ children, centre = false }: { children: React.ReactNode; centre?: boolean }) {
	const frame = useCurrentFrame();
	const { durationInFrames, width, height } = useVideoConfig();
	const u = useUnite();
	const paysage = width > height;
	const zoom = interpolate(frame, [0, durationInFrames], [1, 1.04]);
	// Derive de camera : la scene flotte doucement dans l'espace
	const derive = `perspective(2200px) rotateY(${Math.sin(frame / 55) * 2.2}deg) rotateX(${Math.cos(frame / 70) * 1.4}deg)`;
	return (
		<AbsoluteFill
			style={{
				padding: paysage ? `${90 * u}px ${120 * u}px ${190 * u}px` : `${120 * u}px ${90 * u}px ${230 * u}px`,
				display: "flex",
				alignItems: "center",
				justifyContent: centre || paysage ? "center" : "flex-start",
				transform: `${derive} scale(${zoom})`,
			}}
		>
			{/* En paysage, colonne centree de largeur limitee pour garder des lignes lisibles */}
			<div style={{ width: "100%", maxWidth: paysage ? 1380 * u : undefined, flex: centre || paysage ? undefined : 1, display: "flex", flexDirection: "column", gap: 36 * u }}>
				{children}
			</div>
		</AbsoluteFill>
	);
}

export const scenesSombres: Visuel["type"][] = ["probleme", "chiffres", "appel"];

export function Scene({ visuel }: { visuel: Visuel }) {
	const u = useUnite();
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	switch (visuel.type) {
		case "accroche":
			return (
				<Zone centre>
					<Mots texte={visuel.texte} taille={118 * u} cadence={4} />
					{visuel.sousTexte && (
						<Apparition retard={18}>
							<div style={{ fontFamily: SANS, fontSize: 40 * u, color: C.doux, maxWidth: 820 * u }}>{visuel.sousTexte}</div>
						</Apparition>
					)}
				</Zone>
			);

		case "probleme":
			return (
				<Zone centre>
					<Rubrique texte="Le problème" couleur={C.mokaClair} />
					<Mots texte={visuel.titre} taille={84 * u} couleur={C.platine} />
					{visuel.points.map((p, i) => {
						const barre = interpolate(frame, [40 + i * 18, 58 + i * 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
						return (
							<Apparition key={i} retard={12 + i * 10} dx={-60} dy={0}>
								<div style={{ position: "relative", display: "inline-block", fontFamily: SANS, fontSize: 40 * u, color: "rgba(229,228,226,0.8)" }}>
									{p}
									<div style={{ position: "absolute", left: 0, top: "52%", height: 3 * u, width: `${barre * 100}%`, background: C.mokaClair }} />
								</div>
							</Apparition>
						);
					})}
				</Zone>
			);

		case "revelation": {
			const k = useEntree(0, 70);
			const impact = 8; // meme valeur que IMPACT dans VideoProjet (secousse et son)
			const onde = interpolate(frame, [impact, impact + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
			const lumiere = interpolate(frame, [impact, impact + 6, impact + 40], [0, 1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
			const lettres = [...visuel.nom];
			return (
				<Zone centre>
					<div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * u }}>
						{/* Onde de choc */}
						{[0, 1].map((n) => (
							<div
								key={n}
								style={{
									position: "absolute",
									left: "50%",
									top: "38%",
									width: 900 * u,
									height: 900 * u,
									marginLeft: -450 * u,
									marginTop: -450 * u,
									borderRadius: "50%",
									border: `${(3 - n) * u}px solid ${C.moka}`,
									transform: `scale(${0.1 + Math.max(0, onde - n * 0.15) * 1.3})`,
									opacity: (1 - onde) * (n ? 0.4 : 0.7),
								}}
							/>
						))}
						<div
							style={{
								width: 170 * u,
								height: 170 * u,
								borderRadius: 44 * u,
								background: `linear-gradient(145deg, ${C.moka}, ${C.espresso})`,
								display: "grid",
								placeItems: "center",
								transform: `perspective(900px) scale(${k}) rotateY(${(1 - k) * 540}deg) rotateX(${(1 - k) * 30}deg)`,
								boxShadow: `0 0 ${160 * lumiere * u}px ${C.mokaClair}, 0 30px 60px -20px rgba(42,28,19,0.6)`,
							}}
						>
							<span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 120 * u, color: C.platine }}>{visuel.nom[0]}</span>
						</div>
						<div style={{ display: "flex", fontFamily: SERIF, fontSize: 190 * u, lineHeight: 1, letterSpacing: "-0.02em", color: C.espresso, perspective: 1200 }}>
							{lettres.map((l, n) => {
								const kl = spring({ frame: frame - impact + 4 - n * 2, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });
								return (
									<span
										key={n}
										style={{
											display: "inline-block",
											transform: `translateZ(${(1 - kl) * 600}px) rotateY(${(1 - kl) * -90}deg) scale(${1 + (1 - kl) * 0.6})`,
											opacity: Math.min(1, kl * 1.5),
											filter: `blur(${Math.max(0, 1 - kl) * 12}px)`,
											textShadow: `0 0 ${50 * lumiere * u}px rgba(255,255,255,${0.8 * lumiere})`,
										}}
									>
										{l}
									</span>
								);
							})}
						</div>
						<Apparition retard={impact + 16}>
							<div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 56 * u, color: C.moka, textAlign: "center" }}>{visuel.slogan}</div>
						</Apparition>
					</div>
				</Zone>
			);
		}

		case "fonctionnalites":
			return (
				<Zone>
					<Rubrique texte="Ce que ça fait" />
					<Mots texte={visuel.titre} taille={76 * u} />
					<div style={{ display: "flex", flexDirection: "column", gap: 22 * u }}>
						{visuel.elements.map((e, i) => (
							<Apparition key={i} retard={14 + i * 12} dx={80} dy={0}>
								<Carte style={{ display: "flex", alignItems: "center", gap: 30 * u, padding: `${28 * u}px ${34 * u}px` }}>
									<div style={{ flex: "none", width: 92 * u, height: 92 * u, borderRadius: 24 * u, background: C.espresso, display: "grid", placeItems: "center" }}>
										<Icone nom={e.icone} taille={48 * u} />
									</div>
									<div>
										<div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 38 * u, color: C.espresso }}>{e.titre}</div>
										<div style={{ fontFamily: SANS, fontSize: 30 * u, color: C.doux, marginTop: 6 * u }}>{e.texte}</div>
									</div>
								</Carte>
							</Apparition>
						))}
					</div>
				</Zone>
			);

		case "chiffres":
			return (
				<Zone centre>
					<div style={{ display: "grid", gridTemplateColumns: visuel.elements.length > 2 ? "1fr 1fr" : "1fr", gap: 30 * u }}>
						{visuel.elements.map((e, i) => {
							const k = interpolate(frame - 8 - i * 8, [0, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
							const valeur = Math.round(e.valeur * (1 - Math.pow(1 - k, 3)));
							return (
								<Apparition key={i} retard={i * 8}>
									<Carte sombre style={{ padding: `${40 * u}px ${36 * u}px` }}>
										<div style={{ fontFamily: SERIF, fontSize: 150 * u, lineHeight: 1, color: C.lavande, display: "inline-block", transform: `scale(${1 + 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, (k - 0.85) / 0.15)))})`, transformOrigin: "0% 80%", textShadow: `0 0 ${40 * k * u}px rgba(201,190,221,0.45)` }}>
											{valeur.toLocaleString("fr-FR")}
											{e.suffixe}
										</div>
										<div style={{ fontFamily: SANS, fontSize: 32 * u, color: "rgba(229,228,226,0.75)", marginTop: 14 * u }}>{e.libelle}</div>
									</Carte>
								</Apparition>
							);
						})}
					</div>
				</Zone>
			);

		case "capture": {
			const k = useEntree(0, 80);
			// Zoom lent vers le haut a gauche de l'interface (effet Ken Burns)
			const zoom = interpolate(frame, [15, 15 + fps * 5], [1, 1.14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
			return (
				<Zone centre>
					<div style={{ transform: `perspective(1600px) rotateX(${(1 - k) * 18}deg) translateY(${(1 - k) * 120}px)`, opacity: k }}>
						<Carte style={{ overflow: "hidden", padding: 0 }}>
							<div style={{ display: "flex", gap: 10 * u, padding: `${16 * u}px ${20 * u}px`, background: "rgba(255,255,255,0.9)" }}>
								{[0, 1, 2].map((i) => (
									<div key={i} style={{ width: 16 * u, height: 16 * u, borderRadius: "50%", background: "rgba(111,78,55,0.25)" }} />
								))}
							</div>
							<div style={{ aspectRatio: "16 / 11", overflow: "hidden" }}>
								<Img
									src={staticFile(visuel.image)}
									style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", transform: `scale(${zoom})`, transformOrigin: "30% 20%" }}
								/>
							</div>
						</Carte>
					</div>
					{visuel.legende && <Mots texte={visuel.legende} taille={54 * u} retard={16} style={{ justifyContent: "center" }} />}
				</Zone>
			);
		}

		case "citation":
			return (
				<Zone centre>
					<div style={{ fontFamily: SERIF, fontSize: 260 * u, lineHeight: 0.6, color: C.mokaClair, opacity: useEntree(0) }}>«</div>
					<Mots texte={visuel.texte} taille={86 * u} retard={6} cadence={3} style={{ fontStyle: "italic" }} />
					{visuel.auteur && (
						<Apparition retard={30}>
							<div style={{ fontFamily: MONO, fontSize: 28 * u, color: C.moka }}>{visuel.auteur}</div>
						</Apparition>
					)}
				</Zone>
			);

		case "appel": {
			const pulsation = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);
			const reflet = ((frame * 2.2) % 220) - 60;
			return (
				<Zone centre>
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * u, textAlign: "center" }}>
						<Mots texte={visuel.titre} taille={104 * u} couleur={C.platine} style={{ justifyContent: "center" }} />
						{visuel.sousTexte && (
							<Apparition retard={14}>
								<div style={{ fontFamily: SANS, fontSize: 38 * u, color: "rgba(229,228,226,0.75)" }}>{visuel.sousTexte}</div>
							</Apparition>
						)}
						<Apparition retard={24}>
							<div
								style={{
									transform: `scale(${pulsation})`,
									padding: `${26 * u}px ${44 * u}px`,
									borderRadius: 999,
									background: `linear-gradient(110deg, ${C.lavande} ${reflet - 12}%, #ffffff ${reflet}%, ${C.lavande} ${reflet + 12}%)`,
									boxShadow: `0 0 ${60 * u}px rgba(201,190,221,0.45)`,
									fontFamily: MONO,
									fontSize: 36 * u,
									color: C.espresso,
								}}
							>
								{visuel.lien}
							</div>
						</Apparition>
					</div>
				</Zone>
			);
		}
	}
}
