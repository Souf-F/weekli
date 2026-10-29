import { LIMITES_PUB, type ScriptPub } from "@weekli/core";
import { useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import type { ProgressionVoix, VoixGeneree } from "@/hooks/useVoixPub";
import type { EtatVoix } from "@/lib/pub/audio/index";
import p from "../Tableau/Panneau.module.css";
import styles from "./Editeur.module.css";
import studio from "./Studio.module.css";

type Props = {
	script: ScriptPub;
	surScript: (s: ScriptPub) => void;
	voix: VoixGeneree | null;
	perimee: string[];
	progression: ProgressionVoix | null;
	etat: EtatVoix | null;
	erreur: string;
	generer: (fichiers?: Record<string, Blob>) => Promise<unknown>;
	annuler: () => void;
};

const MODES = [
	{ id: "synthese", libelle: "Voix générée", detail: "Voix française Vivienne ; si le serveur de voix ne répond pas, une voix de secours se prépare dans ton navigateur" },
	{ id: "importee", libelle: "Ma voix", detail: "Un fichier audio par scène, qui reste dans ton navigateur" },
	{ id: "aucune", libelle: "Sans voix", detail: "Les scènes suivent leur durée par défaut" },
] as const;

// "GitHub = Guite-heub" par ligne, 20 lignes au plus
const versLignes = (d: Record<string, string>) => Object.entries(d).map(([m, l]) => `${m} = ${l}`).join("\n");
function versDictionnaire(texte: string): Record<string, string> {
	const sortie: Record<string, string> = {};
	for (const ligne of texte.split("\n")) {
		const i = ligne.indexOf("=");
		const mot = ligne.slice(0, i).trim().slice(0, LIMITES_PUB.prononciation.texte);
		const lecture = ligne.slice(i + 1).trim().slice(0, LIMITES_PUB.prononciation.texte);
		if (i > 0 && mot && lecture && Object.keys(sortie).length < LIMITES_PUB.prononciation.entrees) sortie[mot] = lecture;
	}
	return sortie;
}

export function PanneauVoix({ script, surScript, voix, perimee, progression, etat, erreur, generer, annuler }: Props) {
	const [fichiers, setFichiers] = useState<Record<string, File>>({});
	const [dico, setDico] = useState(() => versLignes(script.voix.prononciation));
	const mode = script.voix.mode;
	const parlees = script.scenes.filter((s) => !s.masquee && s.voix.trim());
	const maj = (patch: Partial<ScriptPub["voix"]>) => surScript({ ...script, voix: { ...script.voix, ...patch } });

	return (
		<div className={styles.groupe}>
			<fieldset className={styles.choix}>
				<legend>Voix off</legend>
				{MODES.map((m) => (
					<label key={m.id}>
						<input type="radio" name="mode-voix" checked={mode === m.id} onChange={() => maj({ mode: m.id })} />
						<span>
							<strong>{m.libelle}</strong>
							<span className={styles.aide}>{m.detail}</span>
						</span>
					</label>
				))}
			</fieldset>

			{mode === "synthese" && (
				<>
					<label className={p.champ}>
						Vitesse : {script.voix.vitesse.toFixed(2).replace(".", ",")}
						<input type="range" min={LIMITES_PUB.vitesse.min} max={LIMITES_PUB.vitesse.max} step={0.05} value={script.voix.vitesse} onChange={(e) => maj({ vitesse: Number(e.target.value) })} />
					</label>
					<div className={p.champ}>
						<label htmlFor="prononciation">Prononciation</label>
						<textarea
							id="prononciation"
							rows={3}
							value={dico}
							placeholder="GitHub = Guite-heub"
							aria-describedby="aide-prononciation"
							onChange={(e) => setDico(e.target.value)}
							onBlur={() => maj({ prononciation: versDictionnaire(dico) })}
						/>
						<span id="aide-prononciation" className={styles.aide}>
							Un mot par ligne, « mot = lecture ». {LIMITES_PUB.prononciation.entrees} lignes au plus. Appliqué avant la synthèse.
						</span>
					</div>
				</>
			)}

			{mode === "importee" && (
				<div className={styles.fichiers}>
					<p className={p.aide}>Un fichier audio (WAV, MP3, M4A ou OGG) par scène qui a une voix.</p>
					{parlees.map((s) => (
						<label key={s.id} className={p.champ}>
							{s.id} : « {s.voix.slice(0, 40)}{s.voix.length > 40 ? "…" : ""} »
							<input type="file" accept="audio/*" onChange={(e) => setFichiers((f) => ({ ...f, [s.id]: e.target.files?.[0] as File }))} />
						</label>
					))}
				</div>
			)}

			{mode !== "aucune" && (
				<div className={styles.outils}>
					{progression ? (
						<Bouton variante="contour" onClick={annuler}>
							Annuler
						</Bouton>
					) : (
						<Bouton onClick={() => generer(mode === "importee" ? fichiers : undefined)} disabled={mode === "importee" && Object.keys(fichiers).length === 0}>
							{mode === "importee" ? "Utiliser ces fichiers" : voix ? "Régénérer la voix" : "Générer la voix"}
						</Bouton>
					)}
				</div>
			)}

			{progression && (
				<div role="status">
					<label htmlFor="progression-voix">{progression.libelle}</label>
					<progress id="progression-voix" className={styles.progression} max={1} value={progression.part ?? undefined} />
				</div>
			)}
			{etat && !progression && (
				<p className={`${studio.message} ${etat.secours ? studio.alerte : studio.succes}`} role="status">
					{etat.source === "importee" ? "Voix importée prête." : etat.secours ? `Voix de secours dans ton navigateur (le serveur de voix n'a pas répondu${etat.raison ? ` : ${etat.raison}` : ""}).` : etat.source === "kokoro" ? "Voix du navigateur prête." : "Voix Vivienne prête."}
				</p>
			)}
			{mode !== "aucune" && !voix && !progression && <p className={p.aide}>La voix n'est pas encore préparée : l'export la prépare avant de monter la vidéo.</p>}
			{perimee.length > 0 && voix && (
				<p className={studio.message} role="status">
					Texte modifié depuis la génération ({perimee.length} {perimee.length > 1 ? "scènes" : "scène"}) : régénère la voix pour la mettre à jour.
				</p>
			)}
			<p className={`${studio.message} ${studio.alerte}`} role="alert" hidden={!erreur}>
				{erreur}
			</p>

			<label className={p.champ}>
				Musique
				<select value={script.musique} onChange={(e) => surScript({ ...script, musique: e.target.value as ScriptPub["musique"] })}>
					<option value="energique">Énergique</option>
					<option value="calme">Calme</option>
					<option value="aucune">Aucune</option>
				</select>
			</label>
			<p className={p.aide}>Musique générée par le code, libre de droits : elle baisse sous la voix.</p>
		</div>
	);
}
