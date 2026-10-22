// Floute dans la page tout ce qui ressemble a une donnee sensible, avant la capture
export const SCRIPT_FLOU = `(() => {
	const motifs = [
		/[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g,
		/\\b\\d{1,3}(\\.\\d{1,3}){3}\\b/g,
		/\\b(sk-[\\w-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\\w{20,}|eyJ[\\w-]{10,}\\.[\\w-]{10,}\\.[\\w-]{10,}|[a-f0-9]{32,}|[A-Za-z0-9+/]{40,}={0,2})\\b/g,
	];
	const flou = "filter:blur(6px)!important;user-select:none";
	const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	const noeuds = [];
	while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
	for (const n of noeuds) {
		const texte = n.nodeValue;
		if (!texte || !motifs.some((m) => { m.lastIndex = 0; return m.test(texte); })) continue;
		const span = document.createElement("span");
		let html = texte.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
		for (const m of motifs) html = html.replace(m, (x) => '<span style="' + flou + '">' + x + "</span>");
		span.innerHTML = html;
		n.parentNode && n.parentNode.replaceChild(span, n);
	}
	for (const el of document.querySelectorAll('input[type=password],input[type=email],input[autocomplete*=cc-],[data-sensible]')) {
		el.setAttribute("style", (el.getAttribute("style") || "") + ";" + flou);
	}
	return true;
})()`;
