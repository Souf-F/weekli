import { BUTS, type ScenePub, type ScriptPub, TRANSITIONS } from "@weekli/core";
import { useId } from "react";
import { CADRAGES, type Champ, champsScene, ICONES } from "@/lib/studio/champs";
import { type Chemin, lireChemin } from "@/lib/studio/edition";
import p from "../Tableau/Panneau.module.css";
import styles from "./Editeur.module.css";

type Props = {
	scene: ScenePub;
	script: ScriptPub;
	surChamp: (chemin: Chemin, valeur: unknown) => void;
};

const BUTS_LIBELLES = { lire: "Lire (pause de 1,2 s)", comprendre: "Comprendre (0,8 s)", montrer: "Montrer (0,5 s)" } as const;

function texteDe(valeur: unknown): string {
	return typeof valeur === "string" ? valeur : "";
}

function Compteur({ valeur, max }: { valeur: string; max: number }) {
	const n = Array.from(valeur).length;
	return (
		<span className={`${styles.compteur} ${n >= max ? styles.plein : ""}`} aria-hidden="true">
			{n} / {max}
		</span>
	);
}

function ChampScene({ champ, scene, script, surChamp, prefixe }: { champ: Champ; scene: ScenePub; script: ScriptPub; surChamp: Props["surChamp"]; prefixe: string }) {
	const id = `${prefixe}-${champ.chemin.join("-")}`;
	const brut = lireChemin(scene, champ.chemin);
	const aide = champ.aide ? `${id}-aide` : undefined;
	const ecrire = (v: string) => surChamp(champ.chemin, champ.facultatif && v === "" ? undefined : v);

	if (champ.genre === "case")
		return (
			<label className={styles.case}>
				<input type="checkbox" checked={brut === true} onChange={(e) => surChamp(champ.chemin, e.target.checked)} />
				{champ.libelle}
			</label>
		);

	if (champ.genre === "icone")
		return (
			<label className={p.champ} htmlFor={id}>
				{champ.libelle}
				<select id={id} value={texteDe(brut)} onChange={(e) => ecrire(e.target.value)}>
					{ICONES.map((i) => (
						<option key={i} value={i}>
							{i}
						</option>
					))}
				</select>
			</label>
		);

	if (champ.genre === "capture")
		return (
			<label className={p.champ} htmlFor={id}>
				{champ.libelle}
				<select id={id} value={texteDe(brut)} onChange={(e) => ecrire(e.target.value)}>
					{script.captures.map((c) => (
						<option key={c.id} value={c.id}>
							{c.legende ?? c.id}
						</option>
					))}
				</select>
			</label>
		);

	if (champ.genre === "cadrage")
		return (
			<label className={p.champ} htmlFor={id}>
				{champ.libelle}
				<select id={id} value={typeof brut === "string" ? brut : "complet"} onChange={(e) => ecrire(e.target.value)}>
					{CADRAGES.map((c) => (
						<option key={c.valeur} value={c.valeur}>
							{c.libelle}
						</option>
					))}
				</select>
			</label>
		);

	if (champ.genre === "liste") {
		const lignes = Array.isArray(brut) ? (brut as string[]) : [];
		return (
			<div className={p.champ}>
				<label htmlFor={id}>{champ.libelle}</label>
				<textarea id={id} rows={Math.max(lignes.length, 2)} value={lignes.join("\n")} aria-describedby={aide} onChange={(e) => surChamp(champ.chemin, e.target.value.split("\n"))} />
				{champ.aide && (
					<span id={aide} className={styles.aide}>
						{champ.aide}, {champ.max} caractères par ligne
					</span>
				)}
			</div>
		);
	}

	const valeur = texteDe(brut);
	return (
		<div className={p.champ}>
			<label htmlFor={id}>{champ.libelle}</label>
			{champ.genre === "long" ? (
				<textarea id={id} rows={2} maxLength={champ.max} value={valeur} onChange={(e) => ecrire(e.target.value)} />
			) : (
				<input id={id} type="text" maxLength={champ.max} value={valeur} aria-describedby={aide} onChange={(e) => ecrire(e.target.value)} />
			)}
			{champ.max && <Compteur valeur={valeur} max={champ.max} />}
			{champ.aide && (
				<span id={aide} className={styles.aide}>
					{champ.aide}
				</span>
			)}
		</div>
	);
}

// Tous les champs d'une scene : ceux de son type, puis la voix, le but et la transition
export function ChampsScene({ scene, script, surChamp }: Props) {
	const prefixe = useId();
	const champs = champsScene(scene, script);
	const sansVoix = script.voix.mode === "aucune";
	return (
		<div className={styles.champs}>
			{champs.map((champ) => (
				<ChampScene key={champ.chemin.join(".")} champ={champ} scene={scene} script={script} surChamp={surChamp} prefixe={prefixe} />
			))}
			<div className={p.champ}>
				<label htmlFor={`${prefixe}-voix`}>Voix de la scène</label>
				<textarea id={`${prefixe}-voix`} rows={3} maxLength={220} value={scene.voix} onChange={(e) => surChamp(["voix"], e.target.value)} />
				<Compteur valeur={scene.voix} max={220} />
			</div>
			<div className={styles.deux}>
				<label className={p.champ}>
					But de la scène
					<select value={scene.but ?? ""} onChange={(e) => surChamp(["but"], e.target.value || undefined)}>
						<option value="">Selon le type</option>
						{BUTS.map((b) => (
							<option key={b} value={b}>
								{BUTS_LIBELLES[b]}
							</option>
						))}
					</select>
				</label>
				<label className={p.champ}>
					Transition d'entrée
					<select value={scene.transition ?? ""} onChange={(e) => surChamp(["transition"], e.target.value || undefined)}>
						<option value="">Selon le type</option>
						{TRANSITIONS.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</label>
			</div>
			{sansVoix && (
				<label className={p.champ}>
					Durée en secondes
					<input type="number" min={1.8} max={7.5} step={0.1} value={scene.duree ?? ""} onChange={(e) => surChamp(["duree"], e.target.value === "" ? undefined : Number(e.target.value))} />
				</label>
			)}
		</div>
	);
}
