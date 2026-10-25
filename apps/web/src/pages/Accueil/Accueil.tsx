import { useReveal } from "@/hooks/useReveal";
import { Bandeau } from "./sections/Bandeau";
import { Chiffres } from "./sections/Chiffres";
import { DeuxModes } from "./sections/DeuxModes";
import { Etapes } from "./sections/Etapes";
import { Fonctionnalites } from "./sections/Fonctionnalites";
import { Hero } from "./sections/Hero";
import { Installer } from "./sections/Installer";
import { Navigation } from "./sections/Navigation";
import { Pied } from "./sections/Pied";
import { PubProjet } from "./sections/PubProjet";

export function Accueil() {
	useReveal();

	return (
		<>
			<Navigation />
			<main>
				<Hero />
				<Bandeau />
				<PubProjet />
				<Fonctionnalites />
				<DeuxModes />
				<Etapes />
				<Chiffres />
				<Installer />
			</main>
			<Pied />
		</>
	);
}
