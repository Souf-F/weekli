import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Octokit } from "octokit";
import { ajouterNomMcp, retirerNomMcp } from "../lib/mcp-index";
import { ouvrirJeton } from "../lib/props";
import type { Props } from "../types";
import { type Contexte, erreur, json } from "./contexte";
import { outilsBrouillons } from "./outils-brouillons";
import { outilsCaptures } from "./outils-captures";
import { outilsGithub } from "./outils-github";
import { outilsPub } from "./outils-pub";
import { outilsStyle } from "./outils-style";

// Un Durable Object sans appel pendant 24 h est detruit (ADR-03). Son nom est dans `mcp:<id>` pour l'effacement.
export const INACTIVITE_SECONDES = 60 * 60 * 24;
const CLE_PROPRIETAIRE = "proprietaire";
const CLE_EXPIRATION = "expiration";

// Serveur MCP (mode 1) : Claude appelle ces outils avec l'abonnement de l'utilisateur
export class WeekliMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({ name: "Weekli", version: "0.2.0" });

	// Le Durable Object est nomme d'apres l'en-tete `mcp-session-id` du client : il n'est lie a un compte que par
	// le proprietaire enregistre ici. Chaque appel relit les props et refuse tout autre id (audit m6).
	// Limite de la bibliotheque agents : sur un objet deja demarre, les props d'une requete ne sont pas relues.
	private async identite(): Promise<Props> {
		const props = this.props;
		if (!props?.id || props.id !== (await this.ctx.storage.get<string>(CLE_PROPRIETAIRE))) {
			throw new Error("Session MCP invalide, reconnecte le connecteur");
		}
		await this.prolonger();
		return props;
	}

	// Alarme unique, repoussee a chaque appel
	private async prolonger() {
		const precedente = await this.ctx.storage.get<string>(CLE_EXPIRATION);
		if (precedente) await this.cancelSchedule(precedente);
		const { id } = await this.schedule(INACTIVITE_SECONDES, "expirer");
		await this.ctx.storage.put(CLE_EXPIRATION, id);
	}

	// Alarme d'inactivite : l'index d'abord, mais le stockage est efface meme si KV echoue
	async expirer() {
		const id = await this.ctx.storage.get<string>(CLE_PROPRIETAIRE);
		if (id) await retirerNomMcp(this.env, id, this.name).catch((err) => console.error("Index MCP :", err));
		await this.destroy();
	}

	// Appelee par l'effacement des donnees (RPC) : vide tout le stockage du Durable Object
	async detruire() {
		await this.destroy();
	}

	private octokit(props: Props) {
		return ouvrirJeton(this.env, props).then((auth) => new Octokit({ auth }));
	}

	// Execute un outil pour le compte courant et met sa sortie en JSON
	private appel<T>(fn: (props: Props) => Promise<T>) {
		return this.identite().then(fn).then(json, erreur);
	}

	async init() {
		const { id } = this.props!;
		if (!(await this.ctx.storage.get(CLE_PROPRIETAIRE))) {
			await ajouterNomMcp(this.env, id, this.name);
			await this.ctx.storage.put(CLE_PROPRIETAIRE, id);
			await this.prolonger();
		}

		const contexte: Contexte = {
			server: this.server,
			env: this.env,
			identite: () => this.identite(),
			octokit: (props) => this.octokit(props),
			appel: (fn) => this.appel(fn),
		};
		for (const enregistrer of [outilsGithub, outilsBrouillons, outilsStyle, outilsCaptures, outilsPub]) {
			enregistrer(contexte);
		}
	}
}
