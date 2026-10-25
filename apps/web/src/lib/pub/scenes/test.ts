import type { Palette, ScenePub } from "@weekli/core";
import type { Ctx2D, InstantScene, RegistreScenes, Scene } from "../scene";
import { HAUTEUR, LARGEUR } from "../scene";

// Scene de test : fond uni, un texte, un minuteur. Sert a valider la chaine (timeline, transitions,
// export, synchro) sans dependre des vraies scenes (F5 a F7).

function texteDeScene(d: ScenePub): string {
	switch (d.type) {
		case "etape":
			return d.titre.texte; // une etape sans capture n'affiche que son titre
		case "rupture":
			return d.texte.texte;
		case "revelation":
			return d.slogan.texte;
		case "boucle":
			return d.phrase.texte;
		case "chorus":
		case "resultat":
			return d.titre.texte;
		case "appel":
			return d.question.texte;
		case "repetition":
			return d.impact;
		case "ouverture":
			return d.moment;
		case "preuve":
			return d.surtitre;
		case "fin":
			return d.slogan ?? d.liens[0] ?? "";
	}
}

const DARK = new Set(["ouverture", "repetition", "boucle", "chorus", "revelation", "preuve", "fin"]);
const PAD = (n: number) => String(n).padStart(2, "0");
const minuteur = (s: number) => `${PAD(Math.floor(s / 60))}:${PAD(Math.floor(s) % 60)}.${String(Math.floor((s % 1) * 100)).padStart(2, "0")}`;

function dessiner(ctx: Ctx2D, i: InstantScene, p: Palette) {
	const sombre = DARK.has(i.donnees.type);
	const encre = sombre ? p.blanc : p.encre;
	ctx.fillStyle = sombre ? p.sombre : p.clair;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = sombre ? p.accentSombre : p.accentClair;
	ctx.font = "600 36px ui-sans-serif, system-ui, sans-serif";
	ctx.fillText(i.donnees.type.toUpperCase() + (i.scene.etape ? `  ${i.scene.etape.numero}/${i.scene.etape.total}` : ""), 120, 160);

	ctx.fillStyle = encre;
	ctx.font = "700 120px ui-sans-serif, system-ui, sans-serif";
	const reveil = Math.min(i.secondes / 0.4, 1);
	ctx.globalAlpha = reveil;
	ctx.fillText(texteDeScene(i.donnees), 120, HAUTEUR / 2 + 40 - (1 - reveil) * 24, LARGEUR - 240);
	ctx.globalAlpha = 1;

	ctx.font = "500 40px ui-monospace, Menlo, monospace";
	ctx.fillStyle = sombre ? p.encreDouce : p.encreDouce;
	ctx.fillText(`pub ${minuteur(i.temps)}   scene ${minuteur(i.secondes)}`, 120, HAUTEUR - 96);

	// barre de progression de la scene
	ctx.fillStyle = sombre ? p.accentSombre : p.accentClair;
	ctx.fillRect(0, HAUTEUR - 12, LARGEUR * i.t, 12);
}

export const sceneDeTest: Scene = { dessiner };

export const registreDeTest = (): RegistreScenes => ({
	ouverture: sceneDeTest,
	repetition: sceneDeTest,
	boucle: sceneDeTest,
	chorus: sceneDeTest,
	rupture: sceneDeTest,
	revelation: sceneDeTest,
	etape: sceneDeTest,
	resultat: sceneDeTest,
	preuve: sceneDeTest,
	appel: sceneDeTest,
	fin: sceneDeTest,
});
