import { Link } from "react-router-dom";
import { PageLegale } from "./PageLegale";

export function MentionsLegales() {
	return (
		<PageLegale titre="Mentions légales" miseAJour="octobre 2026">
			<h2>Éditeur</h2>
			<p>
				Soufiane Filali, personne physique, éditeur et directeur de la publication. Weekli est un projet de portfolio non
				commercial : il n'est pas vendu et ne génère aucun revenu.
			</p>
			<p>
				Contact, y compris pour les demandes liées aux données personnelles :{" "}
				<a href="mailto:soufianefilalipro@gmail.com">soufianefilalipro@gmail.com</a>. Le code est sur{" "}
				<a href="https://github.com/Souf-F/weekli">github.com/Souf-F/weekli</a>.
			</p>

			<h2>Hébergeur</h2>
			<p>
				Cloudflare, Inc.
				<br />
				101 Townsend Street, San Francisco, CA 94107, États-Unis
				<br />
				Téléphone : <a href="tel:+18889935273">+1 888 993 5273</a>
				<br />
				<a href="https://www.cloudflare.com">cloudflare.com</a>
			</p>

			<h2>Propriété intellectuelle</h2>
			<p>
				Le code source de Weekli est publié sous licence GPL-3.0 sur le dépôt GitHub : il embarque le phonémiseur
				espeak-ng, lui-même sous GPL-3.0. Les avatars et noms affichés dans l'app proviennent des profils publics
				GitHub des utilisateurs connectés.
			</p>
			<p>
				La voix de secours générée dans le navigateur utilise le modèle Kokoro (licence Apache-2.0). Sa voix française
				<code> ff_siwis</code> est entraînée sur le corpus SIWIS, publié sous licence{" "}
				<a href="https://creativecommons.org/licenses/by/4.0/deed.fr">CC BY 4.0</a> : attribution aux auteurs du corpus
				SIWIS.
			</p>

			<h2>Responsabilité</h2>
			<p>
				Weekli ne publie rien à ta place : les posts générés sont des brouillons que tu relis, modifies et publies
				toi-même. Le service est fourni tel quel, sans garantie de disponibilité.
			</p>

			<h2>Données personnelles</h2>
			<p>
				Le détail des données traitées, leur durée de conservation et tes droits se trouvent dans la page{" "}
				<Link to="/confidentialite">Confidentialité</Link>.
			</p>
		</PageLegale>
	);
}
