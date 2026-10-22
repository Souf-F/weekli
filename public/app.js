import { lancerMesh } from "./mesh.js";

document.documentElement.classList.add("js");
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const souris = matchMedia("(pointer: fine)").matches;

lancerMesh(document.getElementById("mesh"));

// URL du connecteur : meme origine que le site, route /mcp
const urlMcp = `${location.origin}/mcp`;
document.getElementById("url-mcp").textContent = urlMcp;
const copier = document.getElementById("copier");
copier.addEventListener("click", async () => {
	try {
		await navigator.clipboard.writeText(urlMcp);
		copier.textContent = "Copié";
	} catch {
		copier.textContent = "Impossible";
	}
	setTimeout(() => (copier.textContent = "Copier"), 2000);
});

// Navigation qui devient opaque apres le haut de page
const nav = document.getElementById("nav");
const majNav = () => nav.classList.toggle("solide", scrollY > 40);
addEventListener("scroll", majNav, { passive: true });
majNav();

// Apparitions au scroll, en cascade dans un meme bloc
const observateur = new IntersectionObserver(
	(entrees) => {
		for (const e of entrees) {
			// Un saut d'ancre peut depasser un bloc sans le croiser : on le revele aussi
			if (!e.isIntersecting && e.boundingClientRect.top > 0) continue;
			e.target.classList.add("vu");
			observateur.unobserve(e.target);
			if (e.target.querySelector("[data-compte]")) compter(e.target.querySelector("[data-compte]"));
		}
	},
	{ rootMargin: "0px 0px -10% 0px" },
);
document.querySelectorAll(".apparait").forEach((el) => {
	const freres = [...el.parentElement.children].filter((f) => f.classList.contains("apparait"));
	el.style.setProperty("--delai", `${freres.indexOf(el) * 0.08}s`);
	observateur.observe(el);
});

// Compteurs animes
function compter(el) {
	const cible = Number(el.dataset.compte);
	const suffixe = el.dataset.suffixe ?? "";
	if (reduit || cible === 0) return (el.textContent = cible + suffixe);
	const debut = performance.now();
	const pas = (t) => {
		const k = Math.min((t - debut) / 1400, 1);
		el.textContent = Math.round(cible * (1 - Math.pow(1 - k, 3))) + suffixe;
		if (k < 1) requestAnimationFrame(pas);
	};
	requestAnimationFrame(pas);
}

// Halo des cartes qui suit la souris
document.querySelectorAll(".carte").forEach((c) =>
	c.addEventListener("pointermove", (e) => {
		const r = c.getBoundingClientRect();
		c.style.setProperty("--mx", `${e.clientX - r.left}px`);
		c.style.setProperty("--my", `${e.clientY - r.top}px`);
	}),
);

if (!reduit) {
	const maquette = document.querySelector(".inclinable");
	const scene = document.querySelector(".scene");
	const flottants = document.querySelectorAll("[data-profondeur]");
	const etapes = document.getElementById("etapes");
	const cible = { x: 0, y: 0 };
	const lisse = { x: 0, y: 0 };

	if (souris) {
		addEventListener("pointermove", (e) => {
			cible.x = (e.clientX / innerWidth) * 2 - 1;
			cible.y = (e.clientY / innerHeight) * 2 - 1;
		});
	}

	// Une seule boucle pour l'inclinaison 3D, la parallaxe souris et la parallaxe scroll
	const boucle = () => {
		lisse.x += (cible.x - lisse.x) * 0.06;
		lisse.y += (cible.y - lisse.y) * 0.06;

		const decalage = scrollY * Number(scene.dataset.vitesse);
		scene.style.transform = `translate3d(0, ${decalage}px, 0)`;
		maquette.style.transform = `rotateY(${lisse.x * 8 - 6}deg) rotateX(${-lisse.y * 6 + 4}deg)`;

		flottants.forEach((f) => {
			const p = Number(f.dataset.profondeur);
			f.style.transform = `translate3d(${lisse.x * p * 0.5}px, ${lisse.y * p * 0.5 + scrollY * p * -0.004}px, 0)`;
		});

		// La ligne des etapes se remplit pendant la traversee de la section
		const r = etapes.getBoundingClientRect();
		const k = Math.min(Math.max((innerHeight * 0.85 - r.top) / (innerHeight * 0.6), 0), 1);
		etapes.style.setProperty("--progression", k.toFixed(3));

		requestAnimationFrame(boucle);
	};
	requestAnimationFrame(boucle);
}
