<script lang="ts">
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import type { DungeonWeaponDamageRow } from './types';

	interface Props {
		previewSketch: ((p: import('p5').default) => void) | null;
		previewKey: string;
		damageRows: DungeonWeaponDamageRow[];
		averageDamageTotal: number;
		latestCompletedCycle: number;
		formatDamageValue: (value: number) => string;
	}

	let {
		previewSketch,
		previewKey,
		damageRows,
		averageDamageTotal,
		latestCompletedCycle,
		formatDamageValue
	}: Props = $props();
</script>

<aside class="damage-overlay panel" aria-label="Loadout sweep preview">
	<div class="preview-block">
		<div class="preview-heading">
			<p class="eyebrow">Sweeper preview</p>
			<p class="support-copy">Live loadout order and cycle path.</p>
		</div>

		<div class="preview-canvas-shell">
			{#if previewSketch}
				{#key previewKey}
					<P5Canvas class="preview-canvas-frame" sketch={previewSketch} />
				{/key}
			{/if}
		</div>
	</div>

	<div class="preview-block damage-block">
		<div class="preview-heading">
			<p class="eyebrow">Damage overview</p>
		</div>

		{#if latestCompletedCycle > 0 && damageRows.length > 0}
			<div class="damage-list" role="list" aria-label="Weapon damage dealt">
				{#each damageRows as row (row.weaponInstanceId)}
					<div class={['damage-row', `rarity-${row.rarity}`]} role="listitem">
						<div class="damage-copy">
							<strong>{row.name}</strong>
							<span>{row.placement}</span>
						</div>
						<div class="damage-metrics">
							<strong
								>{formatDamageValue(
									averageDamageTotal > 0
										? (row.averageDamagePerCycle / averageDamageTotal) * 100
										: 0
								)}%</strong
							>
							<span>{formatDamageValue(row.averageDamagePerCycle)} avg / cycle</span>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-copy">Complete one full sweep cycle to see weapon damage.</p>
		{/if}
	</div>
</aside>

<style>
	.panel {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
		box-sizing: border-box;
	}

	.damage-overlay {
		display: grid;
		grid-template-rows: auto auto;
		gap: 0.9rem;
		padding: 1rem;
		height: fit-content;
		max-height: calc(100dvh - 2rem);
		overflow: auto;
	}

	.preview-block {
		display: grid;
		gap: 0.65rem;
		padding: 0.8rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.preview-heading {
		display: grid;
		gap: 0.35rem;
	}

	.eyebrow,
	.support-copy,
	.empty-copy,
	.damage-copy span,
	.damage-metrics span {
		margin: 0;
	}

	.eyebrow {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	.support-copy,
	.empty-copy,
	.damage-copy span,
	.damage-metrics span {
		color: #cfcfcf;
		line-height: 1.5;
		font-size: 0.85rem;
	}

	.preview-canvas-shell {
		min-width: 0;
		min-height: 12rem;
		height: 12rem;
		padding: 0.35rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
		overflow: hidden;
		pointer-events: none;
	}

	:global(.preview-canvas-frame) {
		width: 100%;
		height: 100%;
	}

	:global(.preview-canvas-frame canvas) {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.damage-block {
		min-height: 0;
	}

	.damage-list {
		display: grid;
		gap: 0.45rem;
		min-height: 0;
		max-height: 16rem;
		overflow: auto;
	}

	.damage-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem;
		align-items: center;
		padding: 0.55rem 0.7rem;
		border-radius: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.03);
	}

	.damage-copy,
	.damage-metrics {
		display: grid;
		gap: 0.08rem;
	}

	.damage-metrics {
		justify-items: end;
		text-align: right;
	}

	.damage-copy strong,
	.damage-metrics strong {
		font-size: 0.92rem;
	}

	.rarity-normal strong {
		color: #f1f1f1;
	}

	.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
		background: rgba(84, 150, 255, 0.08);
	}

	.rarity-magic strong {
		color: #9ec2ff;
	}

	.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
		background: rgba(255, 210, 74, 0.08);
	}

	.rarity-rare strong {
		color: #ffe08f;
	}

	.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
		background: rgba(224, 74, 74, 0.09);
	}

	.rarity-exotic strong {
		color: #ffb08f;
	}

	.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
		background: rgba(170, 104, 48, 0.11);
	}

	.rarity-legendary strong {
		color: #e09c5c;
	}

	@media (max-width: 860px) {
		.damage-overlay {
			height: auto;
			max-height: none;
		}

		.preview-canvas-shell {
			min-height: 10rem;
			height: 10rem;
		}

		.damage-list {
			max-height: none;
		}
	}

	@media (max-width: 640px) {
		.preview-canvas-shell {
			min-height: 8rem;
			height: 8rem;
		}

		.damage-row {
			padding: 0.46rem 0.58rem;
		}

		.damage-copy strong,
		.damage-metrics strong {
			font-size: 0.84rem;
		}

		.support-copy,
		.empty-copy,
		.damage-copy span,
		.damage-metrics span {
			font-size: 0.78rem;
		}
	}
</style>
