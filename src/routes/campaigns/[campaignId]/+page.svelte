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

	interface CombatOverlayState {
		stage: number;
		stageLevel: number;
		campaignLevel: number;
		pixlHealth: number;
		maxPixlHealth: number;
		bankedGold: number;
		waveGold: number;
		remainingEnemies: number;
		composition: {
			biters: number;
			swarmers: number;
			tankers: number;
		};
		status: 'running' | 'cleared' | 'defeated' | 'complete';
	}

	function createInitialCombatOverlay(pageData: PageProps['data']): CombatOverlayState {
		const firstLevel = pageData.campaign.levels[0];
		const maxPixlHealth =
			pageData.gameState?.pixlState.health ?? pageData.combatProfile.pixl.health;
		const composition = {
			biters: firstLevel?.composition.biters ?? 0,
			swarmers: firstLevel?.composition.swarmers ?? 0,
			tankers: firstLevel?.composition.tankers ?? 0
		};

		return {
			stage: firstLevel?.stage ?? 1,
			stageLevel: firstLevel?.stageLevel ?? 1,
			campaignLevel: pageData.campaignState?.currentLevel ?? 1,
			pixlHealth: maxPixlHealth,
			maxPixlHealth,
			bankedGold: pageData.gameState?.pixlState.gold ?? 0,
			waveGold: 0,
			remainingEnemies: composition.biters + composition.swarmers + composition.tankers,
			composition,
			status: 'running'
		};
	}

	let { data, form }: PageProps = $props();
	let showStats = $state(true);
	let showShop = $state(true);
	let livePixlState: LivePixlState | null = $derived(data.gameState?.pixlState ?? null);
	let liveCampaignState: LiveCampaignState | null = $derived(data.campaignState ?? null);
	let combatOverlayOverride = $state<CombatOverlayState | null>(null);
	let combatOverlay = $derived(combatOverlayOverride ?? createInitialCombatOverlay(data));
	let upgradeState = $derived(livePixlState ?? createBaselineUpgradeablePixlState());
	let upgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let combatHealthRatio = $derived(
		combatOverlay.maxPixlHealth > 0 ? combatOverlay.pixlHealth / combatOverlay.maxPixlHealth : 0
	);
	let combatStatusLabel = $derived.by(() => {
		if (combatOverlay.status === 'running') return null;
		if (combatOverlay.status === 'defeated') return 'PIXL DOWN';
		if (combatOverlay.status === 'complete') return `CAMPAIGN ${data.campaign.campaign} COMPLETE`;
		return 'LEVEL CLEAR';
	});
	let combatStatusTone = $derived(combatOverlay.status === 'defeated' ? 'danger' : 'neutral');

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

		combatOverlayOverride = {
			...combatOverlay,
			bankedGold: update.gold,
			campaignLevel: update.currentLevel
		};
	}

	function handleCombatStateChange(update: CombatOverlayState) {
		combatOverlayOverride = update;
	}

	const campaignSketch = (p: import('p5').default) =>
		createCampaignSketch(data.campaign, data.combatProfile, {
			persistPath: '/api/game/state',
			pixlState: data.gameState?.pixlState ?? null,
			campaignState: data.campaignState ?? null,
			onCombatStateChange: handleCombatStateChange,
			onStateChange: handleSketchStateChange
		})(p);
</script>

<svelte:head>
	<title>Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="page">
	<section class="canvas-stage">
		{#key data.campaignId}
			<P5Canvas class="canvas-frame" sketch={campaignSketch} />
		{/key}

		<div class="overlay-layout">
			<div class="utility-bar">
				<a class="back" href={resolve('/campaigns')}>All campaigns</a>
				<div class="utility-actions">
					<button class="toggle" type="button" onclick={() => (showStats = !showStats)}>
						{showStats ? 'Hide stats' : 'Show stats'}
					</button>
					<button class="toggle" type="button" onclick={() => (showShop = !showShop)}>
						{showShop ? 'Hide shop' : 'Show shop'}
					</button>
				</div>
			</div>

			{#if showStats}
				<aside class="overlay panel stats-panel">
					<div class="meta-pill stats-meta">
						<p class="eyebrow">Campaign {data.campaign.campaign}</p>
						<p>
							{data.campaign.stages} stages · {data.campaign.totalLevels} levels · {data.campaign
								.combatProfile}
						</p>
					</div>

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
			{/if}

			{#if showShop}
				<aside class="overlay panel shop-panel">
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
			{/if}

			<div class="overlay combat-panel">
				<p class="combat-title">
					Campaign {data.campaign.campaign} · Stage {combatOverlay.stage} · Level {combatOverlay.stageLevel}
				</p>
				<div class="combat-grid">
					<div>
						<span>Pixl hp</span>
						<strong>{combatOverlay.pixlHealth} / {combatOverlay.maxPixlHealth}</strong>
					</div>
					<div>
						<span>Banked gold</span>
						<strong>{combatOverlay.bankedGold}</strong>
					</div>
					<div>
						<span>Wave gold</span>
						<strong>{combatOverlay.waveGold}</strong>
					</div>
					<div>
						<span>Remaining</span>
						<strong>{combatOverlay.remainingEnemies}</strong>
					</div>
					<div>
						<span>Wave mix</span>
						<strong>
							B {combatOverlay.composition.biters} · S {combatOverlay.composition.swarmers} · T {combatOverlay
								.composition.tankers}
						</strong>
					</div>
				</div>
				<div class="combat-health">
					<div class="combat-health-fill" style:--health-ratio={combatHealthRatio}></div>
				</div>
			</div>

			{#if combatStatusLabel}
				<div class={`status-overlay ${combatStatusTone}`}>
					{combatStatusLabel}
				</div>
			{/if}
		</div>
	</section>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		width: 100%;
		height: 100%;
		background: #020202;
		color: #f5f5f5;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.page {
		width: 100vw;
		height: 100vh;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.canvas-stage {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.overlay-layout {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: grid;
		grid-template-columns: minmax(16rem, 24rem) minmax(0, 1fr) minmax(18rem, 26rem);
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 1rem;
		padding: 1rem;
		pointer-events: none;
	}

	.panel,
	.overlay,
	.meta-pill,
	.toggle {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: 2.15rem;
		padding: 0 0.8rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.96);
		color: #020202;
		text-decoration: none;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.utility-bar,
	.utility-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.utility-bar {
		grid-column: 1 / -1;
		grid-row: 1;
		justify-content: space-between;
		pointer-events: auto;
	}

	.toggle,
	.meta-pill {
		padding: 0.55rem 0.75rem;
	}

	.toggle {
		color: #f5f5f5;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 500;
		line-height: 1;
		cursor: pointer;
	}

	.meta-pill {
		display: grid;
		gap: 0.2rem;
		padding-inline: 0.9rem;
		text-align: left;
	}

	.eyebrow,
	p,
	span,
	strong {
		margin: 0;
	}

	.eyebrow,
	.stats span,
	.combat-grid span {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	.lede,
	.upgrade-header p,
	.upgrade-card p,
	.upgrade-note,
	.upgrade-level {
		color: #c4c4c4;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
	}

	.panel {
		display: grid;
		padding: 0.9rem;
		gap: 0.9rem;
	}

	.panel-heading,
	.upgrade-header {
		display: grid;
		gap: 0.35rem;
	}

	.overlay {
		position: relative;
		max-height: 100%;
		overflow: auto;
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.stats-panel {
		grid-column: 1;
		grid-row: 2 / span 2;
		align-self: start;
		width: 100%;
	}

	.stats-meta {
		margin-bottom: 0.15rem;
	}

	.shop-panel {
		grid-column: 3;
		grid-row: 2 / span 2;
		align-self: start;
		width: 100%;
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

	.upgrade-card {
		padding: 0.85rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.45rem;
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
		min-height: 2rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.purchase:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.combat-panel {
		grid-column: 2;
		grid-row: 3;
		justify-self: center;
		align-self: end;
		width: min(42rem, 100%);
		padding: 0.85rem 1rem;
		display: grid;
		gap: 0.75rem;
	}

	.combat-title {
		font-size: 0.76rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #cfcfcf;
	}

	.combat-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.combat-grid div {
		display: grid;
		gap: 0.25rem;
		align-content: start;
	}

	.combat-grid strong {
		font-size: 0.95rem;
		color: #f5f5f5;
		text-align: left;
	}

	.combat-health {
		height: 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.combat-health-fill {
		height: 100%;
		width: calc(var(--health-ratio) * 100%);
		border-radius: inherit;
		background: #ff3434;
	}

	.status-overlay {
		grid-column: 2;
		grid-row: 2;
		justify-self: center;
		align-self: start;
		margin-top: 0.25rem;
		padding: 0.5rem 0.95rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.78);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		pointer-events: none;
	}

	.status-overlay.danger {
		color: #ff7a7a;
		border-color: rgba(255, 96, 96, 0.35);
	}

	.status-overlay.neutral {
		color: #f5f5f5;
	}

	:global(.canvas-frame) {
		width: 100%;
		height: 100%;
		background: #000000;
	}

	:global(.canvas-frame canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	@media (max-width: 860px) {
		.overlay-layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto auto;
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.utility-bar,
		.utility-actions {
			gap: 0.5rem;
		}

		.utility-bar {
			flex-wrap: wrap;
		}

		.toggle,
		.meta-pill {
			padding: 0.5rem 0.65rem;
		}

		.meta-pill {
			max-width: 14rem;
		}

		.stats-panel,
		.shop-panel,
		.combat-panel {
			grid-column: 1;
			width: 100%;
			max-height: none;
		}

		.stats-panel {
			grid-row: 2;
		}

		.combat-panel {
			grid-row: 3;
			justify-self: stretch;
		}

		.shop-panel {
			grid-row: 4;
		}

		.combat-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.status-overlay {
			grid-column: 1;
			grid-row: 2;
			justify-self: center;
			align-self: start;
			margin-top: 0;
		}
	}
</style>
