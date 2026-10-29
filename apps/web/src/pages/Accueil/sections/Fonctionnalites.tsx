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
		titre: "La pub vidéo de ton projet",
		texte: "Trois questions, un script en scènes, tes couleurs et tes captures. Tu ajustes dans le studio, tu exportes le MP4.",
		icone: <path d="M4 6h12v12H4zM16 10l5-3v10l-5-3" />,
	},
	{
		titre: "Une voix off française",
		texte: "Le texte de chaque scène est lu à voix haute et cadré sur l'image, pour une pub d'environ une minute.",
		icone: <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />,
	},
	{
		titre: "Le post du projet",
		texte: "« Aujourd'hui je vous présente… » : un post LinkedIn livré avec la pub, prêt à publier avec elle.",
		icone: <path d="M4 5h16v14H4zM8 9h8M8 13h8M8 16h4" />,
	},
	{
		titre: "Ton style d'écriture",
		texte: "Donne quelques anciens posts, Weekli guide Claude pour écrire avec ta voix, pas celle d'un robot.",
		icone: <path d="M5 19l4.5-1 9.8-9.8a2 2 0 0 0-3.5-3.5L6 14.5 5 19z" />,
	},
	{
		titre: "Lecture seule",
		texte: "Scope GitHub minimal, repos publics uniquement. Weekli ne peut rien modifier, rien publier à ta place.",
		icone: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4" />,
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
