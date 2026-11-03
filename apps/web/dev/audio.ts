import type { ScenePub, ScriptPub } from "@weekli/core";
import { composerAudio, importerVoix, synthetiserVoix, type VoixPreparee } from "../src/lib/pub/audio/index";
import { exporter } from "../src/lib/pub/export";
import { creerMoteur } from "../src/lib/pub/moteur";
import { type Ctx2D, HAUTEUR, LARGEUR, type RegistreScenes, type Scene } from "../src/lib/pub/scene";

// Banc de l'audio (developpement uniquement) : synthetise les voix, compose la piste, exporte la video.
// Scene factice a fond alterne noir et blanc pour que le debut de chaque scene se voie a l'image.

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const m = (texte: string, accent?: string) => ({ texte, ...(accent ? { accent } : {}) });

function scenes(coupes: boolean): ScenePub[] {
	const t = coupes ? ({ transition: "coupe" } as const) : {};
	return [
		{ id: "s1", type: "ouverture", voix: "Lundi matin. Tu as codé toute la semaine.", moment: "Lundi matin", ...t },
		{ id: "s2", type: "repetition", voix: "Et sur LinkedIn ? Rien. Encore.", lignes: [m("Rien. Encore.", "Encore.")], impact: "ENCORE", ...t },
		{ id: "s3", type: "rupture", voix: "Et si ton travail parlait enfin pour toi ?", texte: m("Et si ton travail parlait pour toi ?", "pour toi ?"), ...t },
		{ id: "s4", type: "revelation", voix: "Voici Weekli. Ton code de la semaine, raconté.", slogan: m("Weekli, ton code raconté."), ...t },
		{ id: "s5", type: "etape", voix: "Il lit ton activité GitHub.", titre: m("Il lit ton activité", "ton activité"), filigrane: "LIRE", onglet: "Lire", visuel: { type: "liste", titre: "", elements: [] }, ...t },
		{ id: "s6", type: "etape", voix: "Il écrit tes posts dans ton style.", titre: m("Il écrit dans ton style", "ton style"), filigrane: "ECRIRE", onglet: "Écrire", visuel: { type: "liste", titre: "", elements: [] }, ...t },
		{ id: "s7", type: "resultat", voix: "Et il monte la pub de ton projet.", titre: m("La pub de ton projet", "ton projet"), avant: "Avant", tampon: "PRÊT", apres: "Après", ...t },
		{ id: "s8", type: "appel", voix: "Essaie Weekli, c'est gratuit.", question: m("Prêt à essayer ?", "essayer ?"), action: "Weekli", bouton: "Essayer", ...t },
		{ id: "s9", type: "fin", voix: "À lundi.", liens: ["weekli.example"], ...t },
	];
}

function script(coupes: boolean, ambiance: "energique" | "calme", musique: boolean): ScriptPub {
	return {
		version: 1,
		titre: "Banc audio",
		projet: { nom: "Test", repo: "test", lien: "https://test.example" },
		reponses: { pourQui: "a", probleme: "b", promesse: "c" },
		marque: { primaire: "#3d4bff", logo: "monogramme", monogramme: "T", typo: "nette" },
		voix: { mode: "synthese", vitesse: 1, prononciation: {} },
		musique: musique ? ambiance : "aucune",
		captures: [],
		scenes: scenes(coupes),
	};
}

const factice: Scene = {
	dessiner(ctx: Ctx2D, i) {
		const noir = Number(i.donnees.id.slice(1)) % 2 === 0;
		ctx.fillStyle = noir ? "#000" : "#fff";
		ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
		ctx.fillStyle = noir ? "#fff" : "#000";
		ctx.font = "700 120px ui-sans-serif, system-ui, sans-serif";
		ctx.fillText(`${i.donnees.id} ${i.secondes.toFixed(2)}`, 120, HAUTEUR / 2);
	},
};
const registre = Object.fromEntries(
	["ouverture", "repetition", "boucle", "chorus", "rupture", "revelation", "etape", "resultat", "preuve", "appel", "fin"].map((t) => [t, factice]),
) as RegistreScenes;

const etat = el("etat");
el("isolation").textContent = `crossOriginIsolated : ${String(self.crossOriginIsolated)}`;

type Options = { coupes: boolean; musique: boolean; ambiance: "energique" | "calme"; recepteur?: string; nom?: string };

async function lancer(o: Options) {
	const s = script(o.coupes, o.ambiance, o.musique);
	const fichiers = el<HTMLInputElement>("importees").files;
	let voix: VoixPreparee;
	if (fichiers?.length) {
		const parId = Object.fromEntries([...fichiers].map((f) => [f.name.replace(/\.[^.]+$/, ""), f as Blob]));
		voix = await importerVoix(parId);
		s.voix.mode = "importee";
	} else {
		voix = await synthetiserVoix(s, {
			surEtat: (e) => (el("voix-etat").textContent = e.secours ? `Secours Kokoro : ${e.raison}` : `Voix : ${e.source}`),
			surProgression: (p) => (etat.textContent = p.etape === "chargement" ? `Chargement du modèle ${p.role} ${p.recu}/${p.total}` : `Synthèse ${p.scene}/${p.total}`),
		});
	}
	const moteur = creerMoteur({ script: s, scenes: registre, voixMesurees: voix.durees });
	etat.textContent = "Mixage";
	const t0 = performance.now();
	const { audio, mesures, avertissements } = await composerAudio(moteur, { voix, musique: o.musique, effets: o.musique });
	const mixageMs = performance.now() - t0;
	const r = await exporter(moteur, audio, (p) => (etat.textContent = `Image ${p.image}/${p.total}`));
	const lien = el<HTMLAnchorElement>("telecharger");
	lien.href = URL.createObjectURL(r.fichier);
	lien.download = `${o.nom ?? "pub-audio"}.${r.format.extension}`;
	lien.hidden = false;
	const resume = {
		isole: self.crossOriginIsolated,
		fils: voix.fils,
		synthetiseSecondes: +(voix.synthetiseMs / 1000).toFixed(1),
		mixageSecondes: +(mixageMs / 1000).toFixed(1),
		duree: moteur.duree,
		images: moteur.images,
		debutsScenes: moteur.timeline.scenes.map((x) => ({ id: x.id, debut: +x.debut.toFixed(3), duree: +x.duree.toFixed(3), voix: voix.durees[x.id] ?? null })),
		mesures,
		avertissements,
		format: `${r.format.video} + ${r.format.audio}`,
		octets: r.stats.octets,
	};
	el("resultat").textContent = JSON.stringify(resume, null, 2);
	if (o.recepteur) {
		await fetch(`http://127.0.0.1:${o.recepteur}/${o.nom ?? "pub-audio"}.${r.format.extension}`, { method: "POST", body: r.fichier });
	}
	etat.textContent = "Terminé";
	return resume;
}

el("lancer").addEventListener("click", () => {
	lancer({
		coupes: el<HTMLInputElement>("coupes").checked,
		musique: el<HTMLInputElement>("musique").checked,
		ambiance: el<HTMLSelectElement>("ambiance").value as "energique" | "calme",
	}).catch((err: Error) => (etat.textContent = `Erreur : ${err.message}`));
});
Object.assign(window, { lancerAudio: lancer });
