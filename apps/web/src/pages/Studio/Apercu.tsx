import { instantTimeline } from "@weekli/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import { creerApercu, type Apercu as ControleApercu } from "@/lib/pub/apercu";
import type { Moteur } from "@/lib/pub/moteur";
import { NOMS_SCENE } from "@/lib/studio/edition";
import styles from "./Apercu.module.css";

type Props = {
	moteur: Moteur | null;
	composer: (moteur: Moteur) => Promise<AudioBuffer | null>;
	sceneSuivie: number | null; // index de la scene en edition : l'apercu s'y place a chaque modification
	surLibre: () => void;
	erreur: string;
};

const SOMBRES = new Set(["ouverture", "repetition", "boucle", "chorus", "revelation", "preuve", "fin"]);
const horloge = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
// Instant ou une scene a fini d'entrer : on y lit son texte
const lisible = (debut: number, duree: number) => debut + duree * 0.8;

export function Apercu({ moteur, composer, sceneSuivie, surLibre, erreur }: Props) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const controle = useRef<ControleApercu | null>(null);
	const audio = useRef<{ moteur: Moteur; tampon: AudioBuffer | null } | null>(null);
	const lectureVoulue = useRef(false);
	const derniere = useRef(0); // position de l'apercu detruit, reprise par le suivant
	const [temps, setTemps] = useState(0);
	const [enLecture, setEnLecture] = useState(false);
	const [preparation, setPreparation] = useState(false);
	const [reconstruction, setReconstruction] = useState(0);
	const reduit = useMemo(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);

	// Un controle d'apercu par moteur (et par piste audio) : la position est conservee d'un moteur a l'autre
	useEffect(() => {
		const toile = canvas.current;
		if (!toile || !moteur) return;
		const position = derniere.current;
		const tampon = audio.current?.moteur === moteur ? audio.current.tampon : null;
		const c = creerApercu(toile, moteur, tampon, (t) => {
			setTemps(t);
			// Fin de lecture : le bouton redevient "Lire"
			if (t >= moteur.duree - 0.02) {
				lectureVoulue.current = false;
				setEnLecture(false);
			}
		});
		controle.current = c;
		const cible = sceneSuivie !== null ? moteur.timeline.scenes.find((s) => s.index === sceneSuivie) : undefined;
		c.aller(cible ? lisible(cible.debut, cible.duree) : Math.min(position, moteur.duree));
		if (lectureVoulue.current) void c.lire().then(() => setEnLecture(true));
		return () => {
			if (c.enLecture) lectureVoulue.current = true;
			derniere.current = c.temps;
			c.detruire();
		};
		// sceneSuivie ne reconstruit pas l'apercu : il est lu au moment ou le moteur change
	}, [moteur, reconstruction]);

	// Cliquer une scene dans la liste place l'apercu sur son texte
	useEffect(() => {
		const cible = sceneSuivie !== null ? moteur?.timeline.scenes.find((s) => s.index === sceneSuivie) : undefined;
		if (cible) controle.current?.aller(lisible(cible.debut, cible.duree));
	}, [sceneSuivie, moteur]);

	const basculer = useCallback(async () => {
		const c = controle.current;
		if (!c || !moteur) return;
		if (c.enLecture) {
			await c.pause();
			lectureVoulue.current = false;
			setEnLecture(false);
			return;
		}
		if (audio.current?.moteur !== moteur) {
			setPreparation(true);
			try {
				audio.current = { moteur, tampon: await composer(moteur) };
				lectureVoulue.current = true;
				setReconstruction((n) => n + 1);
			} finally {
				setPreparation(false);
			}
			return;
		}
		lectureVoulue.current = true;
		await c.lire();
		setEnLecture(true);
	}, [moteur, composer]);

	const aller = (secondes: number) => {
		surLibre();
		controle.current?.aller(secondes);
		setTemps(secondes);
	};

	const courante = moteur ? instantTimeline(moteur.timeline, Math.min(temps, Math.max(moteur.duree - 1e-3, 0))) : null;
	const total = moteur?.duree ?? 0;
	return (
		<div className={styles.apercu}>
			<div className={styles.cadre}>
				<canvas ref={canvas} role="img" aria-label={courante && moteur ? `Aperçu de la pub à ${horloge(temps)}, scène ${NOMS_SCENE[courante.scene.type]}` : "Aperçu de la pub"} />
				{!moteur && <span className={styles.attente}>{erreur || "Préparation de l'aperçu"}</span>}
			</div>

			<div className={styles.commandes}>
				<Bouton taille="petit" onClick={basculer} disabled={!moteur || preparation}>
					{preparation ? "Préparation du son…" : enLecture ? "Pause" : "Lire l'aperçu"}
				</Bouton>
				<span className={styles.temps} aria-hidden="true">
					{horloge(temps)} / {horloge(total)}
				</span>
			</div>

			<input
				className={styles.position}
				type="range"
				min={0}
				max={Math.max(total, 0.1)}
				step={0.1}
				value={Math.min(temps, total)}
				disabled={!moteur}
				aria-label="Position dans la pub"
				aria-valuetext={`${horloge(temps)} sur ${horloge(total)}`}
				onChange={(e) => aller(Number(e.target.value))}
			/>

			{moteur && (
				<ol className={styles.barre} aria-label="Scènes de la pub">
					{moteur.timeline.scenes.map((s) => {
						const sombre = SOMBRES.has(s.type);
						return (
							<li key={s.id} className={styles.segment} style={{ "--part": s.duree, "--fond": sombre ? moteur.palette.sombre : moteur.palette.clair } as React.CSSProperties}>
								<button type="button" aria-label={`${NOMS_SCENE[s.type]}, à ${horloge(s.debut)}, ${s.duree.toFixed(1)} secondes`} aria-current={courante?.scene.id === s.id} onClick={() => { aller(lisible(s.debut, s.duree)); }} />
							</li>
						);
					})}
				</ol>
			)}
			{reduit && <p className={styles.note}>Mouvement réduit : l'aperçu reste immobile jusqu'à ce que tu lances la lecture.</p>}
		</div>
	);
}
