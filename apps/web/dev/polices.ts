// Page de comparaison des polices de titres (aucune dependance, contenu statique)
type Option = { id: string; classe: string; etiquette: string; nom: string; note: string };

const OPTIONS: Option[] = [
	{ id: "a", classe: "p-actuelle", etiquette: "Actuelle", nom: "Instrument Serif", note: "Fine, très contrastée. Peu de présence en petit, graisse unique." },
	{ id: "b", classe: "p-fraunces", etiquette: "Option 1", nom: "Fraunces", note: "Serif chaleureux, courbes douces, italique expressif. Garde la voix éditoriale." },
	{ id: "c", classe: "p-bricolage", etiquette: "Option 2", nom: "Bricolage Grotesque", note: "Grotesque vive, graisse forte, serrée. Proche du rythme de la pub." },
	{ id: "d", classe: "p-young", etiquette: "Option 3", nom: "Young Serif", note: "Serif épais d'affiche, très lisible, ton café-torréfacteur." },
];

// Texte statique, jamais de donnee utilisateur : le gabarit peut passer par innerHTML
const colonne = (o: Option) => `
<section class="colonne ${o.classe}" data-id="${o.id}" aria-label="${o.etiquette} : ${o.nom}">
	<header class="legende">
		<span class="etiquette">${o.etiquette}</span>
		<strong>${o.nom}</strong>
		<span class="note">${o.note}</span>
	</header>

	<div class="bloc hero">
		<p class="pastille"><span class="point"></span>Dans Claude</p>
		<h2 class="affiche">Ton projet raconté,<br /><em>pub et post compris.</em></h2>
		<p class="intro">Ajoute Weekli à Claude. Il lit tes dépôts publics, écrit tes posts, puis la pub vidéo de ton projet avec sa voix off.</p>
		<div class="actions"><span class="bouton plein">Ajouter à Claude</span><span class="bouton contour">Ouvrir l'app</span></div>
		<div class="maquette">
			<div class="msg moi">Fais la pub de scanner-ssl.</div>
			<div class="outil"><code>preparer_pub</code><span>3 questions</span></div>
			<div class="msg claude"><span class="post-titre">Pub · 59 secondes</span>Voix off, 9 scènes, post prêt à publier.</div>
		</div>
	</div>

	<div class="bloc section">
		<p class="sur-titre">Fonctionnalités</p>
		<h3 class="titre">Tout ce qu'il faut pour publier.<br /><em>Rien de plus.</em></h3>
		<div class="cartes">
			<article class="carte"><h4>Activité GitHub filtrée</h4><p>Tes commits de la semaine, sans le bruit : merge, typo et doublons disparaissent.</p></article>
			<article class="carte"><h4>La pub vidéo de ton projet</h4><p>Un script, une voix off, ton post. Tu exportes le MP4 depuis ton navigateur.</p></article>
		</div>
	</div>

	<div class="bloc section">
		<p class="sur-titre">Deux modes</p>
		<h3 class="titre">Claude d'abord.<br /><em>Le site en bonus.</em></h3>
		<article class="carte large">
			<span class="badge">Mode 1 · Connecteur Claude · recommandé</span>
			<h4 class="nom">Dans Claude</h4>
			<p>Tu restes dans Claude. Ton abonnement écrit, Weekli lui fournit tes commits.</p>
		</article>
	</div>
</section>`;

const planche = document.querySelector<HTMLElement>("#planche");
if (!planche) throw new Error("Zone de comparaison introuvable");
planche.innerHTML = OPTIONS.map(colonne).join("");

const boutons = [...document.querySelectorAll<HTMLButtonElement>("[data-vue]")].filter((b) => b.tagName === "BUTTON");

// Une colonne en pleine largeur, ou les quatre cote a cote
function afficher(vue: string) {
	planche!.dataset.vue = vue;
	for (const c of planche!.querySelectorAll<HTMLElement>(".colonne")) c.hidden = vue !== "planche" && c.dataset.id !== vue;
	for (const b of boutons) b.setAttribute("aria-pressed", String(b.dataset.vue === vue));
}

for (const b of boutons) b.addEventListener("click", () => afficher(b.dataset.vue ?? "planche"));
const demande = new URLSearchParams(location.search).get("vue");
afficher(demande ?? "planche");
