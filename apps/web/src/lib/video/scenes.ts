import type { Scene } from "@weekli/core";

// Dessin de chaque type de scene sur un canvas 1080 x 1350 (format 4:5 LinkedIn).
// t va de 0 a 1 sur la duree de la scene ; chaque scene gere son entree et sa sortie.

export const LARGEUR = 1080;
export const HAUTEUR = 1350;

const C = {
	platine: "#e5e4e2",
	lavande: "#e6e0f0",
	lavandePro: "#c9bedd",
	moka: "#6f4e37",
	mokaClair: "#b89f8d",
	espresso: "#2a1c13",
	doux: "#6a5a4f",
};
const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = '"Geist", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const MARGE = 96;

type Ctx = CanvasRenderingContext2D;

// Courbes d'animation
const sortie = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
const fenetre = (t: number, debut: number, fin: number) => sortie((t - debut) / (fin - debut));
// Fondu global : entree sur les 12 premiers %, sortie sur les 10 derniers
const visibilite = (t: number) => Math.min(fenetre(t, 0, 0.12), 1 - fenetre(t, 0.9, 1));

function lignesCoupees(ctx: Ctx, texte: string, largeurMax: number): string[] {
	const mots = texte.split(" ");
	const lignes: string[] = [];
	let ligne = "";
	for (const mot of mots) {
		const essai = ligne ? `${ligne} ${mot}` : mot;
		if (ctx.measureText(essai).width > largeurMax && ligne) {
			lignes.push(ligne);
			ligne = mot;
		} else ligne = essai;
	}
	if (ligne) lignes.push(ligne);
	return lignes;
}

function texteRevele(
	ctx: Ctx,
	texte: string,
	x: number,
	y: number,
	hauteurLigne: number,
	largeurMax: number,
	t: number,
	decalage = 0,
) {
	lignesCoupees(ctx, texte, largeurMax).forEach((ligne, i) => {
		const k = fenetre(t, decalage + i * 0.06, decalage + i * 0.06 + 0.25);
		ctx.save();
		ctx.globalAlpha *= k;
		ctx.fillText(ligne, x, y + i * hauteurLigne + (1 - k) * 40);
		ctx.restore();
	});
	return lignesCoupees(ctx, texte, largeurMax).length * hauteurLigne;
}

// Fond commun : degrade doux qui derive lentement, comme le site
export function fond(ctx: Ctx, temps: number) {
	ctx.fillStyle = C.lavande;
	ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	const taches: [number, number, number, string][] = [
		[0.2 + 0.05 * Math.sin(temps * 0.4), 0.15, 0.7, C.platine],
		[0.85, 0.35 + 0.05 * Math.cos(temps * 0.3), 0.6, C.lavandePro],
		[0.9 + 0.04 * Math.sin(temps * 0.25), 1.0, 0.65, C.mokaClair],
		[0.05, 0.95 + 0.04 * Math.cos(temps * 0.35), 0.5, C.mokaClair],
	];
	for (const [x, y, r, couleur] of taches) {
		const g = ctx.createRadialGradient(x * LARGEUR, y * HAUTEUR, 0, x * LARGEUR, y * HAUTEUR, r * LARGEUR);
		g.addColorStop(0, `${couleur}cc`);
		g.addColorStop(1, `${couleur}00`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
	}
}

function marque(ctx: Ctx) {
	ctx.save();
	ctx.fillStyle = C.espresso;
	ctx.beginPath();
	ctx.roundRect(MARGE, MARGE - 8, 56, 56, 14);
	ctx.fill();
	ctx.fillStyle = C.platine;
	ctx.font = `italic 40px ${SERIF}`;
	ctx.textAlign = "center";
	ctx.fillText("W", MARGE + 28, MARGE + 34);
	ctx.textAlign = "left";
	ctx.fillStyle = C.espresso;
	ctx.font = `44px ${SERIF}`;
	ctx.fillText("Weekli", MARGE + 76, MARGE + 34);
	ctx.restore();
}

function carte(ctx: Ctx, x: number, y: number, l: number, h: number, couleur = "rgba(255,255,255,0.72)") {
	ctx.save();
	ctx.shadowColor = "rgba(42,28,19,0.18)";
	ctx.shadowBlur = 60;
	ctx.shadowOffsetY = 30;
	ctx.fillStyle = couleur;
	ctx.beginPath();
	ctx.roundRect(x, y, l, h, 36);
	ctx.fill();
	ctx.restore();
}

const DESSINS: { [K in Scene["type"]]: (ctx: Ctx, s: Extract<Scene, { type: K }>, t: number) => void } = {
	titre(ctx, s, t) {
		ctx.fillStyle = C.espresso;
		ctx.font = `128px ${SERIF}`;
		const h = texteRevele(ctx, s.titre, MARGE, 520, 132, LARGEUR - MARGE * 2, t, 0.05);
		if (s.sousTitre) {
			ctx.fillStyle = C.moka;
			ctx.font = `italic 64px ${SERIF}`;
			texteRevele(ctx, s.sousTitre, MARGE, 520 + h + 40, 74, LARGEUR - MARGE * 2, t, 0.25);
		}
	},

	terminal(ctx, s, t) {
		const y = 360;
		const h = 140 + s.lignes.length * 64;
		const k = fenetre(t, 0, 0.15);
		ctx.save();
		ctx.globalAlpha *= k;
		ctx.translate(0, (1 - k) * 60);
		carte(ctx, MARGE, y, LARGEUR - MARGE * 2, h, C.espresso);
		["#c9bedd", "#b89f8d", "#e5e4e2"].forEach((c, i) => {
			ctx.fillStyle = c;
			ctx.beginPath();
			ctx.arc(MARGE + 48 + i * 34, y + 46, 10, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.font = `36px ${MONO}`;
		// La commande se tape caractere par caractere, puis les lignes apparaissent
		const tapes = Math.floor(s.commande.length * fenetre(t, 0.12, 0.4));
		ctx.fillStyle = C.lavandePro;
		ctx.fillText(
			`$ ${s.commande.slice(0, tapes)}${tapes < s.commande.length && Math.floor(t * 20) % 2 ? "▌" : ""}`,
			MARGE + 48,
			y + 120,
		);
		s.lignes.forEach((ligne, i) => {
			const a = fenetre(t, 0.45 + i * 0.07, 0.55 + i * 0.07);
			ctx.globalAlpha = k * a;
			ctx.fillStyle = C.platine;
			ctx.fillText(ligne.slice(0, 38), MARGE + 48, y + 190 + i * 64);
		});
		ctx.restore();
	},

	liste(ctx, s, t) {
		ctx.fillStyle = C.moka;
		ctx.font = `500 34px ${MONO}`;
		ctx.save();
		ctx.globalAlpha *= fenetre(t, 0, 0.15);
		ctx.fillText(s.titre.toUpperCase(), MARGE, 330);
		ctx.restore();
		s.elements.forEach((el, i) => {
			const k = fenetre(t, 0.1 + i * 0.12, 0.3 + i * 0.12);
			const y = 400 + i * 210;
			ctx.save();
			ctx.globalAlpha *= k;
			ctx.translate((1 - k) * -60, 0);
			carte(ctx, MARGE, y, LARGEUR - MARGE * 2, 170);
			ctx.fillStyle = C.moka;
			ctx.font = `italic 80px ${SERIF}`;
			ctx.fillText(String(i + 1).padStart(2, "0"), MARGE + 40, y + 110);
			ctx.fillStyle = C.espresso;
			ctx.font = `500 40px ${SANS}`;
			lignesCoupees(ctx, el, LARGEUR - MARGE * 2 - 220)
				.slice(0, 2)
				.forEach((l, j) => ctx.fillText(l, MARGE + 180, y + (j === 0 ? 78 : 128)));
			ctx.restore();
		});
	},

	avantApres(ctx, s, t) {
		const largeur = (LARGEUR - MARGE * 2 - 40) / 2;
		[
			[s.avant, "Avant", MARGE, 0.05, "rgba(255,255,255,0.6)", C.doux],
			[s.apres, "Après", MARGE + largeur + 40, 0.3, C.espresso, C.lavande],
		].forEach(([valeur, libelle, x, debut, fondCarte, couleur]) => {
			const k = fenetre(t, debut as number, (debut as number) + 0.2);
			ctx.save();
			ctx.globalAlpha *= k;
			ctx.translate(0, (1 - k) * 60);
			carte(ctx, x as number, 420, largeur, 460, fondCarte as string);
			ctx.fillStyle = couleur as string;
			ctx.font = `500 30px ${MONO}`;
			ctx.fillText((libelle as string).toUpperCase(), (x as number) + 40, 490);
			ctx.font = `96px ${SERIF}`;
			lignesCoupees(ctx, valeur as string, largeur - 80)
				.slice(0, 3)
				.forEach((l, i) => ctx.fillText(l, (x as number) + 40, 620 + i * 100));
			ctx.restore();
		});
		ctx.fillStyle = C.espresso;
		ctx.font = `italic 56px ${SERIF}`;
		texteRevele(ctx, s.legende, MARGE, 1000, 66, LARGEUR - MARGE * 2, t, 0.5);
	},

	citation(ctx, s, t) {
		ctx.fillStyle = C.mokaClair;
		ctx.font = `260px ${SERIF}`;
		ctx.save();
		ctx.globalAlpha *= fenetre(t, 0, 0.2) * 0.6;
		ctx.fillText("«", MARGE - 10, 520);
		ctx.restore();
		ctx.fillStyle = C.espresso;
		ctx.font = `italic 92px ${SERIF}`;
		texteRevele(ctx, s.texte, MARGE, 640, 104, LARGEUR - MARGE * 2, t, 0.1);
	},

	fin(ctx, s, t) {
		const k = fenetre(t, 0, 0.25);
		ctx.save();
		ctx.globalAlpha *= k;
		ctx.textAlign = "center";
		ctx.fillStyle = C.espresso;
		ctx.font = `140px ${SERIF}`;
		ctx.fillText(s.titre, LARGEUR / 2, 640 + (1 - k) * 40);
		if (s.lien) {
			ctx.fillStyle = C.moka;
			ctx.font = `500 40px ${MONO}`;
			ctx.fillText(s.lien, LARGEUR / 2, 740);
		}
		ctx.fillStyle = C.doux;
		ctx.font = `36px ${SANS}`;
		ctx.globalAlpha = k * fenetre(t, 0.3, 0.5);
		ctx.fillText("Raconté avec Weekli", LARGEUR / 2, 1160);
		ctx.restore();
	},
};

export function dessinerScene(ctx: Ctx, scene: Scene, t: number, temps: number) {
	fond(ctx, temps);
	marque(ctx);
	ctx.save();
	ctx.globalAlpha = visibilite(t);
	(DESSINS[scene.type] as (c: Ctx, s: Scene, t: number) => void)(ctx, scene, t);
	ctx.restore();
}
