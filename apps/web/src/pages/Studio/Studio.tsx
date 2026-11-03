import { useSearchParams } from "react-router-dom";
import { Assistant } from "./Assistant";
import { Editeur } from "./Editeur";
import { ListePubs } from "./ListePubs";

const ID_PUB = /^[0-9a-f-]{36}$/;

// Trois ecrans selon l'adresse : /app/studio (Mes pubs), ?nouveau (assistant), ?pub=<id> (editeur, aussi ouvert depuis Claude)
export function Studio() {
	const [params] = useSearchParams();
	const pub = params.get("pub");
	if (pub) return ID_PUB.test(pub) ? <Editeur key={pub} id={pub} /> : <ListePubsInvalide />;
	if (params.has("nouveau")) return <Assistant />;
	return <ListePubs />;
}

function ListePubsInvalide() {
	return (
		<div role="alert">
			<p>Ce lien de pub n'est pas valide.</p>
			<ListePubs />
		</div>
	);
}
