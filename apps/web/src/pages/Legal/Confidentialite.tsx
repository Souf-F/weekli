import { Link } from "react-router-dom";
import { PageLegale } from "./PageLegale";

export function Confidentialite() {
	return (
		<PageLegale titre="Confidentialité" miseAJour="octobre 2026">
			<p>
				Weekli est un projet de portfolio non commercial. Cette page explique quelles données le service traite, où elles
				vont, combien de temps elles restent et comment les effacer.
			</p>

			<h2>Qui est responsable</h2>
			<p>
				Soufiane Filali, éditeur du projet. Aucun email n'est publié : pour toute question, ouvre une discussion sur le
				dépôt <a href="https://github.com/Souf-F/weekli">github.com/Souf-F/weekli</a>. Ce dépôt est public, n'y écris
				donc aucune donnée personnelle.
			</p>

			<h2>Âge minimal</h2>
			<p>
				Weekli passe par un compte GitHub, qui impose un âge minimal de 13 ans. En France, le consentement d'un mineur
				à un service en ligne n'est valable seul qu'à partir de 15 ans : en dessous, l'accord d'un parent est nécessaire.
			</p>

			<h2>Les données traitées</h2>
			<ul>
				<li>
					<strong>Ton login GitHub et tes données publiques GitHub</strong> (nom, avatar, repos publics et commits).
					Weekli demande le scope <code>read:user</code> : il ne peut lire que du public, rien modifier ni publier.
				</li>
				<li>
					<strong>Tes brouillons de posts</strong>, enregistrés quand tu les sauvegardes dans l'historique.
				</li>
				<li>
					<strong>Tes domaines vérifiés</strong>, ceux dont tu as prouvé la propriété pour autoriser les captures.
				</li>
				<li>
					<strong>Ton style d'écriture</strong>, les exemples de posts que tu colles dans les réglages.
				</li>
				<li>
					<strong>Ton adresse IP</strong>, utilisée uniquement pour limiter les abus (par exemple 20 requêtes par minute
					sur la connexion).
				</li>
			</ul>
			<p>
				Les captures d'écran de tes sites ne sont jamais stockées : l'image t'est renvoyée puis oubliée. Les vidéos sont
				générées entièrement dans ton navigateur.
			</p>

			<h2>Chiffrement et sécurité</h2>
			<p>
				Le token GitHub, les sessions, les brouillons et le style d'écriture sont chiffrés (AES-256-GCM) avant d'être
				stockés dans Cloudflare KV. Les échanges passent par HTTPS et le site applique une politique de sécurité de
				contenu stricte. Le détail est public dans le dépôt, fichier <code>docs/securite.md</code>.
			</p>

			<h2>Ta clé API Anthropic</h2>
			<p>
				Elle n'est jamais envoyée au serveur Weekli. Elle reste dans ton navigateur (effacée à la fermeture de
				l'onglet, sauf si tu choisis de la mémoriser sur cet appareil) et part directement vers{" "}
				<code>api.anthropic.com</code> quand tu génères un post. Les extraits de commits que tu choisis d'envoyer à
				Claude sont alors traités par Anthropic, selon sa propre politique.
			</p>

			<h2>Durée de conservation</h2>
			<p>
				Tes données sont conservées 90 jours. Ce délai est renouvelé à chaque enregistrement de tes données : si rien
				n'est enregistré pendant 90 jours, elles sont supprimées. Le cookie de session dure 8 heures.
			</p>

			<h2>Cookies et traceurs</h2>
			<p>
				Weekli n'utilise aucun cookie publicitaire, aucun outil de mesure d'audience et aucun traceur. Le seul cookie
				est le cookie de session, strictement nécessaire à la connexion : il contient un identifiant aléatoire, rien
				d'autre. Il ne demande donc pas de bandeau de consentement.
			</p>

			<h2>Hébergement</h2>
			<p>
				Le site et ses données sont hébergés par Cloudflare, Inc. (voir les <Link to="/mentions-legales">mentions légales</Link>
				).
			</p>

			<h2>Tes droits</h2>
			<p>
				Conformément au RGPD, tu peux demander l'accès à tes données, leur rectification, leur effacement, la limitation
				ou l'opposition à leur traitement, et leur portabilité.
			</p>
			<ul>
				<li>
					<strong>Effacement</strong> : connecte-toi, ouvre <Link to="/app/reglages">les réglages</Link> et utilise le
					bouton « Supprimer mes données ». Tout ce que Weekli détient sur toi est supprimé immédiatement : session,
					token GitHub, brouillons, domaines et style d'écriture. Les réglages gardés dans ton navigateur sont effacés
					aussi.
				</li>
				<li>
					<strong>Autres droits</strong> : ouvre une discussion sur le dépôt GitHub sans y mettre de donnée personnelle,
					nous conviendrons ensuite d'un moyen d'échange adapté.
				</li>
				<li>
					<strong>Réclamation</strong> : tu peux saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>) si tu estimes
					que tes droits ne sont pas respectés.
				</li>
			</ul>
		</PageLegale>
	);
}
