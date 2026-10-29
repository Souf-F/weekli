import { GESTES, GESTES_PUB, type Geste, type ScriptPub } from "@weekli/core";
import { Bouton } from "@/components/Bouton/Bouton";
import { basculerGeste } from "@/lib/studio/edition";
import p from "../Tableau/Panneau.module.css";
import styles from "./Editeur.module.css";

type Props = { script: ScriptPub; surScript: (s: ScriptPub) => void };

// Bibliotheque de mouvement de design.md 8.16 : 2 ou 3 gestes par pub
const DESCRIPTIONS: Record<Geste, { nom: string; detail: string }> = {
	accent: { nom: "Accent", detail: "Mots clés en couleur, léger rebond" },
	surlignage: { nom: "Surlignage", detail: "Un bloc balaie derrière le mot accentué" },
	soulignement: { nom: "Soulignement", detail: "Un filet sous la signature" },
	frappe: { nom: "Frappe", detail: "Texte tapé avec un curseur carré" },
	impact: { nom: "Impact", detail: "Mot d'impact, décalage chromatique, secousse" },
	lettres: { nom: "Lettres", detail: "Mot d'action en lettres qui tombent" },
	glitch: { nom: "Glitch", detail: "Transition par décalage de couleurs" },
	pixels: { nom: "Pixels", detail: "Transition par carrés" },
	flou: { nom: "Flou", detail: "Transition par fondu flou" },
	rayons: { nom: "Rayons", detail: "Rayons de la révélation et de la fin" },
};

const JEUX: { nom: string; gestes: Geste[] }[] = [
	{ nom: "Sobre", gestes: ["accent", "soulignement", "flou"] },
	{ nom: "Nerveux", gestes: ["impact", "glitch", "lettres"] },
	{ nom: "Éditorial", gestes: ["surlignage", "frappe", "rayons"] },
];

export function PanneauGestes({ script, surScript }: Props) {
	const choisis = script.gestes ?? [];
	const complet = choisis.length >= GESTES_PUB.max;
	return (
		<div className={styles.groupe}>
			<p className={p.aide}>
				Une pub en retient {GESTES_PUB.min} ou {GESTES_PUB.max}. Un geste non choisi prend sa version neutre : accent sans rebond, mot par mot, coupe franche.
			</p>
			<div className={styles.outils} role="group" aria-label="Jeux de gestes conseillés">
				{JEUX.map((j) => (
					<Bouton key={j.nom} variante="contour" taille="petit" onClick={() => surScript({ ...script, gestes: j.gestes })}>
						{j.nom}
					</Bouton>
				))}
				<Bouton variante="contour" taille="petit" onClick={() => surScript({ ...script, gestes: undefined })} disabled={!script.gestes}>
					Défauts du catalogue
				</Bouton>
			</div>
			<fieldset className={styles.gestes}>
				<legend>
					Gestes choisis : {choisis.length ? `${choisis.length} sur ${GESTES_PUB.max}` : "défauts du catalogue"}
				</legend>
				{GESTES.map((g) => {
					const coche = choisis.includes(g);
					return (
						<label key={g} className={coche ? styles.geste_actif : undefined}>
							<input type="checkbox" checked={coche} disabled={!coche && complet} onChange={() => surScript(basculerGeste(script, g))} />
							<span>
								<strong>{DESCRIPTIONS[g].nom}</strong>
								<span className={styles.aide}>{DESCRIPTIONS[g].detail}</span>
							</span>
						</label>
					);
				})}
			</fieldset>
			{script.gestes && script.gestes.length < GESTES_PUB.min && (
				<p className={p.aide} role="status">
					Un seul geste : choisis-en un deuxième, sinon les défauts du catalogue s'appliquent.
				</p>
			)}
		</div>
	);
}
