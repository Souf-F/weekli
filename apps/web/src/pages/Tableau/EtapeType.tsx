import { CATALOGUE_POSTS, type TypePost } from "@weekli/core";
import p from "./Panneau.module.css";
import e from "./Etapes.module.css";

type Props = {
	type: TypePost | null;
	repos: string[];
	surChoisir: (t: TypePost) => void;
};

// Ordre fixe : quatre types portent sur un repo, "Ma semaine" est separe par un filet
const TYPES_REPO: TypePost[] = ["presentation", "tuto", "coulisses", "lecon"];

function Carte({ id, numero, type, surChoisir }: { id: TypePost; numero: string; type: TypePost | null; surChoisir: (t: TypePost) => void }) {
	const d = CATALOGUE_POSTS[id];
	return (
		<label className={e.carte}>
			<input type="radio" name="type" value={id} checked={type === id} onChange={() => surChoisir(id)} />
			<span className={e.carteNumero} aria-hidden="true">
				{numero}
			</span>
			<span className={e.carteNom}>{d.nom}</span>
			<span className={e.carteBut}>{d.but}</span>
			<span className={e.carteLit}>
				<span>Weekli lit</span> {d.lit.slice(0, 3).join(", ")}
			</span>
			<span className={e.carteCoche} aria-hidden="true">
				{type === id ? "Choisi" : ""}
			</span>
		</label>
	);
}

export function EtapeType({ type, repos, surChoisir }: Props) {
	const cible = repos.length === 1 ? repos[0] : repos.length > 1 ? `${repos.length} repos` : "";
	return (
		<div className={e.corps}>
			<h2 id="titre-etape" tabIndex={-1} className={e.titre}>
				Quel type de post ?
			</h2>
			<p className={p.aide}>{cible ? `Pour ${cible}. ` : ""}Chaque type lit des choses différentes dans ton repo.</p>
			<fieldset className={e.cartes}>
				<legend className={e.lecteur}>Type de post</legend>
				{TYPES_REPO.map((id, i) => (
					<Carte key={id} id={id} numero={`0${i + 1}`} type={type} surChoisir={surChoisir} />
				))}
				<div className={e.filet} aria-hidden="true" />
				<Carte id="semaine" numero="05" type={type} surChoisir={surChoisir} />
			</fieldset>
		</div>
	);
}
