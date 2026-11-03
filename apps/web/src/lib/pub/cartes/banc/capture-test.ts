// Fausse capture de site dessinee localement (aucune image ni requete) : sert de capture simulee
// tant que /api/captures n'est pas branche. Dimensions identiques a celles du serveur (design.md 8.10).

const TAILLES = { bureau: [1280, 800], mobile: [780, 1688] } as const;
const ORANGE = "#e8590c";
const POLICE = '"Geist", ui-sans-serif, system-ui, sans-serif';

export async function captureDeTest(format: "bureau" | "mobile"): Promise<Blob> {
	const [l, h] = TAILLES[format];
	const k = format === "bureau" ? 1 : 2; // le mobile est rendu en densite 2
	const toile = new OffscreenCanvas(l, h);
	const ctx = toile.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D indisponible");
	ctx.scale(k, k);
	const w = l / k;
	const bloc = (x: number, y: number, bw: number, bh: number, fond: string, r = 12) => {
		ctx.fillStyle = fond;
		ctx.beginPath();
		ctx.roundRect(x, y, bw, bh, r);
		ctx.fill();
	};
	ctx.fillStyle = "#fffaf5";
	ctx.fillRect(0, 0, w, h / k);
	ctx.fillStyle = "#1d1d1f";
	ctx.font = `600 ${format === "bureau" ? 22 : 18}px ${POLICE}`;
	ctx.textBaseline = "middle";
	ctx.fillText("Studio Lumen", 32, 40);
	for (const [i, m] of ["Réalisations", "Tarifs", "Contact"].entries()) {
		ctx.font = `500 ${format === "bureau" ? 16 : 13}px ${POLICE}`;
		if (format === "bureau") ctx.fillText(m, w - 380 + i * 120, 40);
	}
	if (format === "mobile") {
		bloc(w - 56, 28, 24, 4, "#1d1d1f", 2);
		bloc(w - 56, 38, 24, 4, "#1d1d1f", 2);
	}
	const marge = 32;
	ctx.fillStyle = "#1d1d1f";
	ctx.font = `600 ${format === "bureau" ? 56 : 34}px ${POLICE}`;
	const titre = format === "bureau" ? ["Des photos qui", "racontent un lieu"] : ["Des photos qui", "racontent", "un lieu"];
	titre.forEach((ligne, i) => ctx.fillText(ligne, marge, (format === "bureau" ? 130 : 110) + i * (format === "bureau" ? 66 : 42)));
	const yBouton = format === "bureau" ? 290 : 270;
	bloc(marge, yBouton, 200, 52, ORANGE, 26);
	ctx.fillStyle = "#ffffff";
	ctx.font = `600 17px ${POLICE}`;
	ctx.fillText("Demander un devis", marge + 28, yBouton + 27);
	// grand visuel de couleur de marque : donne une couleur dominante a l'extraction
	if (format === "bureau") bloc(w - 400, 90, 368, 230, ORANGE, 24);
	const yCartes = yBouton + 100;
	const nb = format === "bureau" ? 3 : 2;
	const cw = (w - marge * 2 - 20 * (nb - 1)) / nb;
	const couleurs = ["#f3d9c6", "#d7e3d1", "#e7d2e9"];
	for (let i = 0; i < nb; i++) {
		bloc(marge + i * (cw + 20), yCartes, cw, format === "bureau" ? 240 : 190, couleurs[i % 3], 16);
		bloc(marge + i * (cw + 20), yCartes + (format === "bureau" ? 256 : 206), cw * 0.7, 14, "#cfc7bf", 7);
	}
	if (format === "mobile") {
		for (let i = 0; i < 3; i++) bloc(marge, yCartes + 250 + i * 150, w - marge * 2, 124, i === 2 ? ORANGE : couleurs[i], 16);
	}
	return toile.convertToBlob({ type: "image/png" });
}
