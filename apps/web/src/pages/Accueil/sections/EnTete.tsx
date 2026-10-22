import type { ReactNode } from "react";
import s from "./Section.module.css";

export function EnTete({ surTitre, children }: { surTitre: string; children: ReactNode }) {
	return (
		<div className={`${s.entete} revele`}>
			<p className={s.surTitre}>{surTitre}</p>
			<h2 className={s.titre}>{children}</h2>
		</div>
	);
}
