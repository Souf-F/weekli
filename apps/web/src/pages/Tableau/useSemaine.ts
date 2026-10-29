import type { Activite, ActiviteRepo, OptionsGeneration } from "@weekli/core";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { nomCourtRepo } from "@/lib/parcours";
import { cleCommit } from "./PanneauActivite";

// Etat de l'ancien flux "Ma semaine" : periode, activite GitHub, commits coches, options de redaction.
// L'activite n'est chargee que lorsque ce type est choisi et que l'etape des reglages est atteinte.
export function useSemaine(actif: boolean, repos: string[]) {
	const [jours, setJours] = useState(7);
	const [activite, setActivite] = useState<Activite | null>(null);
	const [chargement, setChargement] = useState(false);
	const [erreur, setErreur] = useState("");
	const [selection, setSelection] = useState<Set<string>>(new Set());
	const [options, setOptions] = useState<OptionsGeneration>({ ton: "retour", langue: "fr", nombre: 2, style: "" });
	const [inclureDiffs, setInclureDiffs] = useState(true);
	const [joursCharges, setJoursCharges] = useState<number | null>(null);
	const cleRepos = repos.join("|");

	useEffect(() => {
		if (!actif || joursCharges === jours) return;
		let annule = false;
		setChargement(true);
		setErreur("");
		api
			.activite(jours)
			.then((a) => {
				if (annule) return;
				setActivite(a);
				setJoursCharges(jours);
			})
			.catch((e: Error) => !annule && setErreur(e.message))
			.finally(() => !annule && setChargement(false));
		return () => {
			annule = true;
		};
	}, [actif, jours, joursCharges]);

	// Activite limitee aux repos choisis a l'etape 1 (aucun choisi : tous)
	const filtree = useMemo<Activite | null>(() => {
		if (!activite) return null;
		const choisis = cleRepos ? cleRepos.split("|") : [];
		const reposFiltres = activite.repos.filter((r) => choisis.length === 0 || choisis.includes(nomCourtRepo(r.repo)));
		return { ...activite, repos: reposFiltres };
	}, [activite, cleRepos]);

	// Tout est coche par defaut a chaque nouvelle activite ou nouveau choix de repos
	useEffect(() => {
		setSelection(new Set(filtree?.repos.flatMap((r) => r.commits.map((c) => cleCommit(r.repo, c.sha))) ?? []));
	}, [filtree]);

	const basculer = (cle: string) =>
		setSelection((s) => {
			const n = new Set(s);
			if (n.has(cle)) n.delete(cle);
			else n.add(cle);
			return n;
		});

	const basculerRepo = (repo: string, coche: boolean) =>
		setSelection((s) => {
			const n = new Set(s);
			for (const c of filtree?.repos.find((r) => r.repo === repo)?.commits ?? []) {
				if (coche) n.add(cleCommit(repo, c.sha));
				else n.delete(cleCommit(repo, c.sha));
			}
			return n;
		});

	const reposChoisis = (): ActiviteRepo[] =>
		(filtree?.repos ?? [])
			.map((r) => ({ ...r, commits: r.commits.filter((c) => selection.has(cleCommit(r.repo, c.sha))) }))
			.filter((r) => r.commits.length > 0);

	return {
		jours, surJours: setJours, activite: filtree, chargement, erreur, selection, basculer, basculerRepo,
		options, surOptions: setOptions, inclureDiffs, surInclureDiffs: setInclureDiffs, reposChoisis,
	};
}

export type Semaine = ReturnType<typeof useSemaine>;
