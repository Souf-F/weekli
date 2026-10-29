import type { Scene } from "@weekli/core";
import styles from "./Studio.module.css";

const NOMS: Record<Scene["type"], string> = {
	titre: "Titre",
	terminal: "Terminal",
	liste: "Liste",
	avantApres: "Avant / après",
	citation: "Citation",
	fin: "Fin",
};

type Props = { index: number; scene: Scene; surModifier: (s: Scene) => void; surRetirer: () => void };

// Edition des textes d'une scene ; les listes s'editent une ligne par element
export function EditeurScene({ index, scene, surModifier, surRetirer }: Props) {
	const champ = (cle: string, valeur: string, multi = false) => {
		const commun = {
			value: valeur,
			"aria-label": `${NOMS[scene.type]} ${index + 1} : ${cle}`,
			onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
				surModifier({
					...scene,
					[cle]: multi ? e.target.value.split("\n") : e.target.value,
				} as Scene),
		};
		return multi ? <textarea rows={3} {...commun} /> : <input {...commun} />;
	};

	return (
		<article className={styles.scene}>
			<header>
				<span>
					{String(index + 1).padStart(2, "0")} · {NOMS[scene.type]}
				</span>
				<label>
					<input
						type="number"
						min={2}
						max={7}
						value={scene.duree}
						onChange={(e) => surModifier({ ...scene, duree: Number(e.target.value) })}
						aria-label="Durée en secondes"
					/>
					s
				</label>
				<button type="button" onClick={surRetirer} aria-label={`Retirer la scène ${index + 1}`}>
					×
				</button>
			</header>
			{scene.type === "titre" && (
				<>
					{champ("titre", scene.titre)}
					{champ("sousTitre", scene.sousTitre ?? "")}
				</>
			)}
			{scene.type === "terminal" && (
				<>
					{champ("commande", scene.commande)}
					{champ("lignes", scene.lignes.join("\n"), true)}
				</>
			)}
			{scene.type === "liste" && (
				<>
					{champ("titre", scene.titre)}
					{champ("elements", scene.elements.join("\n"), true)}
				</>
			)}
			{scene.type === "avantApres" && (
				<>
					{champ("avant", scene.avant)}
					{champ("apres", scene.apres)}
					{champ("legende", scene.legende)}
				</>
			)}
			{scene.type === "citation" && champ("texte", scene.texte, false)}
			{scene.type === "fin" && (
				<>
					{champ("titre", scene.titre)}
					{champ("lien", scene.lien ?? "")}
				</>
			)}
		</article>
	);
}
