export function promptPostsSemaine(jours: number, style: string) {
	return `Prepare mes posts LinkedIn a partir de mon activite GitHub des ${jours} derniers jours.

Etapes :
1. Appelle \`activite_github\` avec jours=${jours}.
2. Repere 2 ou 3 sujets qui meritent un post : une fonctionnalite livree, un probleme resolu, une techno apprise.
3. Pour chaque sujet, appelle \`details_repo\` pour le contexte, et \`details_commit\` si un commit raconte un probleme interessant.
4. Ecris un post par sujet.

Regles d'ecriture :
- En francais, une seule idee par post, accroche forte en 1 ou 2 lignes.
- Corps de 800 a 1300 caracteres, phrases courtes, aere.
- Ton authentique et humble, pas de jargon marketing, 2 emojis maximum.
- Jamais de tiret long (em dash) : virgule ou deux-points a la place.
- N'invente aucun fait, chiffre ou resultat absent des donnees.
- Termine par 3 a 5 hashtags et le lien du repo ou du site si pertinent.
- Si l'activite est trop maigre, propose moins de posts plutot que de remplir.
${style ? `\nInspire-toi du style de ces exemples :\n${style}\n` : ""}
Presente chaque post avec un titre court, le format choisi et la source, puis le texte pret a copier.`;
}
