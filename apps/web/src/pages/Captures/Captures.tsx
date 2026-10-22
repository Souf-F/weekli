import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bouton } from "@/components/Bouton/Bouton";
import { api, type Domaine } from "@/lib/api";
import p from "../Tableau/Panneau.module.css";
import styles from "./Captures.module.css";

type Format = "bureau" | "mobile";
type Capture = { id: number; url: string; format: Format; image: string };

export function Captures() {
	const [domaines, setDomaines] = useState<Domaine[] | null>(null);
	const [hote, setHote] = useState("");
	const [chemin, setChemin] = useState("/");
	const [format, setFormat] = useState<Format>("bureau");
	const [captures, setCaptures] = useState<Capture[]>([]);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState("");

	useEffect(() => {
		api
			.domaines()
			.then((d) => {
				setDomaines(d);
				setHote(d[0]?.hote ?? "");
			})
			.catch((e) => setErreur(e.message));
	}, []);

	// Les images sont des URL locales au navigateur : on les libere en quittant la page
	useEffect(() => () => captures.forEach((c) => URL.revokeObjectURL(c.image)), [captures]);

	const capturer = async (e: React.FormEvent) => {
		e.preventDefault();
		const url = `https://${hote}${chemin.startsWith("/") ? chemin : `/${chemin}`}`;
		setEnCours(true);
		setErreur("");
		try {
			const image = URL.createObjectURL(await api.capturer(url, format));
			setCaptures((c) => [{ id: Date.now(), url, format, image }, ...c]);
		} catch (err) {
			setErreur(err instanceof Error ? err.message : "Capture impossible");
		} finally {
			setEnCours(false);
		}
	};

	return (
		<div>
			<div className={styles.entete}>
				<h1>
					Captures
					<br />
					<em>de tes projets.</em>
				</h1>
			</div>

			{domaines?.length === 0 ? (
				<div className={styles.vide}>
					<p>Aucun domaine vérifié pour l'instant.</p>
					<p className={p.aide}>
						Ajoute et vérifie ton site dans les <Link to="/app/reglages">réglages</Link>, puis reviens ici.
					</p>
				</div>
			) : (
				<form className={`${p.panneau} ${styles.formulaire}`} onSubmit={capturer}>
					<label className={p.champ}>
						Site
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
					<Bouton type="submit" disabled={enCours || !hote}>
						{enCours ? "Capture en cours…" : "Capturer"}
					</Bouton>
				</form>
			)}

			{erreur && <p className={p.erreur}>{erreur}</p>}

			<div className={styles.grille}>
				{captures.map((c) => (
					<figure key={c.id} className={styles.capture}>
						<img src={c.image} alt={`Capture de ${c.url}`} className={c.format === "mobile" ? styles.mobile : ""} />
						<figcaption>
							<code>{c.url}</code>
							<a href={c.image} download={`weekli-${new URL(c.url).hostname}-${c.format}.jpg`}>
								Télécharger
							</a>
						</figcaption>
					</figure>
				))}
			</div>
		</div>
	);
}
