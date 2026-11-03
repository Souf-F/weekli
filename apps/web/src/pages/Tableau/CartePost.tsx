import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Post } from "@weekli/core";
import type { Moi } from "@/lib/api";
import styles from "./CartePost.module.css";

const LIMITE_LINKEDIN = 3000;
// Hauteur au-dela de laquelle le texte se replie, et marge pour ne pas replier de justesse
const HAUTEUR_REPLIEE = 520;
const MARGE_REPLI = 140;

type EtatCopie = "repos" | "copie" | "echec";

function Coche() {
	return (
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
			<path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function Copie() {
	return (
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
			<rect x="5.5" y="5.5" width="8" height="8" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
			<path d="M10.5 3.5v-.2a1.3 1.3 0 0 0-1.3-1.3H3.8a1.3 1.3 0 0 0-1.3 1.3v5.4a1.3 1.3 0 0 0 1.3 1.3h.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		</svg>
	);
}

// Apercu facon LinkedIn : texte entier a 65 caracteres de large, replie s'il est long, copiable en un clic
export function CartePost({
	post,
	moi,
	enCours,
	surModifier,
}: {
	post: Post;
	moi: Moi;
	enCours: boolean;
	surModifier: (texte: string) => void;
}) {
	const idCorps = useId();
	const contenu = useRef<HTMLDivElement>(null);
	const [hauteur, setHauteur] = useState(0);
	const [deplie, setDeplie] = useState(false);
	const [edition, setEdition] = useState(false);
	const [copie, setCopie] = useState<EtatCopie>("repos");

	// Le conteneur est rogne : on observe le contenu interne, dont la hauteur reste celle du texte entier
	useLayoutEffect(() => {
		const el = contenu.current;
		if (!el) return;
		const mesure = () => setHauteur(el.offsetHeight);
		mesure();
		const obs = new ResizeObserver(mesure);
		obs.observe(el);
		return () => obs.disconnect();
	}, [edition]);

	useEffect(() => {
		if (copie === "repos") return;
		const t = setTimeout(() => setCopie("repos"), 2200);
		return () => clearTimeout(t);
	}, [copie]);

	const longPost = hauteur > HAUTEUR_REPLIEE + MARGE_REPLI;
	const replie = longPost && !deplie && !enCours && !edition;
	const total = post.texte.length;
	const trop = total > LIMITE_LINKEDIN;

	const copier = async () => {
		try {
			await navigator.clipboard.writeText(post.texte);
			setCopie("copie");
		} catch {
			setCopie("echec");
		}
	};

	// Pendant la redaction on suit la hauteur reelle en pixels : le repli final s'anime sans saut
	const hauteurMax = replie ? HAUTEUR_REPLIEE : hauteur || undefined;

	return (
		<article className={styles.carte} aria-busy={enCours}>
			<header className={styles.entete}>
				<img crossOrigin="anonymous" src={moi.avatar} alt="" width={44} height={44} />
				<div>
					<strong>{moi.nom}</strong>
					<span>
						{post.format || "En préparation"} · {post.source || "…"}
					</span>
				</div>
			</header>

			<h3 className={styles.titre}>{post.titre}</h3>

			{edition ? (
				<textarea
					className={styles.edition}
					value={post.texte}
					onChange={(e) => surModifier(e.target.value)}
					rows={Math.min(40, Math.max(10, post.texte.split("\n").length + 2))}
					aria-label={`Texte du post ${post.titre}`}
				/>
			) : (
				<div
					id={idCorps}
					className={`${styles.fenetre} ${replie ? styles.replie : ""} ${enCours ? styles.flux : ""}`}
					style={{ maxHeight: hauteurMax }}
				>
					<div ref={contenu} className={styles.texte}>
						{post.texte}
						{enCours && <span className={styles.curseur} aria-hidden="true" />}
					</div>
				</div>
			)}

			{longPost && !enCours && !edition && (
				<button
					type="button"
					className={styles.suite}
					aria-expanded={!replie}
					aria-controls={idCorps}
					onClick={() => setDeplie(replie)}
				>
					{replie ? "Lire la suite" : "Réduire"}
				</button>
			)}

			<footer className={styles.pied}>
				<span className={`${styles.compte} ${trop ? styles.trop : ""}`}>
					{total.toLocaleString("fr-FR")} / {LIMITE_LINKEDIN.toLocaleString("fr-FR")} caractères
					{trop && " : au-dessus de la limite LinkedIn"}
				</span>
				<div className={styles.actions}>
					<button
						type="button"
						className={styles.secondaire}
						onClick={() => setEdition((e) => !e)}
						disabled={enCours || !post.texte}
						aria-pressed={edition}
					>
						{edition ? "Terminer" : "Modifier"}
					</button>
					<button
						type="button"
						className={`${styles.copier} ${copie === "copie" ? styles.fait : ""}`}
						onClick={copier}
						disabled={enCours || !post.texte}
					>
						{copie === "copie" ? <Coche /> : <Copie />}
						{copie === "copie" ? "Copié" : copie === "echec" ? "Copie impossible" : "Copier"}
					</button>
				</div>
				<span className={styles.annonce} role="status" aria-live="polite">
					{copie === "copie" ? "Post copié dans le presse-papiers" : copie === "echec" ? "La copie a échoué, sélectionne le texte à la main" : ""}
				</span>
			</footer>
		</article>
	);
}
