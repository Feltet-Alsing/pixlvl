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
		<span>Run state</span>
		<strong>Stage {stage} · {stageLevel}</strong>
		<small>{status === 'running' ? 'Live run active' : `Run ${status}`}</small>
	</div>
	<div class="loadout-summary-card">
		<span>Damage / cycle</span>
		<strong>{damagePerCycle}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Projectiles / cycle</span>
		<strong>{projectilesPerCycle}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Items equipped</span>
		<strong>{equippedCount}</strong>
	</div>
</div>

<style>
	.loadout-summary-strip {
		width: min(100%, 58rem);
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.loadout-summary-card {
		padding: 0.85rem 0.95rem;
		border-radius: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.3rem;
	}

	.loadout-summary-card span {
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #bdbdc3;
	}

	.loadout-summary-card strong {
		font-size: 1.45rem;
		line-height: 1;
	}

	.loadout-summary-card small {
		font-size: 0.78rem;
		color: #c4c4ca;
	}

	@media (max-width: 860px) {
		.loadout-summary-strip {
			grid-template-columns: 1fr;
		}
	}
</style>
