import type { CaptureRef } from "@weekli/core";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api, type Domaine } from "@/lib/api";
import { decoderImage } from "@/lib/pub/cartes";
import { idCapture, legendeDepuisUrl, MAX_CAPTURES_STUDIO } from "@/lib/studio/depart";
import { capturerSite } from "@/lib/studio/images";
import p from "../Tableau/Panneau.module.css";
import styles from "./Assistant.module.css";
import studio from "./Studio.module.css";

type Props = {
	captures: CaptureRef[];
	medias: ReadonlyMap<string, Blob>;
	exige: boolean;
	surAjout: (ref: CaptureRef, blob: Blob) => void;
	surRetrait: (id: string) => void;
};

type Format = "bureau" | "mobile";

// 2 captures au plus, facultatives : une capture de site (domaine verifie) ou une image importee, qui ne quitte pas le navigateur
export function EtapeCaptures({ captures, medias, exige, surAjout, surRetrait }: Props) {
	const [domaines, setDomaines] = useState<Domaine[] | null>(null);
	const [hote, setHote] = useState("");
	const [chemin, setChemin] = useState("/");
	const [format, setFormat] = useState<Format>("bureau");
	const [occupe, setOccupe] = useState(false);
	const [erreur, setErreur] = useState("");
	const complet = captures.length >= MAX_CAPTURES_STUDIO;

	useEffect(() => {
		api
			.domaines()
			.then((d) => {
				setDomaines(d);
				setHote(d[0]?.hote ?? "");
			})
			.catch((e: Error) => setErreur(e.message));
	}, []);

	const apercus = useMemo(() => new Map(captures.map((c) => [c.id, medias.has(c.id) ? URL.createObjectURL(medias.get(c.id) as Blob) : ""])), [captures, medias]);
	useEffect(() => () => apercus.forEach((u) => u && URL.revokeObjectURL(u)), [apercus]);

	const capturer = async (e: React.FormEvent) => {
		e.preventDefault();
		const url = `https://${hote}${chemin.startsWith("/") ? chemin : `/${chemin}`}`;
		setOccupe(true);
		setErreur("");
		try {
			const blob = await capturerSite(url, format);
			surAjout({ id: idCapture(captures), source: "site", url, format, legende: legendeDepuisUrl(url) }, blob);
		} catch (err) {
			setErreur(err instanceof Error ? err.message : "Capture impossible");
		} finally {
			setOccupe(false);
		}
	};

	const importer = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const fichier = e.target.files?.[0];
		e.target.value = "";
		if (!fichier) return;
		setErreur("");
		try {
			(await decoderImage(fichier)).close();
			surAjout({ id: idCapture(captures), source: "importee", format: "bureau", legende: fichier.name.replace(/\.[^.]+$/, "").slice(0, 60) }, fichier);
		} catch (err) {
			setErreur(err instanceof Error ? err.message : "Image illisible");
		}
	};

	return (
		<>
			{exige ? (
				<p className={studio.message}>Ajoute au moins une capture : sans elle, la pub est trop courte (environ 46 secondes au mieux). Les captures restent facultatives si Claude écrit la pub.</p>
			) : (
				<p className={p.aide}>Facultatif : {MAX_CAPTURES_STUDIO} captures au plus, de 2,5 secondes chacune à l'écran.</p>
			)}

			<div className={styles.sources}>
				<form className={styles.source} onSubmit={capturer}>
					<h3>Une page de ton site</h3>
					{domaines?.length === 0 ? (
						<p className={p.aide}>
							Aucun domaine vérifié. Vérifie ton site dans les <Link to="/app/reglages">réglages</Link>, ou importe une image.
						</p>
					) : (
						<>
							<label className={p.champ}>
								Domaine
								<select value={hote} onChange={(e) => setHote(e.target.value)}>
									{domaines?.map((d) => (
										<option key={d.hote} value={d.hote}>
											{d.hote}
										</option>
									))}
								</select>
							</label>
							<label className={p.champ}>
								Page
								<input value={chemin} onChange={(e) => setChemin(e.target.value)} placeholder="/" spellCheck={false} />
							</label>
							<label className={p.champ}>
								Format
								<select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
									<option value="bureau">Bureau (1280 × 800)</option>
									<option value="mobile">Mobile (390 × 844)</option>
								</select>
							</label>
							<Bouton type="submit" disabled={occupe || complet || !hote}>
								{occupe ? "Capture en cours…" : "Capturer"}
							</Bouton>
							<p className={p.aide}>5 captures par minute au plus.</p>
						</>
					)}
				</form>

				<div className={styles.source}>
					<h3>Une image à toi</h3>
					<label className={p.champ}>
						Image (PNG, JPEG ou WebP, 8 Mo au plus)
						<input type="file" accept="image/png,image/jpeg,image/webp" onChange={importer} disabled={complet} />
					</label>
					<p className={p.aide}>Elle reste dans ton navigateur : elle n'est jamais envoyée à Weekli.</p>
				</div>
			</div>

			<p className={`${studio.message} ${studio.alerte}`} role="alert" hidden={!erreur}>
				{erreur}
			</p>

			{captures.length > 0 && (
				<ul className={styles.captures} aria-label="Captures ajoutées">
					{captures.map((c) => (
						<li key={c.id}>
							<figure className={styles.capture}>
								{apercus.get(c.id) && <img src={apercus.get(c.id)} alt={`Aperçu : ${c.legende ?? c.id}`} />}
								<figcaption>
									<strong>{c.legende ?? c.id}</strong>
									<br />
									<span className={p.aide}>{c.source === "site" ? c.url : "Image importée"}</span>
								</figcaption>
								<Bouton variante="contour" taille="petit" onClick={() => surRetrait(c.id)} aria-label={`Retirer la capture ${c.legende ?? c.id}`}>
									Retirer
								</Bouton>
							</figure>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
