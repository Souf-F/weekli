import type { ScenePub, ScriptPub } from "@weekli/core";
import { useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import type { Diagnostic } from "@/lib/studio/diagnostic";
import {
	basculerMasquee,
	type Chemin,
	deplacerScene,
	dupliquerScene,
	modifierScene,
	NOMS_SCENE,
	peutDupliquer,
	peutRetirer,
	retirerScene,
} from "@/lib/studio/edition";
import { ChampsScene } from "./ChampsScene";
import styles from "./Editeur.module.css";
import studio from "./Studio.module.css";

type Props = {
	script: ScriptPub;
	diagnostic: Diagnostic;
	ouverte: number | null;
	surOuverture: (index: number | null) => void;
	surScript: (s: ScriptPub) => void;
};

// Titre court d'une scene pour la liste : le premier texte qu'elle porte
function resume(s: ScenePub): string {
	const mots = (m: { texte: string }) => m.texte;
	switch (s.type) {
		case "ouverture":
			return s.moment;
		case "repetition":
			return s.lignes[0] ? mots(s.lignes[0]) : s.impact;
		case "boucle":
			return mots(s.phrase);
		case "chorus":
		case "transformation":
		case "flux":
		case "avantapres":
		case "resultat":
		case "etape":
			return mots(s.titre);
		case "rupture":
			return mots(s.texte);
		case "revelation":
			return mots(s.slogan);
		case "preuve":
			return s.surtitre;
		case "appel":
			return mots(s.question);
		case "fin":
			return s.slogan ?? s.liens[0] ?? "";
	}
}

export function PanneauScenes({ script, diagnostic, ouverte, surOuverture, surScript }: Props) {
	const [anonce, setAnonce] = useState("");
	const deplacer = (i: number, sens: -1 | 1) => {
		surScript(deplacerScene(script, i, sens));
		surOuverture(i + sens);
		setAnonce(`Scène déplacée en position ${i + sens + 1}`);
	};

	return (
		<div>
			{diagnostic.erreurs.length > 0 && (
				<div className={`${studio.message} ${studio.alerte}`} role="alert">
					La structure empêche l'enregistrement :
					<ul>
						{diagnostic.erreurs.map((e) => (
							<li key={e}>{e}</li>
						))}
					</ul>
				</div>
			)}
			{diagnostic.generaux.length > 0 && (
				<div className={studio.message}>
					À vérifier :
					<ul>
						{diagnostic.generaux.map((a) => (
							<li key={a}>{a}</li>
						))}
					</ul>
				</div>
			)}
			<p className={studio.masque} role="status">
				{anonce}
			</p>
			<ol className={styles.scenes}>
				{script.scenes.map((scene, i) => {
					const ouvert = ouverte === i;
					const alertes = diagnostic.parScene[scene.id] ?? [];
					const idCorps = `scene-${scene.id}`;
					return (
						<li key={scene.id} className={`${styles.scene} ${scene.masquee ? styles.masquee : ""}`}>
							<h3 className={styles.enteteScene}>
								<button type="button" aria-expanded={ouvert} aria-controls={idCorps} onClick={() => surOuverture(ouvert ? null : i)}>
									<span className={styles.numero}>{String(i + 1).padStart(2, "0")}</span>
									<span className={styles.type}>{NOMS_SCENE[scene.type]}</span>
									<span className={styles.resume}>{resume(scene)}</span>
									{scene.masquee && <span className={styles.badge}>Masquée</span>}
									{alertes.length > 0 && <span className={`${styles.badge} ${styles.badgeAlerte}`}>{alertes.length} à vérifier</span>}
								</button>
							</h3>
							{ouvert && (
								<div id={idCorps} className={styles.corpsScene}>
									{alertes.length > 0 && (
										<ul className={`${studio.message} ${studio.alerte}`}>
											{alertes.map((a) => (
												<li key={a}>{a}</li>
											))}
										</ul>
									)}
									<div className={styles.outils} role="group" aria-label={`Actions de la scène ${i + 1}`}>
										<Bouton variante="contour" taille="petit" onClick={() => deplacer(i, -1)} disabled={i === 0}>
											Monter
										</Bouton>
										<Bouton variante="contour" taille="petit" onClick={() => deplacer(i, 1)} disabled={i === script.scenes.length - 1}>
											Descendre
										</Bouton>
										<Bouton variante="contour" taille="petit" onClick={() => surScript(basculerMasquee(script, i))} aria-pressed={!!scene.masquee}>
											{scene.masquee ? "Afficher" : "Masquer"}
										</Bouton>
										<Bouton variante="contour" taille="petit" onClick={() => surScript(dupliquerScene(script, i))} disabled={!peutDupliquer(script)}>
											Dupliquer
										</Bouton>
										<Bouton
											variante="contour"
											taille="petit"
											onClick={() => {
												surScript(retirerScene(script, i));
												surOuverture(null);
											}}
											disabled={!peutRetirer(script)}
										>
											Retirer
										</Bouton>
									</div>
									<ChampsScene scene={scene} script={script} surChamp={(chemin: Chemin, valeur: unknown) => surScript(modifierScene(script, i, chemin, valeur))} />
								</div>
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
}
