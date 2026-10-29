// Echantillonnage d'une image vers un petit tableau RGBA (pour `extraireCouleurs`).
// Le logo SVG ou PNG est dessine sur fond transparent : seuls ses pixels opaques comptent.

export function echantillonner(source: ImageBitmap, cote = 64): Uint8ClampedArray {
	const echelle = Math.min(1, cote / Math.max(source.width, source.height));
	const l = Math.max(1, Math.round(source.width * echelle));
	const h = Math.max(1, Math.round(source.height * echelle));
	const toile = new OffscreenCanvas(l, h);
	const ctx = toile.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Canvas 2D indisponible");
	ctx.drawImage(source, 0, 0, l, h);
	return ctx.getImageData(0, 0, l, h).data;
}
