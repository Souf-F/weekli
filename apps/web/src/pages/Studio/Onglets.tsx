import { type KeyboardEvent, type ReactNode, useRef } from "react";
import styles from "./Onglets.module.css";

export type Onglet = { id: string; libelle: string };

type Props = {
	onglets: Onglet[];
	actif: string;
	surChoix: (id: string) => void;
	nom: string;
	prefixe: string;
	children: ReactNode;
};

// Onglets accessibles : tabindex itinerant, fleches gauche et droite, debut et fin
export function Onglets({ onglets, actif, surChoix, nom, prefixe, children }: Props) {
	const liste = useRef<HTMLDivElement>(null);

	const clavier = (e: KeyboardEvent<HTMLDivElement>) => {
		const i = onglets.findIndex((o) => o.id === actif);
		const cible =
			e.key === "ArrowRight" ? (i + 1) % onglets.length : e.key === "ArrowLeft" ? (i - 1 + onglets.length) % onglets.length : e.key === "Home" ? 0 : e.key === "End" ? onglets.length - 1 : -1;
		if (cible < 0) return;
		e.preventDefault();
		surChoix(onglets[cible].id);
		liste.current?.querySelectorAll<HTMLElement>('[role="tab"]')[cible]?.focus();
	};

	return (
		<div className={styles.onglets}>
			<div ref={liste} role="tablist" aria-label={nom} className={styles.liste} onKeyDown={clavier}>
				{onglets.map((o) => (
					<button
						key={o.id}
						type="button"
						role="tab"
						id={`${prefixe}-onglet-${o.id}`}
						aria-selected={o.id === actif}
						aria-controls={`${prefixe}-panneau-${o.id}`}
						tabIndex={o.id === actif ? 0 : -1}
						className={styles.onglet}
						onClick={() => surChoix(o.id)}
					>
						{o.libelle}
					</button>
				))}
			</div>
			<div role="tabpanel" id={`${prefixe}-panneau-${actif}`} aria-labelledby={`${prefixe}-onglet-${actif}`} tabIndex={0} className={styles.panneau}>
				{children}
			</div>
		</div>
	);
}
