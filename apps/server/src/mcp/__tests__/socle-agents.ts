// Remplace la bibliotheque agents (runtime Workers) sous Node : stockage, alarmes, destroy
export class McpAgentFactice {
	props?: unknown;
	name = "";
	constructor(
		public ctx: { storage: { deleteAll(): Promise<void> }; planifies: Map<string, unknown> },
		public env: unknown,
	) {}
	async schedule(secondes: number, callback: string) {
		const id = `alarme-${this.ctx.planifies.size}-${Math.random()}`;
		this.ctx.planifies.set(id, { secondes, callback });
		return { id };
	}
	async cancelSchedule(id: string) {
		return this.ctx.planifies.delete(id);
	}
	async destroy() {
		await this.ctx.storage.deleteAll();
		this.ctx.planifies.clear();
	}
}
