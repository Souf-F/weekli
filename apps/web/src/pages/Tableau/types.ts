import type { ActiviteRepo, DemandePost, OptionsGeneration, TypePost } from "@weekli/core";

// Ce que le parcours transmet a la redaction quand l'utilisateur lance "Rediger les posts"
export type DemandeRedaction = {
	// Nouveau numero a chaque lancement : la redaction repart de zero
	id: number;
	type: TypePost;
	donnees: DemandePost;
	notes: string;
	// Ancien flux "Ma semaine" : commits coches et options
	semaine?: { repos: ActiviteRepo[]; inclureDiffs: boolean; options: OptionsGeneration };
};
