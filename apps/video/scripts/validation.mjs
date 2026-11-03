// Les noms de projet et de capture deviennent des dossiers et des fichiers : lettres minuscules,
// chiffres et tirets seulement, ce qui interdit "../" et les options deguisees
const NOM = /^[a-z0-9-]{1,40}$/;

export function exigerNom(valeur, etiquette) {
	if (!NOM.test(valeur ?? "")) {
		console.error(`${etiquette} invalide : 1 a 40 caracteres parmi a-z, 0-9 et "-" (recu : ${JSON.stringify(valeur)})`);
		process.exit(1);
	}
	return valeur;
}

// Seules les pages web sont capturables : pas de file://, ni de javascript:
export function exigerUrlWeb(valeur) {
	try {
		const url = new URL(valeur);
		if (url.protocol === "http:" || url.protocol === "https:") return url.href;
	} catch {
		/* traite plus bas */
	}
	console.error(`Adresse invalide : http ou https attendu (recu : ${JSON.stringify(valeur)})`);
	process.exit(1);
}
