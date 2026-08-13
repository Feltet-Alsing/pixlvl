<script lang="ts">
	interface Props {
		stage: number;
		stageLevel: number;
		status: string;
		damagePerCycle: string | number;
		projectilesPerCycle: string | number;
		equippedCount: number;
	}

	let { stage, stageLevel, status, damagePerCycle, projectilesPerCycle, equippedCount }: Props =
		$props();
</script>

<div class="loadout-summary-strip" aria-label="Equipped loadout cycle summary">
	<div class="loadout-summary-card">
		<span>Run</span>
		<strong>Stage {stage} · {stageLevel}</strong>
		<small>{status === 'running' ? 'Live' : status}</small>
	</div>
	<div class="loadout-summary-card">
		<span>Damage</span>
		<strong>{damagePerCycle}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Projectiles</span>
		<strong>{projectilesPerCycle}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Equipped</span>
		<strong>{equippedCount}</strong>
	</div>
</div>

<style>
	.loadout-summary-strip {
		width: 100%;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, max-content));
		justify-content: start;
		gap: 0.4rem;
	}

	.loadout-summary-card {
		padding: 0.45rem 0.6rem;
		border-radius: 0.68rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.14rem;
		min-width: 0;
	}

	.loadout-summary-card span {
		font-size: 0.56rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #bdbdc3;
		line-height: 1;
	}

	.loadout-summary-card strong {
		font-size: 0.96rem;
		line-height: 1;
	}

	.loadout-summary-card small {
		font-size: 0.58rem;
		color: #c4c4ca;
		line-height: 1.1;
	}

	@media (max-width: 860px) {
		.loadout-summary-strip {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.35rem;
		}
	}
</style>
