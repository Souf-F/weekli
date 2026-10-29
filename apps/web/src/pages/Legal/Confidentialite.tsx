import { Link } from "react-router-dom";
import { PageLegale } from "./PageLegale";
import styles from "./Legal.module.css";

const CONTACT = "soufianefilalipro@gmail.com";

export function Confidentialite() {
	return (
		<PageLegale titre="Confidentialité" miseAJour="octobre 2026">
			<p>
				Weekli est un projet de portfolio non commercial. Cette page dit quelles données le service traite, pourquoi, où
				elles vont, combien de temps elles restent et comment les récupérer ou les effacer.
			</p>

			<h2>Qui est responsable</h2>
			<p>
				Soufiane Filali, éditeur du projet et responsable du traitement. Pour toute question ou demande sur tes données :{" "}
				<a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
			</p>

			<h2>Âge minimal</h2>
			<p>
				Weekli passe par un compte GitHub, qui impose un âge minimal de 13 ans. En France, le consentement d'un mineur à
				un service en ligne n'est valable seul qu'à partir de 15 ans : en dessous, l'accord d'un parent est nécessaire.
			</p>

			<h2>Les données traitées, pourquoi et combien de temps</h2>
			<p>
				La base légale de chaque traitement est l'exécution du service que tu demandes (RGPD, article 6.1.b), sauf pour la
				lutte contre les abus (intérêt légitime, article 6.1.f).
			</p>
			<div className={styles.tableau}>
				<table>
					<thead>
						<tr>
							<th scope="col">Traitement</th>
							<th scope="col">Données</th>
							<th scope="col">Conservation</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<th scope="row">Connexion au site</th>
							<td>Identifiant, login, nom, avatar et token GitHub (scope <code>read:user</code>, lecture du public seule)</td>
							<td>Session de 8 heures</td>
						</tr>
						<tr>
							<th scope="row">Connecteur Claude (MCP)</th>
							<td>Identifiant, login, nom et token GitHub, dans l'autorisation donnée à Claude</td>
							<td>Autorisation de 30 jours non renouvelés ; session technique effacée après 24 h d'inactivité</td>
						</tr>
						<tr>
							<th scope="row">Brouillons de posts</th>
							<td>Titre, texte, format, source, date</td>
							<td>90 jours</td>
						</tr>
						<tr>
							<th scope="row">Pubs vidéo</th>
							<td>Scripts : textes, couleurs, adresses de pages (jamais la vidéo ni les images)</td>
							<td>90 jours</td>
						</tr>
						<tr>
							<th scope="row">Style d'écriture</th>
							<td>Exemples de posts et profil de style</td>
							<td>90 jours</td>
						</tr>
						<tr>
							<th scope="row">Domaines vérifiés</th>
							<td>Noms de domaine et date de vérification</td>
							<td>90 jours</td>
						</tr>
						<tr>
							<th scope="row">Captures de sites</th>
							<td>Image de la page demandée</td>
							<td>Aucune : renvoyée puis oubliée</td>
						</tr>
						<tr>
							<th scope="row">Voix off de la pub</th>
							<td>Texte de chaque phrase, sans ton identité (voir « Microsoft »)</td>
							<td>Audio gardé 90 jours, non rattaché à ton compte</td>
						</tr>
						<tr>
							<th scope="row">Lutte contre les abus</th>
							<td>Adresse IP à la connexion, identifiant de compte ensuite</td>
							<td>60 secondes dans le limiteur de débit ; le quota de voix off (compteur par compte et par heure) reste 2 heures</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p>
				Les 90 jours sont renouvelés à chaque enregistrement : tant que tu modifies une donnée, elle reste ; si rien
				n'est enregistré pendant 90 jours, elle est supprimée. Les brouillons et pubs de plus de 90 jours sont aussi
				retirés à la lecture. Le token GitHub, les sessions, les brouillons, les pubs, le style et les domaines sont
				chiffrés (AES-256-GCM) avant d'être stockés dans Cloudflare KV. Les échanges passent par HTTPS.
			</p>

			<h2>Ce qui reste dans ton navigateur</h2>
			<p>
				Les vidéos sont générées dans ton navigateur : la vidéo, le logo et les images importées ne sont jamais envoyés à
				Weekli. Le modèle de voix de secours (Kokoro) et ces fichiers sont gardés dans le stockage du navigateur
				(IndexedDB) jusqu'à ce que tu les effaces, avec « Supprimer mes données » dans les réglages ou dans les
				réglages du navigateur. Ta clé API, ton choix de modèle et le nom du dernier repo ouvert restent aussi dans ton
				navigateur (voir plus bas).
			</p>

			<h2>Sous-traitants et autres destinataires</h2>
			<div className={styles.tableau}>
				<table>
					<thead>
						<tr>
							<th scope="col">Destinataire</th>
							<th scope="col">Rôle</th>
							<th scope="col">Hors Union européenne</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<th scope="row">Cloudflare, Inc.</th>
							<td>Hébergement (Workers, KV, Durable Objects), captures d'écran, journaux techniques</td>
							<td>États-Unis, réseau mondial. Cadre de protection des données UE-États-Unis et clauses contractuelles types</td>
						</tr>
						<tr>
							<th scope="row">GitHub, Inc. (Microsoft)</th>
							<td>Connexion, lecture de tes repos publics</td>
							<td>États-Unis. Cadre de protection des données UE-États-Unis</td>
						</tr>
						<tr>
							<th scope="row">Microsoft (service de lecture d'Edge)</th>
							<td>Service tiers qui reçoit les textes de voix off. Pas un sous-traitant : aucun contrat avec Weekli, usage non officiel</td>
							<td>États-Unis. Aucun cadre contractuel entre Weekli et Microsoft pour ce service</td>
						</tr>
						<tr>
							<th scope="row">Anthropic</th>
							<td>Seulement si tu utilises ta clé API, à ton initiative</td>
							<td>États-Unis, selon les conditions de ton compte Anthropic</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h2>Microsoft et la voix off</h2>
			<p>
				Quand tu génères la voix d'une pub, le texte de chaque phrase (400 caractères au plus) est envoyé par le serveur
				Weekli au service de lecture d'Edge de Microsoft, qui renvoie l'audio. Weekli n'a ni contrat ni accord
				d'utilisation avec Microsoft pour ce service et l'appelle de façon non officielle : Microsoft peut le couper ou
				le refuser sans préavis, et ses conditions d'utilisation ne l'autorisent peut-être pas. C'est un choix assumé de
				l'éditeur, limité à ce texte. Ton identité, ton login et ton adresse IP
				ne lui sont pas transmis. L'audio est conservé 90 jours côté Weekli, indexé par l'empreinte du texte et non
				rattaché à ton compte : il ne peut donc pas être retrouvé ni effacé par compte, et il est partagé entre
				utilisateurs qui écrivent la même phrase. N'écris pas de donnée personnelle dans une voix off. Pour que rien ne parte chez
				Microsoft, choisis « Ma voix » ou « Sans voix » dans le studio. La voix Kokoro, calculée dans ton navigateur
				sans rien envoyer, prend le relais automatiquement quand le service est indisponible.
			</p>

			<h2>Ta clé API Anthropic</h2>
			<p>
				Elle n'est jamais envoyée au serveur Weekli. Elle reste dans ton navigateur (effacée à la fermeture de
				l'onglet, sauf si tu choisis de la mémoriser sur cet appareil) et part directement vers{" "}
				<code>api.anthropic.com</code> quand tu génères un post, un script de pub ou le post d'un projet. Les extraits
				de commits, le README et ton style envoyés à Claude sont alors traités par Anthropic, selon sa propre politique.
			</p>

			<h2>Cookies et traceurs</h2>
			<p>
				Weekli n'utilise aucun cookie publicitaire, aucun outil de mesure d'audience et aucun traceur. Seuls des cookies
				strictement nécessaires, illisibles par les scripts : le cookie de session (8 heures, identifiant aléatoire), un
				cookie temporaire de 10 minutes pendant la connexion GitHub et, quand tu autorises Claude à se connecter, trois
				cookies de la bibliothèque d'autorisation : <code>__Host-oauth-consent</code> et{" "}
				<code>__Host-oauth-upstream</code> (10 minutes) et <code>__Host-oauth-approvals</code> (ton accord mémorisé,
				30 jours). Ils ne demandent pas de bandeau de consentement.
			</p>

			<h2>Journaux et hébergement</h2>
			<p>
				Le site est hébergé par Cloudflare, Inc. (voir les <Link to="/mentions-legales">mentions légales</Link>).
				Cloudflare tient des journaux techniques du Worker, selon sa propre durée de rétention. Selon l'erreur, Weekli y écrit
				un message technique qui peut contenir l'adresse d'une requête GitHub (par exemple le nom d'un repo public que
				tu consultes) ou l'adresse d'une page que tu fais capturer ; jamais ton token, ta clé API ni le texte de tes
				posts.
			</p>

			<h2>Tes droits</h2>
			<p>
				Conformément au RGPD, tu peux demander l'accès à tes données, leur rectification, leur effacement, la limitation
				ou l'opposition à leur traitement, et leur portabilité.
			</p>
			<ul>
				<li>
					<strong>Export et portabilité</strong> : dans <Link to="/app/reglages">les réglages</Link>, « Télécharger mes
					données » te remet un fichier JSON avec ton profil, tes brouillons, tes pubs, ton style et tes domaines. Le
					token GitHub n'y figure jamais.
				</li>
				<li>
					<strong>Effacement complet</strong> : dans les réglages, « Supprimer mes données » efface tes brouillons, pubs,
					style et domaines, révoque les autorisations données à Claude, détruit les sessions du connecteur, retire
					l'autorisation de Weekli sur ton compte GitHub, ferme toutes tes sessions et te déconnecte, ainsi que ce que
					Weekli garde dans ce navigateur : ta clé API, ton modèle, le dernier repo ouvert, les images et logos importés
					dans le studio et le modèle de voix de secours. Si une étape échoue, l'opération peut être relancée. Restent hors de
					portée : l'audio de voix en cache sur le serveur (non rattaché à toi, 90 jours).
				</li>
				<li>
					<strong>Autres droits</strong> : écris à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
				</li>
				<li>
					<strong>Réclamation</strong> : tu peux saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>) si tu estimes
					que tes droits ne sont pas respectés.
				</li>
			</ul>
		</PageLegale>
	);
}
