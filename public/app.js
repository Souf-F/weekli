// URL du connecteur : meme origine que le site, route /mcp
const champ = document.getElementById("url-mcp");
const bouton = document.getElementById("copier");
const urlMcp = `${location.origin}/mcp`;

champ.textContent = urlMcp;

bouton.addEventListener("click", async () => {
	try {
		await navigator.clipboard.writeText(urlMcp);
		bouton.textContent = "Copié";
	} catch {
		bouton.textContent = "Copie impossible";
	}
	setTimeout(() => (bouton.textContent = "Copier"), 2000);
});
