<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	interface CampaignRouteSummary {
		campaignId: number;
		stages: number;
		totalLevels: number;
	}

	interface CampaignStageSummary {
		stage: number;
		startLevel: number;
		endLevel: number;
		unlockedLevelCount: number;
		isCurrentStage: boolean;
		isCleared: boolean;
	}

	interface Props {
		campaignId: number;
		campaignNumber: number;
		campaignRoutes: CampaignRouteSummary[];
		currentStage: number;
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		isEndlessCampaign: boolean;
		levelsPerStage: number;
		unlockedStages: CampaignStageSummary[];
		hasCampaignState: boolean;
		stageError?: string;
		stageSuccess?: string;
		submit?: SubmitFunction;
	}

	let {
		campaignId,
		campaignNumber,
		campaignRoutes,
		currentStage,
		currentLevel,
		highestUnlockedLevel,
		highestClearedLevel,
		isEndlessCampaign,
		levelsPerStage,
		unlockedStages,
		hasCampaignState,
		stageError,
		stageSuccess,
		submit
	}: Props = $props();

	let nextCheckpointUnlockWave = $derived.by(() => {
		if (!isEndlessCampaign) {
			return null;
		}

		return Math.ceil(highestUnlockedLevel / levelsPerStage) * levelsPerStage;
	});
</script>

<aside class="campaign-drawer" aria-label="Campaign menu">
	<div class="campaign-drawer-header">
		<div class="compact-heading">
			<p class="eyebrow">Campaign {campaignNumber}</p>
		</div>
	</div>

	<div class="drawer-switcher">
		<p class="drawer-label">Campaign</p>
		<div class="drawer-campaign-links">
			{#each campaignRoutes as campaignRoute (campaignRoute.campaignId)}
				<a
					class:active={campaignRoute.campaignId === campaignId}
					class="drawer-campaign-link"
					href={resolve(`/campaigns/${campaignRoute.campaignId}?menu=campaign`)}
				>
					Campaign {campaignRoute.campaignId}
				</a>
			{/each}
		</div>
	</div>

	<div class="campaign-summary-grid">
		<div class="summary-row">
			<span>{isEndlessCampaign ? 'Current checkpoint' : 'Current stage'}</span>
			<strong>{currentStage}</strong>
		</div>
		<div class="summary-row">
			<span>{isEndlessCampaign ? 'Current wave' : 'Current level'}</span>
			<strong>{currentLevel}</strong>
		</div>
		<div class="summary-row">
			<span>{isEndlessCampaign ? 'Unlocked wave' : 'Unlocked'}</span>
			<strong>{highestUnlockedLevel}</strong>
		</div>
		<div class="summary-row">
			<span>{isEndlessCampaign ? 'Best cleared wave' : 'Cleared'}</span>
			<strong>{highestClearedLevel}</strong>
		</div>
	</div>

	{#if nextCheckpointUnlockWave !== null}
		<p class="feedback checkpoint-hint">Next checkpoint unlocks at wave {nextCheckpointUnlockWave}.</p>
	{/if}

	{#if stageError}
		<p class="feedback error">{stageError}</p>
	{:else if stageSuccess}
		<p class="feedback success">{stageSuccess}</p>
	{/if}

	{#if hasCampaignState}
		<div class="campaign-stage-list">
			{#each unlockedStages as stage (stage.stage)}
				<form method="post" action="?/selectStage" use:enhance={submit}>
					<input type="hidden" name="stage" value={stage.stage} />
					<button class:active={stage.isCurrentStage} class="stage-card" type="submit">
						<span>{isEndlessCampaign ? `Checkpoint ${stage.stage}` : `Stage ${stage.stage}`}</span>
						<strong>
							{stage.unlockedLevelCount} / {levelsPerStage}
							{isEndlessCampaign ? 'waves' : 'levels'}
						</strong>
						<small>
							{isEndlessCampaign ? 'Waves' : 'Levels'}
							{stage.startLevel}-{stage.endLevel}
							{stage.isCleared ? ' · cleared' : ''}
						</small>
					</button>
				</form>
			{/each}
		</div>
	{:else}
		<p class="feedback">Sign in to persist stage progression.</p>
	{/if}
</aside>

<style>
	.campaign-drawer {
		position: static;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		min-height: 0;
		padding: 1rem;
		display: grid;
		grid-template-rows: auto auto auto auto minmax(0, 1fr);
		align-content: start;
		gap: 0.85rem;
		align-self: stretch;
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.1rem;
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		backdrop-filter: blur(12px);
		pointer-events: auto;
		overflow: hidden;
	}

	.campaign-drawer-header,
	.campaign-summary-grid,
	.campaign-stage-list,
	.drawer-switcher {
		display: grid;
		gap: 0.65rem;
	}

	.campaign-drawer-header {
		grid-template-columns: minmax(0, 1fr);
		align-items: start;
		gap: 0.75rem;
	}

	.campaign-stage-list {
		min-height: 0;
		overflow: auto;
		padding-right: 0.2rem;
	}

	.compact-heading {
		display: grid;
		gap: 0.2rem;
	}

	.eyebrow,
	.drawer-label,
	.summary-row span,
	.stage-card span {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
		margin: 0;
	}

	.stage-card small {
		margin: 0;
		color: #c4c4c4;
	}

	.drawer-campaign-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.drawer-campaign-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2rem;
		padding: 0 0.8rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.06);
		color: #f5f5f5;
		text-decoration: none;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.drawer-campaign-link.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}

	.campaign-summary-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.summary-row,
	.stage-card {
		padding: 0.8rem 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.stage-card {
		width: 100%;
		display: grid;
		gap: 0.25rem;
		text-align: left;
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	.stage-card.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.08);
	}

	.feedback {
		padding: 0.85rem 1rem;
		margin: 0;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.95rem;
	}

	.feedback.checkpoint-hint {
		border-color: rgba(84, 150, 255, 0.22);
		color: #d7e7ff;
		background: rgba(84, 150, 255, 0.08);
	}

	.feedback.error {
		border-color: rgba(255, 96, 96, 0.35);
		color: #ffb3b3;
		background: rgba(255, 96, 96, 0.08);
	}

	.feedback.success {
		border-color: rgba(255, 255, 255, 0.12);
		color: #f5f5f5;
		background: rgba(255, 255, 255, 0.05);
	}

	@media (max-width: 860px) {
		.campaign-drawer {
			position: static;
			inset: auto;
			width: 100%;
			height: auto;
			max-height: none;
			padding: 0.8rem;
			grid-template-rows: none;
			border-right: 1px solid rgba(255, 255, 255, 0.08);
			box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
			overflow: visible;
		}

		.campaign-stage-list {
			overflow: visible;
			padding-right: 0;
		}

		.campaign-drawer-header {
			grid-template-columns: 1fr;
			gap: 0.55rem;
		}

		.campaign-summary-grid {
			grid-template-columns: 1fr;
		}

		.drawer-campaign-links {
			gap: 0.45rem;
		}

		.drawer-campaign-link {
			min-height: 1.9rem;
			padding: 0 0.72rem;
			font-size: 0.76rem;
		}

		.summary-row,
		.stage-card {
			padding: 0.68rem 0.78rem;
		}

		.stage-card strong {
			font-size: 0.92rem;
		}

		.stage-card small {
			font-size: 0.76rem;
		}
	}

	@media (max-width: 480px) {
		.campaign-drawer {
			padding: 0.7rem;
			gap: 0.7rem;
		}

		.summary-row,
		.stage-card {
			padding: 0.62rem 0.72rem;
		}
	}
</style>
