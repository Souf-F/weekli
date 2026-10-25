import { useState } from "react";
import type { Post } from "@weekli/core";
import { Bouton } from "@/components/Bouton/Bouton";
import type { Moi } from "@/lib/api";
import styles from "./CartePost.module.css";

const LIMITE_LINKEDIN = 3000;

// Apercu facon LinkedIn, editable avant de copier
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
	const [copie, setCopie] = useState(false);

	const copier = async () => {
		await navigator.clipboard.writeText(post.texte);
		setCopie(true);
		setTimeout(() => setCopie(false), 2000);
	};

	return (
		<article className={styles.carte}>
			<header className={styles.entete}>
				<img crossOrigin="anonymous" src={moi.avatar} alt="" width={44} height={44} />
				<div>
					<strong>{moi.nom}</strong>
					<span>
						{post.format || "…"} · {post.source || "…"}
					</span>
				</div>
			</header>
			<h3 className={styles.titre}>{post.titre}</h3>
			<textarea
				className={styles.texte}
				value={post.texte}
				onChange={(e) => surModifier(e.target.value)}
				readOnly={enCours}
				rows={Math.max(8, post.texte.split("\n").length + 1)}
				aria-label={`Texte du post ${post.titre}`}
			/>
			<footer className={styles.pied}>
				<span className={post.texte.length > LIMITE_LINKEDIN ? styles.trop : ""}>
					{post.texte.length} / {LIMITE_LINKEDIN}
				</span>
				<Bouton taille="petit" onClick={copier} disabled={enCours || !post.texte}>
					{copie ? "Copié" : "Copier"}
				</Bouton>
			</footer>
		</article>
	);
}
