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
		levelsPerStage: number;
		unlockedStages: CampaignStageSummary[];
		hasCampaignState: boolean;
		stageError?: string;
		stageSuccess?: string;
		submit?: SubmitFunction;
		onClose: () => void;
	}

	let {
		campaignId,
		campaignNumber,
		campaignRoutes,
		currentStage,
		currentLevel,
		highestUnlockedLevel,
		highestClearedLevel,
		levelsPerStage,
		unlockedStages,
		hasCampaignState,
		stageError,
		stageSuccess,
		submit,
		onClose
	}: Props = $props();
</script>

<aside class="campaign-drawer" aria-label="Campaign menu">
	<div class="campaign-drawer-header">
		<div class="compact-heading">
			<p class="eyebrow">Campaign {campaignNumber}</p>
			<p class="upgrade-note">Swap campaigns or jump to an unlocked stage.</p>
		</div>
		<a class="drawer-back-link" href={resolve('/campaigns')}>All campaigns</a>
		<button class="drawer-close" type="button" aria-label="Close campaign menu" onclick={onClose}>
			Close
		</button>
	</div>

	<div class="drawer-switcher">
		<p class="drawer-label">Campaign</p>
		<div class="drawer-campaign-links">
			{#each campaignRoutes as campaignRoute (campaignRoute.campaignId)}
				<a
					class:active={campaignRoute.campaignId === campaignId}
					class="drawer-campaign-link"
						href={`${resolve(`/campaigns/${campaignRoute.campaignId}`)}?menu=campaign`}
				>
					Campaign {campaignRoute.campaignId}
				</a>
			{/each}
		</div>
	</div>

	<div class="campaign-summary-grid">
		<div class="summary-row">
			<span>Current stage</span>
			<strong>{currentStage}</strong>
		</div>
		<div class="summary-row">
			<span>Current level</span>
			<strong>{currentLevel}</strong>
		</div>
		<div class="summary-row">
			<span>Unlocked</span>
			<strong>{highestUnlockedLevel}</strong>
		</div>
		<div class="summary-row">
			<span>Cleared</span>
			<strong>{highestClearedLevel}</strong>
		</div>
	</div>

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
						<span>Stage {stage.stage}</span>
						<strong>{stage.unlockedLevelCount} / {levelsPerStage} levels</strong>
						<small>
							Levels {stage.startLevel}-{stage.endLevel}
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
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 5;
		width: min(24rem, 100vw);
		padding: 1rem;
		display: grid;
		align-content: start;
		gap: 0.85rem;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: -24px 0 60px rgba(0, 0, 0, 0.42);
		backdrop-filter: blur(12px);
		pointer-events: auto;
		overflow: auto;
	}

	.campaign-drawer-header,
	.campaign-summary-grid,
	.campaign-stage-list,
	.drawer-switcher {
		display: grid;
		gap: 0.65rem;
	}

	.campaign-drawer-header {
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: start;
		gap: 0.75rem;
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

	.upgrade-note,
	.stage-card small {
		margin: 0;
		color: #c4c4c4;
	}

	.drawer-campaign-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.drawer-campaign-link,
	.drawer-back-link,
	.drawer-close {
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

	.drawer-close {
		cursor: pointer;
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
</style>
