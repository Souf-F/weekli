import type { CaptureRef, Palette, Visuel } from "@weekli/core";
import type { Ctx2D, InstantScene } from "../scene";
import {
	BARRE_NAVIGATEUR,
	choisirVignette,
	type Disposition,
	disposerCarte,
	domaineDe,
	formatDe,
	INCLINAISON_MOBILE,
	LARGEUR_VIGNETTE,
	RAYON_BUREAU,
	RAYON_MOBILE,
	type Zone,
} from "./disposition";
import { easeOutExpo, type MouvementCarte, mouvementCarte, RETARD_VIGNETTE } from "./mouvement";

// Dessin des cartes de capture (design.md 8.10). Fonctions pures du contexte, de l'instant et de la palette :
// aucune ressource n'est creee ici (les images viennent de `instant.contexte.images`).

const POLICE = '"Geist", ui-sans-serif, system-ui, sans-serif';

export type OptionsVisuel = {
	captures?: CaptureRef[]; // refs du script : format et domaine affiches dans la barre du navigateur
	vignette?: string | null; // id de la seconde capture ; undefined : la suivante du script, null : aucune
	fond?: "clair" | "sombre"; // fond de la scene, pour la couleur du cadre de focus
	retard?: number; // secondes avant l'entree de la carte
};

function rgba(hex: string, alpha: number): string {
	const n = Number.parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Les ombres du canvas ignorent la transformation : on les met a l'echelle courante soi-meme
const echelleCourante = (ctx: Ctx2D) => {
	const m = ctx.getTransform();
	return Math.hypot(m.a, m.b);
};

// Ombre `0 40px 80px -30px` couleur sombre 35 % : forme reduite de 30 px, decalee de 40 px, flou 80 px
function ombre(ctx: Ctx2D, largeur: number, hauteur: number, rayon: number, p: Palette) {
	const f = Math.min(1, Math.max(0.4, largeur / 800));
	const k = echelleCourante(ctx);
	ctx.save();
	ctx.shadowColor = rgba(p.sombre, 0.35);
	ctx.shadowBlur = 80 * f * k;
	ctx.shadowOffsetY = 40 * f * k;
	ctx.fillStyle = p.blanc;
	ctx.beginPath();
	const marge = 30 * f;
	ctx.roundRect(-largeur / 2 + marge, -hauteur / 2 + marge, largeur - 2 * marge, hauteur - 2 * marge, Math.max(2, rayon - marge));
	ctx.fill();
	ctx.restore();
}

type Focus = { rect: { x: number; y: number; largeur: number; hauteur: number }; avancement: number; couleur: string };

function dessinerFocus(ctx: Ctx2D, d: Disposition, f: Focus, p: Palette) {
	if (f.avancement <= 0) return;
	const e = d.ecran;
	const x = e.x + f.rect.x * e.largeur;
	const y = e.y + f.rect.y * e.hauteur;
	const l = f.rect.largeur * e.largeur;
	const h = f.rect.hauteur * e.hauteur;
	ctx.save();
	// l'exterieur du rectangle s'assombrit a 35 %
	ctx.globalAlpha *= 0.35 * f.avancement;
	ctx.fillStyle = p.sombre;
	ctx.beginPath();
	ctx.rect(e.x, e.y, e.largeur, e.hauteur);
	ctx.roundRect(x, y, l, h, 8);
	ctx.fill("evenodd");
	ctx.restore();
	// le cadre se dessine autour
	const perimetre = 2 * (l + h);
	ctx.save();
	ctx.strokeStyle = f.couleur;
	ctx.lineWidth = 3;
	ctx.lineJoin = "round";
	ctx.setLineDash([perimetre, perimetre]);
	ctx.lineDashOffset = perimetre * (1 - easeOutExpo(f.avancement));
	ctx.beginPath();
	ctx.roundRect(x, y, l, h, 8);
	ctx.stroke();
	ctx.restore();
}

function squelette(ctx: Ctx2D, d: Disposition, p: Palette) {
	const e = d.ecran;
	ctx.fillStyle = p.surface;
	ctx.fillRect(e.x, e.y, e.largeur, e.hauteur);
	ctx.fillStyle = rgba(p.encre, 0.08);
	const m = e.largeur * 0.07;
	const blocs: [number, number, number, number][] = [
		[0, 0, 0.5, 0.07],
		[0, 0.12, 0.8, 0.04],
		[0, 0.18, 0.62, 0.04],
		[0, 0.3, 1, 0.34],
		[0, 0.7, 0.47, 0.22],
		[0.53, 0.7, 0.47, 0.22],
	];
	for (const [bx, by, bl, bh] of blocs) {
		ctx.beginPath();
		ctx.roundRect(e.x + m + bx * (e.largeur - 2 * m), e.y + m + by * (e.hauteur - 2 * m), bl * (e.largeur - 2 * m), bh * (e.hauteur - 2 * m), 8);
		ctx.fill();
	}
}

function image(ctx: Ctx2D, img: ImageBitmap | undefined, d: Disposition, p: Palette) {
	if (!img) return squelette(ctx, d, p);
	const r = d.region;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, r.x, r.y, r.largeur, r.hauteur, d.ecran.x, d.ecran.y, d.ecran.largeur, d.ecran.hauteur);
}

// Carte bureau centree sur l'origine : surface blanche, barre de navigateur, pilule d'adresse
export function dessinerCarteBureau(ctx: Ctx2D, img: ImageBitmap | undefined, d: Disposition, p: Palette, domaine: string, focus?: Focus) {
	const x = -d.largeur / 2;
	const y = -d.hauteur / 2;
	const reduction = Math.min(1, d.largeur / 760);
	ombre(ctx, d.largeur, d.hauteur, RAYON_BUREAU, p);
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, d.largeur, d.hauteur, RAYON_BUREAU);
	ctx.clip();
	ctx.fillStyle = p.blanc;
	ctx.fillRect(x, y, d.largeur, d.hauteur);
	ctx.fillStyle = p.surface;
	ctx.fillRect(x, y, d.largeur, BARRE_NAVIGATEUR);
	ctx.fillStyle = rgba(p.encre, 0.08);
	ctx.fillRect(x, y + BARRE_NAVIGATEUR - 1, d.largeur, 1);
	// trois points encreDouce a 30 %
	ctx.fillStyle = rgba(p.encreDouce, 0.3);
	for (let i = 0; i < 3; i++) {
		ctx.beginPath();
		ctx.arc(x + 24 * reduction + i * 18 * reduction, y + BARRE_NAVIGATEUR / 2, 6 * reduction, 0, Math.PI * 2);
		ctx.fill();
	}
	// pilule d'adresse
	const pl = d.largeur * 0.46;
	const ph = 24;
	ctx.fillStyle = p.blanc;
	ctx.beginPath();
	ctx.roundRect(x + (d.largeur - pl) / 2, y + (BARRE_NAVIGATEUR - ph) / 2, pl, ph, ph / 2);
	ctx.fill();
	if (domaine) {
		ctx.fillStyle = p.encreDouce;
		ctx.font = `500 ${Math.round(15 * Math.max(0.7, reduction))}px ${POLICE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(domaine, x + d.largeur / 2, y + BARRE_NAVIGATEUR / 2 + 1, pl - 24);
	}
	image(ctx, img, d, p);
	if (focus) dessinerFocus(ctx, d, focus, p);
	ctx.restore();
}

// Carte mobile centree sur l'origine : cadre arrondi (rayon 48, bord 10 px encre), ilot de camera
export function dessinerCarteMobile(ctx: Ctx2D, img: ImageBitmap | undefined, d: Disposition, p: Palette, focus?: Focus) {
	const x = -d.largeur / 2;
	const y = -d.hauteur / 2;
	ombre(ctx, d.largeur, d.hauteur, RAYON_MOBILE, p);
	ctx.fillStyle = p.encre;
	ctx.beginPath();
	ctx.roundRect(x, y, d.largeur, d.hauteur, RAYON_MOBILE);
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(d.ecran.x, d.ecran.y, d.ecran.largeur, d.ecran.hauteur, d.rayonEcran);
	ctx.clip();
	ctx.fillStyle = p.blanc;
	ctx.fillRect(d.ecran.x, d.ecran.y, d.ecran.largeur, d.ecran.hauteur);
	image(ctx, img, d, p);
	if (focus) dessinerFocus(ctx, d, focus, p);
	ctx.restore();
	ctx.fillStyle = p.encre;
	ctx.beginPath();
	const il = d.largeur * 0.26;
	ctx.roundRect(-il / 2, d.ecran.y + 10, il, 22, 11);
	ctx.fill();
}

type PoseCarte = {
	cx: number;
	cy: number;
	mouvement: MouvementCarte;
	angle: number;
	versCentre: { x: number; y: number } | null;
	limite?: { x: number; y: number }; // glissement maximal pour rester dans la zone
};

// Place la carte : entree (montee, echelle, opacite), Ken Burns et glissement vers le focus
function appliquerPose(ctx: Ctx2D, pose: PoseCarte) {
	const m = pose.mouvement;
	ctx.globalAlpha *= m.opacite;
	let dx = 0;
	let dy = 0;
	if (pose.versCentre) {
		// le point du focus se rapproche du centre de la carte jusqu'a 25 %
		dx = -pose.versCentre.x * m.echelle * 0.25 * m.glissement;
		dy = -pose.versCentre.y * m.echelle * 0.25 * m.glissement;
		if (pose.limite) {
			dx = Math.max(-pose.limite.x, Math.min(pose.limite.x, dx));
			dy = Math.max(-pose.limite.y, Math.min(pose.limite.y, dy));
		}
	}
	ctx.translate(pose.cx + dx, pose.cy + m.montee + dy);
	ctx.rotate(pose.angle);
	ctx.scale(m.echelle, m.echelle);
}

type ParamsCapture = {
	instant: InstantScene;
	id: string;
	visuel: Extract<Visuel, { type: "capture" }> | { type: "capture"; capture: string };
	centre: { x: number; y: number };
	zone: Zone;
	largeur?: number;
	ref?: CaptureRef;
	retard: number;
	avecFocus: boolean;
	fond: "clair" | "sombre";
};

function dessinerCapture(ctx: Ctx2D, a: ParamsCapture) {
	const { instant, id, visuel } = a;
	const p = instant.contexte.palette;
	const img = instant.contexte.images.get(id);
	const cadrage = "cadrage" in visuel ? visuel.cadrage : undefined;
	const focusDemande = a.avecFocus && "focus" in visuel ? visuel.focus : undefined;
	const format = formatDe(img ? { largeur: img.width, hauteur: img.height } : null, a.ref);
	const d = disposerCarte(format, img ? { largeur: img.width, hauteur: img.height } : null, cadrage, focusDemande, a.zone, a.largeur);
	const focusLocal = d.focus;
	const m = mouvementCarte(instant.t, instant.secondes, a.retard, focusLocal !== null);
	const e = d.ecran;
	const pose: PoseCarte = {
		cx: a.centre.x,
		cy: a.centre.y,
		mouvement: m,
		angle: format === "mobile" ? INCLINAISON_MOBILE : 0,
		limite: {
			x: Math.max(0, (a.zone.largeur - d.largeur * m.echelle) / 2 - Math.abs(a.centre.x - (a.zone.x + a.zone.largeur / 2))),
			y: Math.max(0, (a.zone.hauteur - d.hauteur * m.echelle) / 2 - Math.abs(a.centre.y - (a.zone.y + a.zone.hauteur / 2))),
		},
		versCentre: focusLocal ? { x: e.x + (focusLocal.x + focusLocal.largeur / 2) * e.largeur, y: e.y + (focusLocal.y + focusLocal.hauteur / 2) * e.hauteur } : null,
	};
	const focus: Focus | undefined = focusLocal
		? { rect: focusLocal, avancement: m.focus, couleur: a.fond === "clair" ? p.accentClair : p.accentSombre }
		: undefined;
	ctx.save();
	appliquerPose(ctx, pose);
	if (format === "bureau") dessinerCarteBureau(ctx, img, d, p, domaineDe(a.ref), focus);
	else dessinerCarteMobile(ctx, img, d, p, focus);
	ctx.restore();
	return d;
}

// Carte liste (scene sans capture) : titre, 2 a 4 lignes avec case qui se coche une a une, barre de progression
export function dessinerCarteListe(ctx: Ctx2D, instant: InstantScene, titre: string, elements: string[], zone: Zone, retard = 0) {
	const p = instant.contexte.palette;
	const lignes = elements.slice(0, 4);
	const largeur = Math.min(zone.largeur, 760);
	const marge = 44;
	const hLigne = 68;
	const hTitre = 56;
	const hauteur = marge + hTitre + 20 + lignes.length * hLigne + 28 + 10 + marge;
	const m = mouvementCarte(instant.t, instant.secondes, retard, false);
	const x = -largeur / 2;
	const y = -hauteur / 2;

	ctx.save();
	appliquerPose(ctx, { cx: zone.x + zone.largeur / 2, cy: zone.y + zone.hauteur / 2, mouvement: m, angle: 0, versCentre: null });
	ombre(ctx, largeur, hauteur, RAYON_BUREAU, p);
	ctx.fillStyle = p.blanc;
	ctx.beginPath();
	ctx.roundRect(x, y, largeur, hauteur, RAYON_BUREAU);
	ctx.fill();

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = p.encre;
	ctx.font = `600 36px ${POLICE}`;
	ctx.fillText(titre, x + marge, y + marge + hTitre / 2, largeur - 2 * marge);

	// chaque case se coche a son tour entre t 0,2 et 0,85
	const coche = lignes.map((_, i) => easeOutExpo((instant.t - (0.2 + (i * 0.6) / Math.max(1, lignes.length))) / 0.1));
	lignes.forEach((texte, i) => {
		const ly = y + marge + hTitre + 20 + i * hLigne + hLigne / 2;
		const cote = 32;
		const cx0 = x + marge;
		ctx.beginPath();
		ctx.roundRect(cx0, ly - cote / 2, cote, cote, 9);
		if (coche[i] > 0) {
			ctx.fillStyle = p.accentClair;
			ctx.fill();
		}
		ctx.strokeStyle = coche[i] > 0 ? p.accentClair : rgba(p.encre, 0.25);
		ctx.lineWidth = 2;
		ctx.stroke();
		if (coche[i] > 0) {
			// la coche se trace progressivement
			const pts: [number, number][] = [
				[cx0 + 7, ly + 1],
				[cx0 + 14, ly + 8],
				[cx0 + 26, ly - 7],
			];
			const long1 = Math.hypot(7, 7);
			const long2 = Math.hypot(12, 15);
			let reste = coche[i] * (long1 + long2);
			ctx.strokeStyle = p.blanc;
			ctx.lineWidth = 3.5;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.beginPath();
			ctx.moveTo(...pts[0]);
			const s1 = Math.min(1, reste / long1);
			ctx.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * s1, pts[0][1] + (pts[1][1] - pts[0][1]) * s1);
			reste -= long1;
			if (reste > 0) {
				const s2 = Math.min(1, reste / long2);
				ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * s2, pts[1][1] + (pts[2][1] - pts[1][1]) * s2);
			}
			ctx.stroke();
		}
		ctx.fillStyle = p.encre;
		ctx.font = `500 28px ${POLICE}`;
		ctx.textBaseline = "middle";
		ctx.fillText(texte, cx0 + cote + 22, ly + 1, largeur - 2 * marge - cote - 22);
	});

	// barre de progression : suit les cases cochees
	const by = y + hauteur - marge - 10;
	const bl = largeur - 2 * marge;
	const part = lignes.length ? coche.reduce((s, v) => s + v, 0) / lignes.length : 0;
	ctx.fillStyle = rgba(p.encre, 0.08);
	ctx.beginPath();
	ctx.roundRect(x + marge, by, bl, 10, 5);
	ctx.fill();
	if (part > 0) {
		ctx.fillStyle = p.accentClair;
		ctx.beginPath();
		ctx.roundRect(x + marge, by, Math.max(10, bl * part), 10, 5);
		ctx.fill();
	}
	ctx.restore();
}

// Point d'entree pour une scene : dessine le visuel d'une etape dans `zone` (repere logique 1920 x 1080).
// Capture : carte bureau ou mobile avec Ken Burns, focus et vignette ; liste : carte a cases.
export function dessinerVisuel(ctx: Ctx2D, instant: InstantScene, visuel: Visuel, zone: Zone, options: OptionsVisuel = {}) {
	const retard = options.retard ?? 0;
	if (visuel.type === "liste") {
		dessinerCarteListe(ctx, instant, visuel.titre, visuel.elements, zone, retard);
		return;
	}
	const captures = options.captures ?? [];
	const fond = options.fond ?? "clair";
	const images = instant.contexte.images;
	const idVignette =
		options.vignette === undefined ? choisirVignette(captures, visuel.capture, (id) => images.has(id)) : options.vignette;
	const centre = { x: zone.x + zone.largeur / 2, y: zone.y + zone.hauteur / 2 };
	const refOf = (id: string) => captures.find((c) => c.id === id);
	const vignetteVisible = idVignette !== null && images.has(idVignette);

	// Avec une vignette, le groupe est recentre : la carte principale remonte et passe a droite
	const principale = dessinerCapture(ctx, {
		instant,
		id: visuel.capture,
		visuel,
		centre: vignetteVisible ? { x: centre.x + 40, y: centre.y - 34 } : centre,
		zone: vignetteVisible ? { ...zone, hauteur: zone.hauteur - 68 } : zone,
		ref: refOf(visuel.capture),
		retard,
		avecFocus: true,
		fond,
	});

	if (vignetteVisible && idVignette) {
		const refV = refOf(idVignette);
		const imgV = images.get(idVignette);
		const fmt = formatDe(imgV ? { largeur: imgV.width, hauteur: imgV.height } : null, refV);
		const larg = LARGEUR_VIGNETTE[fmt];
		const hV = disposerCarte(fmt, imgV ? { largeur: imgV.width, hauteur: imgV.height } : null, "complet", undefined, zone, larg).hauteur;
		const gauche = centre.x + 40 - principale.largeur / 2 - 60;
		const bas = centre.y - 34 + principale.hauteur / 2 + 56;
		dessinerCapture(ctx, {
			instant,
			id: idVignette,
			visuel: { type: "capture", capture: idVignette },
			centre: { x: gauche + larg / 2, y: bas - hV / 2 },
			zone,
			largeur: larg,
			ref: refV,
			retard: retard + RETARD_VIGNETTE,
			avecFocus: false,
			fond,
		});
	}
}
