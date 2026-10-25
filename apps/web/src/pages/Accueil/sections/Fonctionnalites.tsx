import type { PointerEvent, ReactNode } from "react";
import { EnTete } from "./EnTete";
import s from "./Section.module.css";
import styles from "./Fonctionnalites.module.css";

type Carte = { titre: string; texte: string; icone: ReactNode; bientot?: boolean };

const CARTES: Carte[] = [
	{
		titre: "Activité GitHub filtrée",
		texte: "Tes commits de la semaine, sans le bruit : merge, typo, chore et doublons disparaissent.",
		icone: (
			<path d="M6 8.5v7M8.3 7.2l7.4 3.6M6 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM18 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
		),
	},
	{
		titre: "Contexte des projets",
		texte: "README, langages, site de démo : Claude comprend ce que tu construis avant d'écrire.",
		icone: <path d="M4 5h16v14H4zM8 9h8M8 13h5" />,
	},
	{
		titre: "Lecture des diffs",
		texte: "Claude lit les fichiers modifiés, pas seulement le message du commit, pour expliquer le problème résolu.",
		icone: <path d="M8 4v16M16 4v16M4 9h8M12 15h8" />,
	},
	{
		titre: "Ton style d'écriture",
		texte: "Donne quelques anciens posts, Weekli guide Claude pour écrire avec ta voix, pas celle d'un robot.",
		icone: <path d="M5 19l4.5-1 9.8-9.8a2 2 0 0 0-3.5-3.5L6 14.5 5 19z" />,
	},
	{
		titre: "Lecture seule",
		texte: "Scope GitHub minimal, repos publics uniquement. Weekli ne peut rien modifier, rien publier.",
		icone: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4" />,
	},
	{
		titre: "Captures et pub vidéo",
		texte: "Captures floutées de tes démos et pub vidéo de ton projet, à tes couleurs, exportée en MP4 depuis ton navigateur.",
		icone: (
			<path d="M3 8a2 2 0 0 1 2-2h3l1.5-2h5L16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
		),
	},
];

// Halo qui suit la souris : on passe la position au CSS via deux variables
function suivre(e: PointerEvent<HTMLElement>) {
	const r = e.currentTarget.getBoundingClientRect();
	e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
	e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function Fonctionnalites() {
	return (
		<section className={s.section} id="fonctionnalites">
			<EnTete surTitre="Fonctionnalités">
				Tout ce qu'il faut pour publier.
				<br />
				<em>Rien de plus.</em>
			</EnTete>
			<div className={styles.grille}>
				{CARTES.map((c) => (
					<article
						key={c.titre}
						className={`${styles.carte} ${c.bientot ? styles.bientot : ""} revele`}
						onPointerMove={suivre}
					>
						<div className={styles.icone}>
							<svg viewBox="0 0 24 24">{c.icone}</svg>
						</div>
						<h3>{c.titre}</h3>
						<p>{c.texte}</p>
					</article>
				))}
			</div>
		</section>
	);
}
