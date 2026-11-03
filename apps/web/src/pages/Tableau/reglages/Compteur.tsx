import e from "../Etapes.module.css";
import p from "../Panneau.module.css";

type Props = {
	etiquette: string;
	aide?: string;
	valeur: string;
	max: number;
	surChange: (v: string) => void;
	lignes?: number;
	exemple?: string;
};

// Champ texte avec compteur de caracteres (le compteur est annonce, pas seulement affiche)
export function ChampTexte({ etiquette, aide, valeur, max, surChange, lignes = 3, exemple }: Props) {
	const reste = max - valeur.length;
	return (
		<label className={p.champ}>
			<span>{etiquette}</span>
			{lignes === 1 ? (
				<input type="text" value={valeur} maxLength={max} placeholder={exemple} onChange={(ev) => surChange(ev.target.value)} />
			) : (
				<textarea rows={lignes} value={valeur} maxLength={max} placeholder={exemple} onChange={(ev) => surChange(ev.target.value)} />
			)}
			<span className={e.compteur}>
				{aide && <span>{aide}</span>}
				<span aria-live="polite" data-bas={reste < 40 ? "oui" : undefined}>
					{valeur.length} / {max}
				</span>
			</span>
		</label>
	);
}
