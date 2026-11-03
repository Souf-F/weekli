// Masque dans la page tout ce qui ressemble a une donnee sensible, avant la capture.
// Limites connues : images, canvas, noms propres et shadow DOM ferme ne sont pas analyses.

export const MOTIFS_SENSIBLES = [
	/[\w.+-]+@[\w-]+\.[\w.-]+/g, // email
	/\b\d{1,3}(\.\d{1,3}){3}\b/g, // IPv4
	/\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi, // IPv6
	/(?<![\w.])\+?\d[\d .()-]{7,}\d(?![\w])/g, // numero de telephone
	/\b(sk-[\w-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}|[a-f0-9]{32,}|[A-Za-z0-9+/]{40,}={0,2})\b/g, // secrets
];

const MOTIFS_JSON = JSON.stringify(MOTIFS_SENSIBLES.map((m) => [m.source, m.flags]));

export const SCRIPT_FLOU = `(() => {
	const motifs = ${MOTIFS_JSON}.map(([source, flags]) => new RegExp(source, flags));
	// Pave opaque plutot qu'un flou : un flou sur du texte court peut etre inverse
	const masque = "background:#2a1c13!important;color:transparent!important;text-shadow:none!important;border-radius:3px;user-select:none";
	const echapper = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

	// Les cadres peuvent afficher un autre site que le domaine verifie : on les retire
	document.querySelectorAll("iframe,frame,object,embed").forEach((el) => el.remove());

	const racines = [document.body];
	const noeuds = [];
	for (const racine of racines) {
		const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
		while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
		for (const el of racine.querySelectorAll("*")) if (el.shadowRoot) racines.push(el.shadowRoot);
	}
	for (const n of noeuds) {
		const texte = n.nodeValue;
		if (!texte || !motifs.some((m) => { m.lastIndex = 0; return m.test(texte); })) continue;
		const span = document.createElement("span");
		let html = echapper(texte);
		for (const m of motifs) html = html.replace(m, (x) => '<span style="' + masque + '">' + x + "</span>");
		span.innerHTML = html;
		n.parentNode && n.parentNode.replaceChild(span, n);
	}

	// Les valeurs saisies ne sont pas des noeuds texte : tout champ est masque
	for (const racine of racines) {
		for (const el of racine.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable],[data-sensible]')) {
			el.setAttribute("style", (el.getAttribute("style") || "") + ";" + masque);
		}
	}
	return true;
})()`;
