import { useEffect, useRef } from "react";
import s from "./Section.module.css";
import styles from "./Chiffres.module.css";

// Chaque chiffre est verifiable dans le depot :
// - 6 outils : les registerTool de apps/server/src/mcp/agent.ts
// - 0 EUR : brief.md (budget 0 EUR, aucun service payant), licence MIT
// - 0 cle API stockee : le Worker n'appelle jamais Anthropic, la cle reste dans le navigateur (lib/reglages.ts)
// - 90 jours : apps/server/src/lib/conservation.ts, avec un test qui verrouille la valeur
const NBSP = "\u00a0";
const CHIFFRES = [
	{ valeur: 6, libelle: "outils MCP mis à disposition de Claude" },
	{ valeur: 0, suffixe: `${NBSP}€`, libelle: "à payer pour Weekli, open source sous licence MIT" },
	{ valeur: 0, libelle: "clé API stockée sur nos serveurs" },
	{ valeur: 90, libelle: "jours sans activité, puis tes données sont effacées" },
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
				Connexion GitHub en OAuth avec PKCE, scope read:user, cookie de session HttpOnly de 8 heures. En mode site, ta
				clé API part directement vers Anthropic, jamais vers nos serveurs.
			</p>
		</section>
	);
}
