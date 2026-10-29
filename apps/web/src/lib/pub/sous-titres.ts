import { dureeVoixEstimee } from "@weekli/core";
import type { Moteur } from "./moteur";
import { DECALAGE_VOIX } from "./synchro";

const LIGNE_MAX = 42;
const DUREE_MIN = 0.8;

function horodatage(s: number): string {
	const ms = Math.round(Math.max(s, 0) * 1000);
	const p = (n: number, l = 2) => String(n).padStart(l, "0");
	return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

// Decoupe le texte en sous-titres de deux lignes de 42 caracteres au plus, a la frontiere des mots
function decouper(texte: string): string[] {
	const mots = texte.split(/\s+/).filter(Boolean);
	const lignes: string[] = [];
	let ligne = "";
	for (const mot of mots) {
		if (ligne && `${ligne} ${mot}`.length > LIGNE_MAX) {
			lignes.push(ligne);
			ligne = mot;
		} else ligne = ligne ? `${ligne} ${mot}` : mot;
	}
	if (ligne) lignes.push(ligne);
	const cartons: string[] = [];
	for (let i = 0; i < lignes.length; i += 2) cartons.push(lignes.slice(i, i + 2).join("\n"));
	return cartons;
}

// SRT a partir des voix : chaque phrase de scene commence DECALAGE_VOIX apres le debut de la scene
// (meme repere que le mixage) et dure autant que la voix mesuree, repartie au prorata des caracteres.
export function genererSrt(moteur: Moteur, voixMesurees: Readonly<Record<string, number>> = {}): string {
	const { script, timeline } = moteur;
	if (script.voix.mode === "aucune") return "";
	const cues: { debut: number; fin: number; texte: string }[] = [];
	for (const s of timeline.scenes) {
		const texte = script.scenes[s.index].voix.trim();
		if (!texte) continue;
		const voix = Object.hasOwn(voixMesurees, s.id) ? voixMesurees[s.id] : dureeVoixEstimee(texte, script.voix.vitesse);
		const debut = s.debut + DECALAGE_VOIX;
		const limite = Math.min(debut + voix, s.fin, timeline.duree);
		const morceaux = decouper(texte);
		const total = morceaux.reduce((n, m) => n + m.length, 0);
		let curseur = debut;
		for (const m of morceaux) {
			const fin = Math.min(curseur + ((limite - debut) * m.length) / total, limite);
			cues.push({ debut: curseur, fin: Math.max(fin, Math.min(curseur + DUREE_MIN, limite)), texte: m });
			curseur = fin;
		}
	}
	cues.sort((a, b) => a.debut - b.debut);
	for (let i = 0; i < cues.length - 1; i++) cues[i].fin = Math.min(cues[i].fin, cues[i + 1].debut);
	return `${cues
		.filter((c) => c.fin > c.debut)
		.map((c, i) => `${i + 1}\n${horodatage(c.debut)} --> ${horodatage(c.fin)}\n${c.texte}`)
		.join("\n\n")}\n`;
}
