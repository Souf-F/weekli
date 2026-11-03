// Import du texte brut d'un fichier JSONC (tests de configuration)
declare module "*.jsonc?raw" {
	const texte: string;
	export default texte;
}
