import { dureeVoixEstimee, type MotsAccent, type ScenePub, type ScriptPub, type Timeline } from "@weekli/core";
import { DECALAGE_VOIX } from "../synchro";
import { DUREE_MONTEE, type TypeEffet } from "./effets";

// Quels effets, a quel instant : fonction pure de la timeline (donc des durees de voix mesurees).

export type EvenementSon = { type: TypeEffet; debut: number; duree?: number }; // secondes ; debut peut etre < 0

// Le souffle commence un peu avant la transition pour qu'elle se fasse entendre avant de se voir
const AVANCE_SOUFFLE = 0.1;
// L'impact tombe quand le slogan est pose : fin de la transition d'entree plus une courte attente
const ATTENTE_IMPACT = 0.15;
const ECART_CLIC_MIN = 0.12;

function motsAccent(scene: ScenePub): MotsAccent[] {
	switch (scene.type) {
		case "repetition":
			return scene.lignes;
		case "boucle":
			return [scene.phrase];
		case "chorus":
			return [scene.titre, scene.chute];
		case "rupture":
			return [scene.texte];
		case "etape":
			return [scene.titre];
		case "resultat":
			return scene.chute ? [scene.titre, scene.chute] : [scene.titre];
		case "appel":
			return scene.badge ? [scene.question, scene.badge] : [scene.question];
		default:
			return []; // la revelation a son impact, les autres scenes n'ont pas de mot surligne
	}
}

export function planifierEffets(
	script: ScriptPub,
	timeline: Timeline,
	voixMesurees: Readonly<Record<string, number>> = {},
): EvenementSon[] {
	const evenements: EvenementSon[] = [];
	for (const s of timeline.scenes) {
		if (s.chevauchement > 0) {
			evenements.push({ type: "souffle", debut: s.debut - AVANCE_SOUFFLE, duree: 0.35 + s.chevauchement });
		}
		const donnees = script.scenes[s.index];
		if (s.type === "revelation") {
			const impact = s.debut + s.chevauchement + ATTENTE_IMPACT;
			evenements.push({ type: "montee", debut: impact - DUREE_MONTEE }, { type: "impact", debut: impact });
			continue;
		}
		const voix = donnees.voix.trim();
		const dureeVoix = Object.hasOwn(voixMesurees, s.id) ? voixMesurees[s.id] : voix ? dureeVoixEstimee(voix, script.voix.vitesse) : 0;
		const clics: number[] = [];
		for (const m of motsAccent(donnees)) {
			if (!m.accent) continue;
			const rang = m.texte.indexOf(m.accent);
			if (rang < 0) continue;
			// Avec une voix, le clic suit le mot dit (position dans le texte, proportionnelle a la voix)
			const t = dureeVoix > 0 ? s.debut + DECALAGE_VOIX + (rang / m.texte.length) * dureeVoix : s.debut + s.chevauchement + 0.4;
			if (t < s.fin && clics.every((c) => Math.abs(c - t) >= ECART_CLIC_MIN)) clics.push(t);
		}
		for (const t of clics) evenements.push({ type: "clic", debut: t });
	}
	return evenements.sort((a, b) => a.debut - b.debut);
}
