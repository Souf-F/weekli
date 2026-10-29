import { type ScriptPub } from "@weekli/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import type { VoixGeneree } from "@/hooks/useVoixPub";
import { composerAudio, type VoixPreparee } from "@/lib/pub/audio/index";
import { choisirFormat, exporter, type FormatExport } from "@/lib/pub/export";
import type { Moteur } from "@/lib/pub/moteur";
import { genererSrt } from "@/lib/pub/sous-titres";
import { type Controle, controler, type Rapport } from "@/lib/studio/controles";
import { nomFichier } from "@/lib/studio/edition";
import { creerMiniature } from "@/lib/studio/miniature";
import p from "../Tableau/Panneau.module.css";
import styles from "./Export.module.css";
import studio from "./Studio.module.css";

type Props = {
	script: ScriptPub | null; // script nettoye ; null tant qu'une regle de structure est enfreinte
	fabriquer: (s: ScriptPub, durees?: Readonly<Record<string, number>>) => Moteur;
	voixValide: VoixPreparee | null;
	genererVoix: (s: ScriptPub) => Promise<VoixGeneree | null>;
	imagesManquantes: number;
};

type Phase = "repos" | "voix" | "son" | "video" | "controles";
type Sortie = { nom: string; mp4: string | null; png: string; srt: string; planche: string | null; rapport: Rapport; extension: string; avertissements: string[]; octets: number };

const ETAPES: Record<Exclude<Phase, "repos">, string> = {
	voix: "Préparation de la voix",
	son: "Mixage du son",
	video: "Montage de la vidéo",
	controles: "Contrôles finaux",
};

const annonceFormat = (f: FormatExport | null | undefined) =>
	f === undefined
		? "Vérification du format…"
		: f === null
			? "Ce navigateur ne sait pas encoder de vidéo (WebCodecs absent). Essaie Chrome ou Edge."
			: f.conteneur === "mp4"
				? "Format : MP4 (H.264 et AAC), 1920 × 1080, 30 images par seconde."
				: `Format : WebM (${f.video.toUpperCase()} et Opus), 1920 × 1080 : ton navigateur n'écrit pas de MP4.`;

const octets = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`);

function Resultat({ c }: { c: Controle }) {
	return (
		<li className={c.ok ? styles.ok : styles.echec}>
			<strong>{c.ok ? "Réussi" : "Échec"}</strong> · {c.libelle}
			<span className={p.aide}>{c.detail}</span>
		</li>
	);
}

export function PanneauExport({ script, fabriquer, voixValide, genererVoix, imagesManquantes }: Props) {
	const [format, setFormat] = useState<FormatExport | null | undefined>(undefined);
	const [phase, setPhase] = useState<Phase>("repos");
	const [part, setPart] = useState(0);
	const [erreur, setErreur] = useState("");
	const [sortie, setSortie] = useState<Sortie | null>(null);
	const arret = useRef<AbortController | null>(null);

	useEffect(() => {
		choisirFormat(true)
			.then(setFormat)
			.catch(() => setFormat(null));
	}, []);

	const liberer = useCallback((s: Sortie | null) => {
		if (!s) return;
		for (const u of [s.mp4, s.png, s.srt, s.planche]) if (u) URL.revokeObjectURL(u);
	}, []);
	useEffect(() => () => liberer(sortie), [sortie, liberer]);

	const lancer = async () => {
		if (!script) return;
		const controle = new AbortController();
		arret.current = controle;
		liberer(sortie);
		setSortie(null);
		setErreur("");
		setPart(0);
		try {
			let prep = voixValide;
			if (script.voix.mode !== "aucune" && !prep) {
				if (script.voix.mode === "importee") throw new Error("Importe tes fichiers de voix dans l'onglet Voix avant d'exporter.");
				setPhase("voix");
				const g = await genererVoix(script);
				if (!g) throw new Error("La voix n'a pas pu être préparée : consulte l'onglet Voix.");
				prep = g.voix;
			}
			const moteur = fabriquer(script, prep?.durees);

			setPhase("son");
			const son = await composerAudio(moteur, { voix: prep });

			setPhase("video");
			const miniature = await creerMiniature(moteur);
			const resultat = await exporter(moteur, son.audio, (pr) => setPart(pr.image / pr.total), controle.signal);

			setPhase("controles");
			const rapport = await controler({ moteur, fichier: resultat.fichier, miniature, audio: son.audio, signal: controle.signal });
			const nom = nomFichier(script.titre || script.projet.nom);
			const srt = genererSrt(moteur, prep?.durees);
			setSortie({
				nom,
				extension: resultat.format.extension,
				mp4: rapport.ok ? URL.createObjectURL(resultat.fichier) : null,
				png: URL.createObjectURL(miniature),
				srt: URL.createObjectURL(new Blob([srt], { type: "text/plain;charset=utf-8" })),
				planche: rapport.planche ? URL.createObjectURL(rapport.planche) : null,
				rapport,
				avertissements: son.avertissements,
				octets: resultat.stats.octets,
			});
		} catch (e) {
			if (!controle.signal.aborted) setErreur(e instanceof Error ? e.message : "Export impossible");
		} finally {
			setPhase("repos");
			arret.current = null;
		}
	};

	const occupe = phase !== "repos";
	return (
		<section className={styles.export} aria-labelledby="titre-export">
			<h2 id="titre-export">Export</h2>
			<p className={p.aide}>{annonceFormat(format)}</p>
			{imagesManquantes > 0 && <p className={studio.message}>{imagesManquantes} image{imagesManquantes > 1 ? "s" : ""} manquante{imagesManquantes > 1 ? "s" : ""} sur cet appareil : la pub sera montée sans.</p>}
			{!script && <p className={`${studio.message} ${studio.alerte}`}>Corrige la structure de la pub (onglet Scènes) avant d'exporter.</p>}

			<div className={studio.actions}>
				{occupe ? (
					<Bouton variante="contour" onClick={() => arret.current?.abort()}>
						Annuler
					</Bouton>
				) : (
					<Bouton onClick={lancer} disabled={!script || format === null}>
						Exporter la pub
					</Bouton>
				)}
			</div>
			<p className={p.aide}>Garde cet onglet ouvert pendant l'export : une minute de vidéo demande environ trois minutes de montage.</p>

			<div role="status" aria-live="polite">
				{occupe && (
					<>
						<label htmlFor="progression-export">
							{ETAPES[phase as Exclude<Phase, "repos">]}
							{phase === "video" ? ` : ${Math.round(part * 100)} %` : ""}
						</label>
						<progress id="progression-export" className={styles.progression} max={1} value={phase === "video" ? part : undefined} />
					</>
				)}
			</div>
			<p className={`${studio.message} ${studio.alerte}`} role="alert" hidden={!erreur}>
				{erreur}
			</p>

			{sortie && (
				<div className={styles.sortie}>
					<h3>{sortie.rapport.ok ? "La pub est prête" : "Export bloqué par les contrôles"}</h3>
					<ul className={styles.controles}>
						{sortie.rapport.controles.map((c) => (
							<Resultat key={c.id} c={c} />
						))}
					</ul>
					{!sortie.rapport.ok && <p className={`${studio.message} ${studio.alerte}`}>Le MP4 n'est pas proposé : corrige la cause indiquée ci-dessus puis relance l'export.</p>}
					{sortie.avertissements.map((a) => (
						<p key={a} className={studio.message}>
							{a}
						</p>
					))}
					<div className={studio.actions}>
						{sortie.mp4 && (
							<a className={styles.telecharger} href={sortie.mp4} download={`${sortie.nom}.${sortie.extension}`}>
								Télécharger la vidéo ({sortie.extension.toUpperCase()}, {octets(sortie.octets)})
							</a>
						)}
						<a className={styles.telecharger} href={sortie.png} download={`${sortie.nom}.png`}>
							Télécharger la miniature (PNG)
						</a>
						<a className={styles.telecharger} href={sortie.srt} download={`${sortie.nom}.srt`}>
							Télécharger les sous-titres (SRT)
						</a>
					</div>
					<p className={p.aide}>La miniature est l'image zéro de la vidéo. Weekli ne peut pas promettre qu'une plateforme l'utilise automatiquement.</p>
					{sortie.planche && (
						<details className={styles.planche}>
							<summary>Planche de relecture</summary>
							<p className={p.aide}>Une image à chaque raccord et deux par scène. « Illustration » marque les cartes qui illustrent : ce ne sont pas des démonstrations réelles.</p>
							<img src={sortie.planche} alt="Planche de relecture : images aux raccords de chaque scène" />
						</details>
					)}
				</div>
			)}
		</section>
	);
}
