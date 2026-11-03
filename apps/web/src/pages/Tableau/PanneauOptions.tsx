import type { Langue, OptionsGeneration, Ton } from "@weekli/core";
import p from "./Panneau.module.css";

type Props = {
	options: OptionsGeneration;
	surOptions: (o: OptionsGeneration) => void;
	inclureDiffs: boolean;
	surInclureDiffs: (v: boolean) => void;
	nbSelection: number;
	nbRepos: number;
};

const TONS: { id: Ton; nom: string }[] = [
	{ id: "retour", nom: "Retour d'expérience" },
	{ id: "tuto", nom: "Mini-tuto" },
	{ id: "coulisses", nom: "Coulisses du projet" },
	{ id: "lecons", nom: "Leçons apprises" },
];

export function PanneauOptions(props: Props) {
	const { options, surOptions, inclureDiffs, surInclureDiffs, nbSelection, nbRepos } = props;

	return (
		<section className={p.panneau}>
			<div className={p.titre}>
				<div>
					<h3>Rédaction</h3>
				</div>
			</div>
			<label className={p.champ}>
				Angle
				<select value={options.ton} onChange={(e) => surOptions({ ...options, ton: e.target.value as Ton })}>
					{TONS.map((t) => (
						<option key={t.id} value={t.id}>
							{t.nom}
						</option>
					))}
				</select>
			</label>
			<div className={p.duo}>
			<label className={p.champ}>
				Langue
				<select value={options.langue} onChange={(e) => surOptions({ ...options, langue: e.target.value as Langue })}>
					<option value="fr">Français</option>
					<option value="en">Anglais</option>
				</select>
			</label>
			<label className={p.champ}>
				Nombre de posts
				<select value={options.nombre} onChange={(e) => surOptions({ ...options, nombre: Number(e.target.value) })}>
					{[1, 2, 3].map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>
			</label>
			</div>
			<label className={`${p.ligne} ${p.ligneEspacee}`}>
				<input type="checkbox" checked={inclureDiffs} onChange={(e) => surInclureDiffs(e.target.checked)} />
				Lire les diffs des commits choisis (5 max)
			</label>

			<p className={`${p.aide} ${p.aideEspacee}`} aria-live="polite">
				{nbSelection > 0
					? `${nbSelection} commit${nbSelection > 1 ? "s" : ""} sur ${nbRepos} repo${nbRepos > 1 ? "s" : ""}`
					: "Coche au moins un commit."}
			</p>
		</section>
	);
}
