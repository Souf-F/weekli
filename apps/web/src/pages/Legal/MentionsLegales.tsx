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
				Contact : via le dépôt GitHub{" "}
				<a href="https://github.com/Souf-F/weekli">github.com/Souf-F/weekli</a> (aucun email publié).
			</p>

			<h2>Hébergeur</h2>
			<p>
				Cloudflare, Inc.
				<br />
				101 Townsend Street, San Francisco, CA 94107, États-Unis
				<br />
				<a href="https://www.cloudflare.com">cloudflare.com</a>
			</p>

			<h2>Propriété intellectuelle</h2>
			<p>
				Le code source de Weekli est publié sous licence MIT sur le dépôt GitHub. Les avatars et noms affichés dans
				l'app proviennent des profils publics GitHub des utilisateurs connectés.
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
