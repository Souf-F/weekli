import type { Hex, ScriptPub } from "@weekli/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { echantillonner, extraireCouleurs, ID_LOGO, proposerMarque } from "@/lib/pub/cartes";
import { chargerImagesManquantes, importerPourPub } from "@/lib/studio/images";

// Images d'une pub (captures et logo) chargees une fois puis gardees en memoire pour la session :
// une capture de site n'est redemandee au serveur que si elle manque (5 par minute au plus)
export function useImagesPub(id: string, script: ScriptPub | null) {
	const [images] = useState(() => new Map<string, ImageBitmap>());
	const [version, setVersion] = useState(0);
	const [manquantes, setManquantes] = useState<{ id: string; raison: string }[]>([]);
	const [chargement, setChargement] = useState(false);
	const echecs = useRef(new Set<string>());

	const captures = script?.captures;
	const logo = script?.marque.logo;
	useEffect(() => {
		if (!captures || !logo) return;
		const aVoir = captures.filter((c) => !images.has(c.id) && !echecs.current.has(c.id));
		const logoManque = logo === "image" && !images.has(ID_LOGO) && !echecs.current.has(ID_LOGO);
		if (!aVoir.length && !logoManque) return;
		const arret = new AbortController();
		setChargement(true);
		chargerImagesManquantes({ captures: aVoir, marque: { logo } as ScriptPub["marque"] }, id, new Set(images.keys()), arret.signal)
			.then((r) => {
				for (const [cle, image] of r.images) images.set(cle, image);
				for (const m of r.manquantes) echecs.current.add(m.id);
				setManquantes((avant) => [...avant.filter((a) => !r.manquantes.some((m) => m.id === a.id)), ...r.manquantes]);
				setVersion((v) => v + 1);
			})
			.catch(() => undefined)
			.finally(() => setChargement(false));
		return () => arret.abort();
	}, [captures, logo, id, images]);

	const importerLogo = useCallback(
		async (fichier: File) => {
			const image = await importerPourPub(id, ID_LOGO, fichier);
			images.get(ID_LOGO)?.close();
			images.set(ID_LOGO, image);
			echecs.current.delete(ID_LOGO);
			setManquantes((m) => m.filter((x) => x.id !== ID_LOGO));
			setVersion((v) => v + 1);
		},
		[id, images],
	);

	// Couleurs proposees d'apres la premiere capture (trois au plus), design.md 8.4
	const premiere = captures?.[0]?.id;
	const [couleurs, setCouleurs] = useState<Hex[]>([]);
	useEffect(() => {
		const image = premiere ? images.get(premiere) : undefined;
		if (!image) {
			setCouleurs([]);
			return;
		}
		const p = proposerMarque(extraireCouleurs(echantillonner(image)));
		setCouleurs([...(p.accent ? [p.accent] : []), ...p.candidats].slice(0, 3));
	}, [premiere, version, images]);

	return { images, version, manquantes, chargement, importerLogo, couleurs };
}
