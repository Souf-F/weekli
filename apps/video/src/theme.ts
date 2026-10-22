import { loadFont as geist } from "@remotion/google-fonts/Geist";
import { loadFont as instrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as mono } from "@remotion/google-fonts/JetBrainsMono";

// Identite visuelle Weekli, partagee par toutes les videos
export const C = {
	platine: "#e5e4e2",
	lavande: "#e6e0f0",
	lavandePro: "#c9bedd",
	moka: "#6f4e37",
	mokaClair: "#b89f8d",
	espresso: "#2a1c13",
	doux: "#6a5a4f",
	blanc: "#ffffff",
};

export const SERIF = instrument("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const SANS = geist("normal", { weights: ["400", "500", "600"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const MONO = mono("normal", { weights: ["400", "500"], subsets: ["latin", "latin-ext"] }).fontFamily;
instrument("italic", { weights: ["400"], subsets: ["latin", "latin-ext"] });

export const IPS = 30;
export const TRANSITION = 18; // images de chevauchement entre deux scenes
export const MARGE_AUDIO = 0.7; // secondes de respiration apres chaque phrase
