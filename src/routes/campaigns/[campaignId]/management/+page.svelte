<script lang="ts">
	import { resolve } from '$app/paths';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import type { PageProps } from './$types';

	interface ManagementStageSummary {
		stage: number;
		startLevel: number;
		endLevel: number;
		unlockedLevelCount: number;
		isCurrentStage: boolean;
		isCleared: boolean;
	}

	let { data, form }: PageProps = $props();

	let highestUnlockedLevel = $derived(data.campaignState?.highestUnlockedLevel ?? 1);
	let highestClearedLevel = $derived(data.campaignState?.highestClearedLevel ?? 0);
	let unlockedStages = $derived.by(() => {
		return Array.from({ length: data.campaign.stages }, (_, index) => index + 1)
			.map((stage) => {
				const startLevel = (stage - 1) * data.campaign.levelsPerStage + 1;
				const endLevel = startLevel + data.campaign.levelsPerStage - 1;
				const unlockedLevelCount = Math.max(
					0,
					Math.min(highestUnlockedLevel - startLevel + 1, data.campaign.levelsPerStage)
				);

				return {
					stage,
					startLevel,
					endLevel,
					unlockedLevelCount,
					isCurrentStage: data.campaignState?.currentLevel
						? Math.ceil(data.campaignState.currentLevel / data.campaign.levelsPerStage) === stage
						: stage === 1,
					isCleared: highestClearedLevel >= endLevel
				} satisfies ManagementStageSummary;
			})
			.filter((stage) => stage.unlockedLevelCount > 0);
	});

	let loadoutTooltip = $derived(
		(data.gameState?.pixlState.loadoutPlacements ?? [])
			.map((placement) => {
				const ownedWeapon = data.gameState?.pixlState.ownedWeapons.find(
					(weapon) => weapon.instanceId === placement.weaponInstanceId
				);
				const definition = ownedWeapon
					? data.weaponPool.find((weapon) => weapon.id === ownedWeapon.definitionId)
					: null;
				return definition ? `${definition.name} (${placement.x}, ${placement.y})` : null;
			})
			.filter((entry): entry is string => entry !== null)
			.join('\n') || 'No equipped weapons'
	);
</script>

<svelte:head>
	<title>Management | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<div class="topbar">
			<a class="back" href={resolve('/campaigns')}>All campaigns</a>
			<CampaignRouteNav campaignId={data.campaignId} active="management" {loadoutTooltip} />
		</div>

		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Management</h1>
			<p class="lede">
				Handle progression between runs: select stages, review unlock state, then jump back into the
				arena.
			</p>
		</section>

		<section class="grid">
			<div class="panel">
				<div class="section-head">
					<h2>Stage selection</h2>
					<p>Unlocked stages can be replayed freely.</p>
				</div>

				{#if form?.stageError}
					<p class="feedback error">{form.stageError}</p>
				{:else if form?.stageSuccess}
					<p class="feedback success">{form.stageSuccess}</p>
				{/if}

				{#if data.campaignState}
					<div class="stage-grid">
						{#each unlockedStages as stage (stage.stage)}
							<form method="post" action="?/selectStage">
								<input type="hidden" name="stage" value={stage.stage} />
								<button class:active={stage.isCurrentStage} class="stage-card" type="submit">
									<span>Stage {stage.stage}</span>
									<strong>{stage.unlockedLevelCount} / {data.campaign.levelsPerStage} levels</strong
									>
									<small>
										Levels {stage.startLevel}-{stage.endLevel}
										{stage.isCleared ? ' · cleared' : ''}
									</small>
								</button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="feedback neutral">Sign in to persist stage progression.</p>
				{/if}
			</div>

			<div class="panel summary-stack">
				<div class="section-head">
					<h2>Run summary</h2>
					<p>Current persistent state for this campaign.</p>
				</div>
				<div class="stat-card">
					<span>Current level</span>
					<strong>{data.campaignState?.currentLevel ?? 1}</strong>
				</div>
				<div class="stat-card">
					<span>Highest unlocked</span>
					<strong>{highestUnlockedLevel}</strong>
				</div>
				<div class="stat-card">
					<span>Highest cleared</span>
					<strong>{highestClearedLevel}</strong>
				</div>
				<div class="route-links">
					<a class="jump" href={resolve(`/campaigns/${data.campaignId}`)}>Return to arena</a>
					<a class="jump" href={resolve(`/campaigns/${data.campaignId}/stats`)}>Open stats</a>
					<a class="jump" href={resolve(`/campaigns/${data.campaignId}/loadout`)}>Open loadout</a>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		min-height: 100%;
		background: #050505;
		color: #f5f5f5;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.route-page {
		min-height: 100vh;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 24%), #050505;
	}

	.shell {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		gap: 1rem;
	}

	.topbar,
	.route-links,
	.stage-grid {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.topbar {
		justify-content: space-between;
		align-items: center;
	}

	.panel,
	.stage-card,
	.jump,
	.back,
	.feedback {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.back,
	.jump {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.2rem;
		padding: 0 0.9rem;
		text-decoration: none;
		color: #f5f5f5;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.panel {
		padding: 1rem;
		display: grid;
		gap: 0.8rem;
	}

	.hero h1,
	.section-head h2 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow,
	.stat-card span,
	.stage-card span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p,
	.stage-card small {
		margin: 0;
		color: #c4c4c4;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(18rem, 24rem);
		gap: 1rem;
	}

	.stage-card {
		width: 100%;
		padding: 0.85rem;
		display: grid;
		gap: 0.3rem;
		text-align: left;
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	.stage-card.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.1);
	}

	.stat-card {
		padding: 0.85rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.25rem;
	}

	.stat-card strong {
		font-size: 1.1rem;
	}

	.feedback {
		padding: 0.8rem 0.9rem;
	}

	.feedback.error {
		color: #ffb3b3;
		background: rgba(255, 96, 96, 0.08);
	}

	.feedback.success {
		background: rgba(103, 217, 111, 0.1);
	}

	.feedback.neutral {
		background: rgba(255, 255, 255, 0.05);
	}

	.summary-stack {
		align-content: start;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.topbar {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
