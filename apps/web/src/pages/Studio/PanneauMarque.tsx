import { ALERTE_DEFAUT, contraste, type Hex, LIMITES_PUB, paletteDepuisMarque, type ScriptPub } from "@weekli/core";
import { useState } from "react";
import { LOGO_MAX_OCTETS } from "@/lib/pub/cartes";
import p from "../Tableau/Panneau.module.css";
import styles from "./Editeur.module.css";
import studio from "./Studio.module.css";

type Props = {
	script: ScriptPub;
	couleurs: Hex[];
	surScript: (s: ScriptPub) => void;
	surLogo: (f: File) => Promise<void>;
};

type CleCouleur = "primaire" | "accent" | "alerte";
const COULEURS: { cle: CleCouleur; libelle: string; aide: string }[] = [
	{ cle: "primaire", libelle: "Couleur de la marque", aide: "Fonds sombres et éléments de marque" },
	{ cle: "accent", libelle: "Accent", aide: "Mots clés en couleur ; par défaut, la couleur de la marque" },
	{ cle: "alerte", libelle: "Alerte", aide: "Mots de tension (le problème)" },
];

export function PanneauMarque({ script, couleurs, surScript, surLogo }: Props) {
	const [erreur, setErreur] = useState("");
	const { marque } = script;
	const palette = paletteDepuisMarque(marque);
	const maj = (patch: Partial<ScriptPub["marque"]>) => surScript({ ...script, marque: { ...marque, ...patch } });

	const choisirCouleur = (cle: CleCouleur, valeur: string) => {
		const hex = valeur.toLowerCase();
		if (/^#[0-9a-f]{6}$/.test(hex)) maj({ [cle]: hex as Hex });
	};

	const importer = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const fichier = e.target.files?.[0];
		e.target.value = "";
		if (!fichier) return;
		setErreur("");
		try {
			await surLogo(fichier);
			maj({ logo: "image" });
		} catch (err) {
			setErreur(err instanceof Error ? err.message : "Logo illisible");
		}
	};

	return (
		<div className={styles.groupe}>
			<div className={p.champ}>
				<label htmlFor="titre-pub">Titre de la pub</label>
				<input id="titre-pub" value={script.titre} maxLength={LIMITES_PUB.titre} onChange={(e) => surScript({ ...script, titre: e.target.value })} />
			</div>
			<div className={p.champ}>
				<label htmlFor="nom-projet">Nom affiché dans la révélation</label>
				<input id="nom-projet" value={script.projet.nom} maxLength={LIMITES_PUB.nom} onChange={(e) => surScript({ ...script, projet: { ...script.projet, nom: e.target.value } })} />
			</div>

			{couleurs.length > 0 && (
				<div className={styles.propositions} role="group" aria-label="Couleurs proposées d'après ta première capture">
					<p className={p.aide}>Proposées d'après ta première capture :</p>
					<div className={styles.pastilles}>
						{couleurs.map((c) => (
							<button key={c} type="button" className={styles.pastille} onClick={() => maj({ primaire: c })} aria-label={`Utiliser ${c} comme couleur de la marque`}>
								<span style={{ background: c }} aria-hidden="true" />
								{c}
							</button>
						))}
					</div>
				</div>
			)}

			{COULEURS.map(({ cle, libelle, aide }) => {
				const valeur = marque[cle] ?? (cle === "accent" ? palette.accentSombre : ALERTE_DEFAUT);
				return (
					<div key={cle} className={styles.couleur}>
						<label htmlFor={`couleur-${cle}`}>{libelle}</label>
						<div className={styles.selecteur}>
							<input id={`couleur-${cle}`} type="color" value={valeur} onChange={(e) => choisirCouleur(cle, e.target.value)} />
							<input type="text" aria-label={`${libelle}, valeur hexadécimale`} value={valeur} maxLength={7} spellCheck={false} onChange={(e) => choisirCouleur(cle, e.target.value)} />
							{cle !== "primaire" && marque[cle] && (
								<button type="button" className={styles.lien} onClick={() => maj({ [cle]: undefined })}>
									Par défaut
								</button>
							)}
						</div>
						<span className={styles.aide}>{aide}</span>
					</div>
				);
			})}
			<p className={p.aide}>
				Contraste du texte sur fond sombre : {contraste(palette.blanc, palette.sombre).toFixed(1)} pour 1. Weekli ajuste les couleurs pour garder 4,5 pour 1 au minimum.
			</p>

			<fieldset className={styles.choix}>
				<legend>Typographie</legend>
				<label>
					<input type="radio" name="typo" checked={marque.typo === "nette"} onChange={() => maj({ typo: "nette" })} />
					<span>
						<strong>Nette</strong> : interface rigoureuse, mouvements sobres
					</span>
				</label>
				<label>
					<input type="radio" name="typo" checked={marque.typo === "editoriale"} onChange={() => maj({ typo: "editoriale" })} />
					<span>
						<strong>Éditoriale</strong> : univers plus humain, rythme organique
					</span>
				</label>
			</fieldset>

			<fieldset className={styles.choix}>
				<legend>Logo</legend>
				<label>
					<input type="radio" name="logo" checked={marque.logo === "monogramme"} onChange={() => maj({ logo: "monogramme" })} />
					<span>Monogramme</span>
				</label>
				<label>
					<input type="radio" name="logo" checked={marque.logo === "image"} onChange={() => maj({ logo: "image" })} />
					<span>Image importée</span>
				</label>
			</fieldset>
			{marque.logo === "monogramme" ? (
				<div className={p.champ}>
					<label htmlFor="monogramme">Monogramme (1 ou 2 caractères)</label>
					<input id="monogramme" value={marque.monogramme ?? ""} maxLength={LIMITES_PUB.monogramme} placeholder={Array.from(script.projet.nom)[0] ?? ""} onChange={(e) => maj({ monogramme: e.target.value || undefined })} />
				</div>
			) : (
				<div className={p.champ}>
					<label htmlFor="logo-fichier">Logo (SVG, PNG ou WebP, {LOGO_MAX_OCTETS / 1024} Ko au plus)</label>
					<input id="logo-fichier" type="file" accept="image/svg+xml,image/png,image/webp" onChange={importer} />
					<span className={styles.aide}>Il reste dans ton navigateur. Sans lui, le monogramme est utilisé.</span>
				</div>
			)}
			<p className={`${studio.message} ${studio.alerte}`} role="alert" hidden={!erreur}>
				{erreur}
			</p>
		</div>
	);
}
