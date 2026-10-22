import { useEffect, useState } from "react";
import { Bouton } from "@/components/Bouton/Bouton";
import { api, type Domaine, type Preuve } from "@/lib/api";
import p from "../Tableau/Panneau.module.css";
import styles from "./PanneauDomaines.module.css";

// Ajout d'un domaine en deux temps : on obtient la preuve a publier, puis on demande la verification
export function PanneauDomaines() {
	const [domaines, setDomaines] = useState<Domaine[]>([]);
	const [saisie, setSaisie] = useState("");
	const [preuve, setPreuve] = useState<Preuve | null>(null);
	const [message, setMessage] = useState("");
	const [occupe, setOccupe] = useState(false);

	useEffect(() => {
		api
			.domaines()
			.then(setDomaines)
			.catch(() => undefined);
	}, []);

	const agir = async (action: () => Promise<void>) => {
		setOccupe(true);
		setMessage("");
		try {
			await action();
		} catch (e) {
			setMessage(e instanceof Error ? e.message : "Erreur");
		} finally {
			setOccupe(false);
		}
	};

	const preparer = (e: React.FormEvent) => {
		e.preventDefault();
		agir(async () => setPreuve(await api.preparerDomaine(saisie)));
	};

	const verifier = () =>
		preuve &&
		agir(async () => {
			setDomaines(await api.verifierDomaine(preuve.hote));
			setPreuve(null);
			setSaisie("");
			setMessage("Domaine vérifié.");
		});

	const retirer = (hote: string) =>
		agir(async () => {
			await api.supprimerDomaine(hote);
			setDomaines((d) => d.filter((x) => x.hote !== hote));
		});

	return (
		<section className={p.panneau}>
			<div className={p.titre}>
				<h2>Domaines vérifiés</h2>
			</div>
			<p className={p.aide}>
				Weekli ne capture que les sites dont tu as prouvé la propriété. Les emails, IP et tokens visibles sont floutés.
			</p>

			<ul className={styles.liste}>
				{domaines.map((d) => (
					<li key={d.hote}>
						<code>{d.hote}</code>
						<button type="button" onClick={() => retirer(d.hote)} disabled={occupe} aria-label={`Retirer ${d.hote}`}>
							Retirer
						</button>
					</li>
				))}
				{domaines.length === 0 && <li className={p.aide}>Aucun domaine pour l'instant.</li>}
			</ul>

			<form className={styles.ajout} onSubmit={preparer}>
				<input
					value={saisie}
					onChange={(e) => setSaisie(e.target.value)}
					placeholder="monsite.dev"
					aria-label="Nom de domaine"
					spellCheck={false}
				/>
				<Bouton type="submit" taille="petit" variante="contour" disabled={occupe || !saisie.trim()}>
					Ajouter
				</Bouton>
			</form>

			{preuve && (
				<div className={styles.preuve}>
					<p>
						Prouve que <strong>{preuve.hote}</strong> t'appartient, avec <strong>l'une</strong> de ces deux méthodes :
					</p>
					<p className={styles.methode}>1. Un enregistrement DNS</p>
					<dl>
						<dt>Type</dt>
						<dd>
							<code>TXT</code>
						</dd>
						<dt>Nom</dt>
						<dd>
							<code>{preuve.dns.nom}</code>
						</dd>
						<dt>Valeur</dt>
						<dd>
							<code>{preuve.dns.valeur}</code>
						</dd>
					</dl>
					<p className={styles.methode}>2. Ou un fichier sur le site (GitHub Pages, Vercel, Cloudflare Pages…)</p>
					<dl>
						<dt>Adresse</dt>
						<dd>
							<code>{preuve.fichier.url}</code>
						</dd>
						<dt>Contenu</dt>
						<dd>
							<code>{preuve.fichier.contenu}</code>
						</dd>
					</dl>
					<Bouton type="button" onClick={verifier} disabled={occupe}>
						{occupe ? "Vérification…" : "Vérifier maintenant"}
					</Bouton>
				</div>
			)}
			{message && <p className={message === "Domaine vérifié." ? p.aide : p.erreur}>{message}</p>}
		</section>
	);
}
