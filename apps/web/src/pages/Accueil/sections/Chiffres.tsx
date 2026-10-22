import { useEffect, useRef } from "react";
import s from "./Section.module.css";
import styles from "./Chiffres.module.css";

const CHIFFRES = [
	{ valeur: 0, libelle: "clé stockée sur nos serveurs" },
	{ valeur: 2, libelle: "modes d'utilisation" },
	{ valeur: 100, suffixe: "%", libelle: "lecture seule" },
	{ valeur: 0, libelle: "publication sans toi" },
];

function Compteur({ valeur, suffixe = "" }: { valeur: number; suffixe?: string }) {
	const el = useRef<HTMLElement>(null);

	// Compte de 0 a la valeur quand le chiffre arrive a l'ecran
	useEffect(() => {
		const noeud = el.current;
		if (!noeud || valeur === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		noeud.textContent = `0${suffixe}`;
		const obs = new IntersectionObserver(([e]) => {
			if (!e.isIntersecting) return;
			obs.disconnect();
			const debut = performance.now();
			const pas = (t: number) => {
				const k = Math.min((t - debut) / 1400, 1);
				noeud.textContent = `${Math.round(valeur * (1 - Math.pow(1 - k, 3)))}${suffixe}`;
				if (k < 1) requestAnimationFrame(pas);
			};
			requestAnimationFrame(pas);
		});
		obs.observe(noeud);
		return () => obs.disconnect();
	}, [valeur, suffixe]);

	return (
		<strong ref={el}>
			{valeur}
			{suffixe}
		</strong>
	);
}

export function Chiffres() {
	return (
		<section className={s.section} id="securite">
			<div className={styles.grille}>
				{CHIFFRES.map((c) => (
					<div key={c.libelle} className={`${styles.chiffre} revele`}>
						<Compteur valeur={c.valeur} suffixe={c.suffixe} />
						<span>{c.libelle}</span>
					</div>
				))}
			</div>
			<p className={`${styles.note} revele`}>
				OAuth 2.1 avec PKCE, protection CSRF, sessions HttpOnly. Ta clé API ne quitte jamais ton navigateur.
			</p>
		</section>
	);
}
