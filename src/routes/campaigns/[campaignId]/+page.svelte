<script lang="ts">
	import { resolve } from '$app/paths';
	import { createBaselineUpgradeablePixlState, getUpgradeOptions } from '$lib/game/upgrades';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { createCampaignSketch } from '$lib/p5/campaign-1-sketch';
	import type { PageProps } from './$types';

	type LivePixlState = NonNullable<NonNullable<PageProps['data']['gameState']>['pixlState']>;
	type LiveCampaignState = NonNullable<PageProps['data']['campaignState']>;

	interface SketchStateUpdate {
		gold: number;
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		completed: boolean;
	}

	let { data, form }: PageProps = $props();
	let livePixlState: LivePixlState | null = $derived(data.gameState?.pixlState ?? null);
	let liveCampaignState: LiveCampaignState | null = $derived(data.campaignState ?? null);
	let upgradeState = $derived(livePixlState ?? createBaselineUpgradeablePixlState());
	let upgradeOptions = $derived(getUpgradeOptions(upgradeState));

	function handleSketchStateChange(update: SketchStateUpdate) {
		if (livePixlState) {
			livePixlState = {
				...livePixlState,
				gold: update.gold
			};
		}

		if (liveCampaignState) {
			liveCampaignState = {
				...liveCampaignState,
				currentLevel: update.currentLevel,
				highestUnlockedLevel: update.highestUnlockedLevel,
				highestClearedLevel: update.highestClearedLevel,
				completed: update.completed
			};
		}
	}

	const campaignSketch = (p: import('p5').default) =>
		createCampaignSketch(data.campaign, data.combatProfile, {
			persistPath: '/api/game/state',
			pixlState: data.gameState?.pixlState ?? null,
			campaignState: data.campaignState ?? null,
			onStateChange: handleSketchStateChange
		})(p);
</script>

<svelte:head>
	<title>Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		<div class="topbar">
			<a class="back" href={resolve('/campaigns')}>All campaigns</a>
			<div class="meta">
				<p class="eyebrow">Campaign {data.campaign.campaign}</p>
				<p>
					{data.campaign.stages} stages · {data.campaign.totalLevels} levels · {data.campaign
						.combatProfile}
				</p>
			</div>
		</div>

		<div class="layout">
			<section class="canvas-panel">
				<div class="canvas-copy">
					<p class="eyebrow">Live preview</p>
					<h1>Run surface</h1>
					<p class="lede">No intro copy here. This is the live campaign view.</p>
				</div>

				<div class="canvas-stage">
					<aside class="panel stats-panel">
						<div class="panel-heading">
							<h2>Pixl stats</h2>
							<p class="lede">Persistent combat values and saved campaign progress.</p>
						</div>

						<div class="stats">
							<div>
								<span>Pixl health</span>
								<strong>{livePixlState?.health ?? data.combatProfile.pixl.health}</strong>
							</div>
							<div>
								<span>Pixl damage</span>
								<strong>{livePixlState?.damage ?? data.combatProfile.pixl.damage}</strong>
							</div>
							<div>
								<span>Attack speed</span>
								<strong>
									{(livePixlState?.attackSpeed ?? data.combatProfile.pixl.attackSpeed).toFixed(1)}/s
								</strong>
							</div>
							<div>
								<span>{livePixlState ? 'Gold' : 'Projectile speed'}</span>
								<strong
									>{livePixlState ? livePixlState.gold : data.combatProfile.projectileSpeed}</strong
								>
							</div>
							{#if liveCampaignState}
								<div>
									<span>Saved progression</span>
									<strong>
										Level {liveCampaignState.currentLevel} · cleared {liveCampaignState.highestClearedLevel}
									</strong>
								</div>
							{/if}
						</div>
					</aside>

					{#key data.campaignId}
						<P5Canvas class="canvas-frame" sketch={campaignSketch} />
					{/key}
				</div>
			</section>

			<aside class="panel shop-panel">
				<div class="panel-heading upgrade-header">
					<h2>Shop</h2>
					<p>Spend saved gold on persistent pixl growth.</p>
				</div>

				{#if form?.purchaseError}
					<p class="feedback error">{form.purchaseError}</p>
				{:else if form?.purchaseSuccess}
					<p class="feedback success">{form.purchaseSuccess}</p>
				{/if}

				<div class="upgrade-panel">
					{#if livePixlState}
						{#each upgradeOptions as option (option.key)}
							<form class="upgrade-card" method="post" action="?/purchaseUpgrade">
								<input type="hidden" name="upgrade" value={option.key} />
								<div>
									<span>{option.label}</span>
									<strong>Cost {option.cost}</strong>
								</div>
								<p>{option.description}</p>
								<p class="upgrade-level">Bought {option.level} times</p>
								<button class="purchase" type="submit" disabled={!option.canAfford}>
									{option.canAfford ? `Buy ${option.label}` : 'Not enough gold'}
								</button>
							</form>
						{/each}
					{:else}
						<p class="upgrade-note">Sign in to save gold and buy persistent upgrades.</p>
					{/if}
				</div>
			</aside>
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #020202;
		color: #f5f5f5;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.page {
		min-height: 100vh;
		padding: 1.5rem;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.shell {
		width: min(100%, 82rem);
		margin: 0 auto;
		display: grid;
		gap: 1rem;
	}

	.topbar,
	.panel,
	.canvas-panel {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
	}

	.topbar {
		padding: 1rem 1.25rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: 2.7rem;
		padding: 0 1rem;
		border-radius: 999px;
		background: #ffffff;
		color: #020202;
		text-decoration: none;
		font-weight: 600;
	}

	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
		align-items: stretch;
	}

	.panel {
		padding: 1.5rem;
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.canvas-panel {
		padding: 1.25rem;
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.canvas-stage {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 42rem;
	}

	.eyebrow,
	p,
	h1,
	span,
	strong {
		margin: 0;
	}

	.eyebrow,
	.stats span {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #a3a3a3;
	}

	.topbar p:last-child,
	.lede {
		color: #c4c4c4;
	}

	h1 {
		font-size: 1.8rem;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
	}

	.panel-heading,
	.canvas-copy {
		display: grid;
		gap: 0.35rem;
	}

	.canvas-copy {
		justify-items: center;
		text-align: center;
	}

	.stats {
		display: grid;
		gap: 0.85rem;
	}

	.stats div {
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.35rem;
	}

	.stats strong {
		font-size: 1.15rem;
	}

	.feedback {
		padding: 0.85rem 1rem;
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

	.upgrade-panel {
		display: grid;
		gap: 0.85rem;
	}

	.stats-panel {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 2;
		width: min(18rem, calc(100% - 2rem));
		padding: 1rem;
		background: rgba(10, 10, 10, 0.82);
		backdrop-filter: blur(12px);
		align-content: start;
	}

	.shop-panel {
		align-content: center;
	}

	.upgrade-header {
		display: grid;
		gap: 0.35rem;
	}

	.upgrade-header p,
	.upgrade-card p,
	.upgrade-note,
	.upgrade-level {
		margin: 0;
		color: #c4c4c4;
	}

	.upgrade-card {
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.55rem;
	}

	.upgrade-card div {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.upgrade-level {
		font-size: 0.9rem;
	}

	.purchase {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: #ffffff;
		color: #020202;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.purchase:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	:global(.canvas-frame) {
		width: min(100%, 46rem);
		margin-inline: auto;
		overflow: hidden;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #000000;
	}

	:global(.canvas-frame canvas) {
		display: block;
		width: 100%;
		height: auto;
	}

	@media (max-width: 860px) {
		.page {
			padding: 1rem;
		}

		.layout {
			grid-template-columns: 1fr;
		}

		.canvas-stage {
			min-height: auto;
			place-items: stretch;
		}

		.stats-panel {
			position: static;
			width: auto;
			margin-bottom: 1rem;
		}

		.topbar {
			flex-direction: column;
			align-items: flex-start;
		}

		.shop-panel {
			align-content: start;
		}
	}
</style>
