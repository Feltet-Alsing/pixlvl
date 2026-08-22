<script lang="ts">
	import { formatDisplayNumber } from '$lib/number-format';

	interface Props {
		stage: number;
		stageLevel: number;
		status: string;
		scrap: number;
		damagePerCycle: string | number;
		projectilesPerCycle: string | number;
		equippedCount: number;
	}

	let {
		stage,
		stageLevel,
		status,
		scrap,
		damagePerCycle,
		projectilesPerCycle,
		equippedCount
	}: Props = $props();

	const formatMaybeNumber = (value: string | number) =>
		typeof value === 'number' ? formatDisplayNumber(value) : value;
</script>

<div class="loadout-summary-strip" aria-label="Equipped loadout cycle summary">
	<div class="loadout-summary-card">
		<span>Run</span>
		<strong>Stage {stage} · {stageLevel}</strong>
		<small>{status === 'running' ? 'Live' : status}</small>
	</div>
	<div class="loadout-summary-card">
		<span>Damage</span>
		<strong>{formatMaybeNumber(damagePerCycle)}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Scrap</span>
		<strong>{formatDisplayNumber(scrap)}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Projectiles</span>
		<strong>{formatMaybeNumber(projectilesPerCycle)}</strong>
	</div>
	<div class="loadout-summary-card">
		<span>Equipped</span>
		<strong>{formatDisplayNumber(equippedCount)}</strong>
	</div>
</div>

<style>
	.loadout-summary-strip {
		width: 100%;
		display: grid;
		grid-template-columns: repeat(5, minmax(4.75rem, max-content));
		justify-content: start;
		gap: 0.35rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.loadout-summary-strip::-webkit-scrollbar {
		display: none;
	}

	.loadout-summary-card {
		padding: 0.42rem 0.55rem;
		border-radius: 0.8rem;
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
		font-size: 0.9rem;
		line-height: 1;
	}

	.loadout-summary-card small {
		font-size: 0.58rem;
		color: #c4c4ca;
		line-height: 1.1;
	}

	@media (min-width: 861px) {
		.loadout-summary-card:first-child {
			min-width: 8.25rem;
		}
	}

	@media (max-width: 860px) {
		.loadout-summary-strip {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.35rem;
		}
	}
</style>
