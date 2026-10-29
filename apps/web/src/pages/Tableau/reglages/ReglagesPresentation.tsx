import type { DetailsRepo, PubResume } from "@weekli/core";
import { useEffect, useState } from "react";
import { api, type Domaine } from "@/lib/api";
import { LIMITE_LONG, type ReglagesType } from "@/lib/parcours";
import e from "../Etapes.module.css";
import p from "../Panneau.module.css";
import { ChampTexte } from "./Compteur";

type Props = { repo: string; reglages: ReglagesType; surModifier: (m: Partial<ReglagesType>) => void };

type Lecture = { details: DetailsRepo | null; domaines: Domaine[]; pub: PubResume | null };

const normaliser = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
const hote = (url: string) => {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
};

export function ReglagesPresentation({ repo, reglages, surModifier }: Props) {
	const [lecture, setLecture] = useState<Lecture | null>(null);

	// Apercu de ce que Weekli lira : un echec partiel n'empeche jamais de continuer
	useEffect(() => {
		let annule = false;
		setLecture(null);
		Promise.all([
			api.repo(repo).catch(() => null),
			api.domaines().catch(() => [] as Domaine[]),
			api.pubs().catch(() => [] as PubResume[]),
		]).then(([details, domaines, pubs]) => {
			if (annule) return;
			const cle = normaliser(repo);
			const pub = pubs.find((x) => normaliser(x.projet) === cle) ?? null;
			setLecture({ details, domaines, pub });
		});
		return () => {
			annule = true;
		};
	}, [repo]);

	const site = lecture?.details?.site ? hote(lecture.details.site) : "";
	const domaines = lecture?.domaines.filter((d) => d.hote === site) ?? [];

	return (
		<div className={e.corps}>
			<div className={e.bloc}>
				<p className={e.blocTitre}>Ce que Weekli va lire</p>
				{!lecture ? (
					<div className={e.squelette} role="status" aria-label="Lecture du repo">
						<span />
						<span />
					</div>
				) : (
					<ul className={e.lectures}>
						<li>
							<span>Description</span>
							{lecture.details?.description || "Aucune description"}
						</li>
						<li>
							<span>README</span>
							{lecture.details?.readme ? `${lecture.details.readme.length.toLocaleString("fr-FR")} caractères` : "Introuvable"}
						</li>
						<li>
							<span>Pub vidéo</span>
							{lecture.pub ? lecture.pub.titre : "Aucune pub trouvée pour ce projet"}
						</li>
						<li>
							<span>Domaines vérifiés</span>
							{domaines.length > 0 ? domaines.map((d) => d.hote).join(", ") : "Aucun"}
						</li>
					</ul>
				)}
			</div>
			<ChampTexte
				etiquette="Pourquoi tu l'as fait (facultatif)"
				valeur={reglages.pourquoi}
				max={LIMITE_LONG}
				surChange={(pourquoi) => surModifier({ pourquoi })}
			/>
			<ChampTexte
				etiquette="Comment tu l'as conçu (facultatif)"
				valeur={reglages.demarche}
				max={LIMITE_LONG}
				surChange={(demarche) => surModifier({ demarche })}
			/>
			<p className={p.aide}>Si tu ne dis rien, Claude te posera la question plutôt que d'inventer.</p>
		</div>
	);
}
