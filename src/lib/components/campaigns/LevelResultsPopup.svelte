<script lang="ts">
	interface RewardDropRow {
		instanceId: string;
		definitionId: string;
		name: string;
		rarity: 'normal' | 'magic' | 'rare' | 'exotic' | 'legendary';
		isNew: boolean;
	}

	interface Props {
		campaignNumber: number;
		stage: number;
		stageLevel: number;
		rewardDropRows: RewardDropRow[];
		resultsEmptyLabel: string;
		resultsCountdownLabel: string;
		onSkip: () => void;
	}

	let {
		campaignNumber,
		stage,
		stageLevel,
		rewardDropRows,
		resultsEmptyLabel,
		resultsCountdownLabel,
		onSkip
	}: Props = $props();
</script>

<div class="results-popup" aria-live="polite">
	<div class="results-popup-header compact-heading">
		<p class="eyebrow">Level rewards</p>
		<p class="results-context">Campaign {campaignNumber} · Stage {stage} · Level {stageLevel}</p>
	</div>

	{#if rewardDropRows.length > 0}
		<div class="results-drop-list">
			{#each rewardDropRows as drop (drop.instanceId)}
				<div class={[`rarity-${drop.rarity}`, 'results-drop-row']}>
					<div class="results-drop-copy">
						<strong>{drop.name}</strong>
						<span>{drop.rarity}</span>
					</div>
					<strong class:results-tag-new={drop.isNew} class="results-tag">
						{drop.isNew ? 'New' : 'Duplicate'}
					</strong>
				</div>
			{/each}
		</div>
	{:else}
		<p class="results-empty">{resultsEmptyLabel}</p>
	{/if}

	<div class="results-popup-footer">
		<p class="results-countdown">{resultsCountdownLabel}</p>
		<button class="results-skip" type="button" onclick={onSkip}>Skip</button>
	</div>
</div>

<style>
	.results-popup {
		grid-column: 1;
		grid-row: 2;
		justify-self: center;
		align-self: center;
		width: min(28rem, calc(100vw - 2rem));
		padding: 1rem;
		display: grid;
		gap: 0.9rem;
		text-align: left;
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.results-popup-header,
	.results-popup-footer,
	.results-drop-copy,
	.results-drop-list {
		display: grid;
		gap: 0.2rem;
	}

	.results-drop-list {
		gap: 0.6rem;
	}

	.compact-heading {
		gap: 0.2rem;
	}

	.eyebrow,
	.results-drop-copy span,
	.results-tag,
	.results-countdown {
		margin: 0;
		font-size: 0.82rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.eyebrow {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #9d9d9d;
	}

	.results-context,
	.results-countdown,
	.results-drop-copy span,
	.results-empty {
		margin: 0;
		color: #cfcfcf;
	}

	.results-drop-row {
		padding: 0.8rem 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: center;
	}

	.results-drop-copy strong {
		font-size: 1rem;
	}

	.results-tag {
		color: #bfbfbf;
	}

	.results-tag-new {
		color: #c9f8cc;
	}

	.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
	}

	.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
	}

	.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
	}

	.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
	}

	.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
	}

	.results-popup-footer {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
	}

	.results-skip {
		justify-self: end;
		min-height: 2.15rem;
		padding: 0 0.8rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(10, 10, 10, 0.84);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.86rem;
		font-weight: 600;
		cursor: pointer;
	}
</style>
