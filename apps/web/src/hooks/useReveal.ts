import { useEffect } from "react";

// Ajoute la classe "vu" aux elements .revele quand ils entrent a l'ecran, en cascade au sein d'un meme parent
export function useReveal(dependances: unknown[] = []) {
	useEffect(() => {
		const elements = [...document.querySelectorAll<HTMLElement>(".revele:not(.vu)")];
		const observateur = new IntersectionObserver(
			(entrees) => {
				for (const e of entrees) {
					// Un saut d'ancre peut depasser un bloc sans le croiser : on le revele aussi
					if (!e.isIntersecting && e.boundingClientRect.top > 0) continue;
					e.target.classList.add("vu");
					observateur.unobserve(e.target);
				}
			},
			{ rootMargin: "0px 0px -10% 0px" },
		);
		for (const el of elements) {
			const freres = [...(el.parentElement?.children ?? [])].filter((f) => f.classList.contains("revele"));
			el.style.setProperty("--delai", `${freres.indexOf(el) * 0.08}s`);
			observateur.observe(el);
		}
		return () => observateur.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, dependances);
}
