<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import ArenaStatsOverlay from '$lib/components/campaigns/ArenaStatsOverlay.svelte';
	import CampaignStageDrawer from '$lib/components/campaigns/CampaignStageDrawer.svelte';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import LevelResultsPopup from '$lib/components/campaigns/LevelResultsPopup.svelte';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import {
		buildCurrentLoadoutRows,
		buildLoadoutTooltip,
		buildOverlayStatCards,
		buildPreviewLoadoutRows,
		buildRewardDropRows,
		buildUnlockedStages,
		createInitialCombatOverlay,
		type CampaignStageSummary,
		type CombatOverlayState,
		type LoadoutRow,
		type RewardDropRow
	} from './arena-helpers';
	import { getCampaignRouteNotificationCounts } from '$lib/game/notifications';
	import { createCampaignSketch, createLoadoutSweepPreviewSketch } from '$lib/p5/campaign-1-sketch';
	import {
		applyUpgradePurchase,
		createBaselineUpgradeablePixlState,
		getXpProgress,
		getUpgradeOptions,
		isUpgradeKey
	} from '$lib/game/upgrades';
	import type {
		LoadoutItemDefinition,
		OwnedWeaponInstance,
		WeaponDefinition
	} from '$lib/data/types';
	import type { PageProps } from './$types';

	type LocalRunMode = 'management' | 'combat';

	type LivePixlState = NonNullable<NonNullable<PageProps['data']['gameState']>['pixlState']>;
	type LiveCampaignState = NonNullable<PageProps['data']['campaignState']>;
	type PixlStateOverride = Pick<
		LivePixlState,
		| 'xp'
		| 'level'
		| 'perkPoints'
		| 'defence'
		| 'agility'
		| 'health'
		| 'attackSpeed'
		| 'loadoutRows'
		| 'loadoutColumns'
		| 'ownedWeapons'
	>;
	type CampaignStateOverride = Pick<
		LiveCampaignState,
		'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
	>;

	interface SketchStateUpdate {
		xp: number;
		level: number;
		perkPoints: number;
		defence: number;
		agility: number;
		health: number;
		attackSpeed: number;
		loadoutRows: number;
		loadoutColumns: number;
		ownedWeapons: LivePixlState['ownedWeapons'];
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		completed: boolean;
	}

	let { data, form }: PageProps = $props();
	let runMode = $state<LocalRunMode>('combat');
	let showStatsOverlay = $state(false);
	let showStageDrawer = $state(false);
	let showLoadoutPreview = $state(true);
	let skipResultsSignal = $state(0);
	let pixlStateOverride = $state.raw<PixlStateOverride | null>(null);
	let campaignStateOverride = $state.raw<CampaignStateOverride | null>(null);
	let livePixlState: LivePixlState | null = $derived.by(() => {
		const basePixlState = data.gameState?.pixlState ?? null;

		if (!basePixlState) {
			return null;
		}

		return {
			...basePixlState,
			...(pixlStateOverride ?? {})
		};
	});
	let liveCampaignState: LiveCampaignState | null = $derived.by(() => {
		const baseCampaignState = data.campaignState ?? null;

		if (!baseCampaignState) {
			return null;
		}

		return {
			...baseCampaignState,
			...(campaignStateOverride ?? {})
		};
	});
	let combatOverlayOverride = $state<CombatOverlayState | null>(null);
	let combatOverlay = $derived(combatOverlayOverride ?? createInitialCombatOverlay(data));
	let upgradeState = $derived(
		livePixlState ?? data.gameState?.pixlState ?? createBaselineUpgradeablePixlState()
	);
	let overlayUpgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let overlayStatCards = $derived(buildOverlayStatCards(upgradeState));
	let weaponDefinitionById = $derived(
		data.weaponDefinitionsById as Record<string, LoadoutItemDefinition>
	);
	let ownedWeapons = $derived(livePixlState?.ownedWeapons ?? []);
	let loadoutPlacements = $derived(livePixlState?.loadoutPlacements ?? []);
	let sketchCampaignLevel = $derived(
		liveCampaignState?.currentLevel ?? data.campaignState?.currentLevel ?? 1
	);
	let highestUnlockedLevel = $derived(
		liveCampaignState?.highestUnlockedLevel ?? data.campaignState?.highestUnlockedLevel ?? 1
	);
	let highestClearedLevel = $derived(
		liveCampaignState?.highestClearedLevel ?? data.campaignState?.highestClearedLevel ?? 0
	);
	let currentStage = $derived(Math.ceil(sketchCampaignLevel / data.campaign.levelsPerStage));
	let unlockedStages = $derived.by(() =>
		buildUnlockedStages(
			data.campaign.stages,
			data.campaign.levelsPerStage,
			highestUnlockedLevel,
			highestClearedLevel,
			currentStage
		)
	);
	let currentLoadoutRows = $derived.by(() =>
		buildCurrentLoadoutRows(ownedWeapons, loadoutPlacements, weaponDefinitionById)
	);
	let previewLoadoutRows = $derived.by(() => buildPreviewLoadoutRows(currentLoadoutRows));
	let loadoutSignature = $derived(
		currentLoadoutRows
			.map((weapon) => `${weapon.weaponInstanceId}:${weapon.x}:${weapon.y}`)
			.join('|')
	);
	let previewPixlState = $derived(livePixlState ?? data.gameState?.pixlState ?? null);
	let sketchRemountKey = $derived(
		`${data.campaignId}:${runMode}:${sketchCampaignLevel}:${loadoutSignature}`
	);
	let loadoutPreviewRemountKey = $derived(
		`${data.campaignId}:${loadoutSignature}:${previewPixlState?.attackSpeed ?? 0}:${upgradeState.loadoutRows}:${upgradeState.loadoutColumns}`
	);
	let currentXpProgress = $derived(getXpProgress(upgradeState));
	let combatHealthRatio = $derived(
		combatOverlay.maxPixlHealth > 0 ? combatOverlay.pixlHealth / combatOverlay.maxPixlHealth : 0
	);
	let combatXpRatio = $derived(
		currentXpProgress.xpNeeded > 0
			? Math.min(1, Math.max(0, currentXpProgress.xpIntoLevel / currentXpProgress.xpNeeded))
			: 0
	);
	let combatXpLabel = $derived(
		`XP ${currentXpProgress.xpIntoLevel} / ${currentXpProgress.xpNeeded} · L${currentXpProgress.nextLevel} next`
	);
	let combatStatusLabel = $derived.by(() => {
		if (combatOverlay.status === 'running' || combatOverlay.status === 'cleared') return null;
		if (combatOverlay.status === 'defeated') return 'PIXL DOWN';
		if (combatOverlay.status === 'complete') return null;
		return null;
	});
	let combatStatusTone = $derived(combatOverlay.status === 'defeated' ? 'danger' : 'neutral');
	let ownedDefinitionIdsBeforeDrops = $derived.by(() => {
		return new Set(ownedWeapons.map((weapon) => weapon.definitionId));
	});
	let rewardDropRows = $derived.by(() =>
		buildRewardDropRows(
			combatOverlay.waveDrops,
			weaponDefinitionById,
			ownedDefinitionIdsBeforeDrops
		)
	);
	let showResultsPopup = $derived(
		combatOverlay.status === 'cleared' || combatOverlay.status === 'complete'
	);
	let resultsCountdownLabel = $derived.by(() => {
		const secondsRemaining = Math.max(0, Math.ceil(combatOverlay.statusTimerRemaining));
		return `Auto-continue in ${secondsRemaining}s`;
	});
	let resultsEmptyLabel = $derived(`No item drops. +${combatOverlay.waveXp} XP earned.`);
	let loadoutTooltip = $derived(buildLoadoutTooltip(currentLoadoutRows));
	let notificationCounts = $derived(
		getCampaignRouteNotificationCounts(livePixlState ?? data.gameState?.pixlState ?? null)
	);

	$effect(() => {
		void data.campaignId;

		pixlStateOverride = null;
		campaignStateOverride = null;
		combatOverlayOverride = null;
		showStatsOverlay = false;
		showStageDrawer = false;
		showLoadoutPreview = true;
		skipResultsSignal = 0;
	});

	$effect(() => {
		if (form?.purchaseError) {
			showStatsOverlay = true;
		}
	});

	function handleSketchStateChange(update: SketchStateUpdate) {
		if (livePixlState) {
			pixlStateOverride = {
				xp: update.xp,
				level: update.level,
				perkPoints: update.perkPoints,
				defence: update.defence,
				agility: update.agility,
				health: update.health,
				attackSpeed: update.attackSpeed,
				loadoutRows: update.loadoutRows,
				loadoutColumns: update.loadoutColumns,
				ownedWeapons: update.ownedWeapons
			};
		}

		if (liveCampaignState) {
			campaignStateOverride = {
				currentLevel: update.currentLevel,
				highestUnlockedLevel: update.highestUnlockedLevel,
				highestClearedLevel: update.highestClearedLevel,
				completed: update.completed
			};
		}

		combatOverlayOverride = {
			...combatOverlay,
			bankedXp: update.xp,
			campaignLevel: update.currentLevel
		};
	}

	function handleCombatStateChange(update: CombatOverlayState) {
		combatOverlayOverride = update;
	}

	const purchaseUpgrade: SubmitFunction = ({ formData }) => {
		const selectedUpgrade = formData.get('upgrade');

		return async ({ result }) => {
			showStatsOverlay = true;

			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (
				result.type === 'success' &&
				typeof selectedUpgrade === 'string' &&
				isUpgradeKey(selectedUpgrade)
			) {
				const nextUpgradeState = applyUpgradePurchase(selectedUpgrade, upgradeState);
				const ownedWeapons =
					livePixlState?.ownedWeapons ?? data.gameState?.pixlState?.ownedWeapons ?? [];

				pixlStateOverride = {
					xp: nextUpgradeState.xp,
					level: nextUpgradeState.level,
					perkPoints: nextUpgradeState.perkPoints,
					defence: nextUpgradeState.defence,
					agility: nextUpgradeState.agility,
					health: nextUpgradeState.health,
					attackSpeed: nextUpgradeState.attackSpeed,
					loadoutRows: nextUpgradeState.loadoutRows,
					loadoutColumns: nextUpgradeState.loadoutColumns,
					ownedWeapons
				};
			}
		};
	};

	const selectStage: SubmitFunction = ({ formData }) => {
		const rawStage = formData.get('stage');
		const stage = typeof rawStage === 'string' ? Number(rawStage) : NaN;

		return async ({ result }) => {
			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (result.type !== 'success' || !Number.isInteger(stage)) {
				showStageDrawer = true;
				return;
			}

			const targetLevel = (stage - 1) * data.campaign.levelsPerStage + 1;
			const baseCampaignState = liveCampaignState ?? data.campaignState;

			showStageDrawer = false;
			showStatsOverlay = false;

			if (!baseCampaignState || targetLevel === sketchCampaignLevel) {
				return;
			}

			campaignStateOverride = {
				currentLevel: targetLevel,
				highestUnlockedLevel: baseCampaignState.highestUnlockedLevel,
				highestClearedLevel: baseCampaignState.highestClearedLevel,
				completed: baseCampaignState.completed
			};
			combatOverlayOverride = null;
		};
	};

	let campaignSketch = $derived.by(() => {
		return (p: import('p5').default) =>
			createCampaignSketch(data.campaign, data.combatProfile, {
				persistPath: '/api/game/state',
				runMode,
				showLoadoutSketch: false,
				pixlState: livePixlState ?? data.gameState?.pixlState ?? null,
				campaignState: liveCampaignState ?? data.campaignState ?? null,
				getSkipResultsSignal: () => skipResultsSignal,
				onCombatStateChange: handleCombatStateChange,
				onStateChange: handleSketchStateChange
			})(p);
	});

	let loadoutSweepPreviewSketch = $derived.by(() => {
		return (p: import('p5').default) =>
			createLoadoutSweepPreviewSketch({
				pixlState: previewPixlState
			})(p);
	});
</script>

<svelte:head>
	<title>Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="page">
	<div class={['arena-shell', runMode === 'combat' && showLoadoutPreview ? 'preview-enabled' : '']}>
		<section class="canvas-stage">
			{#key sketchRemountKey}
				<P5Canvas class="canvas-frame" sketch={campaignSketch} />
			{/key}

			<div class="overlay-layout">
				{#if showStageDrawer}
					<button
						class="drawer-backdrop"
						type="button"
						aria-label="Close campaign menu"
						onclick={() => (showStageDrawer = false)}
					></button>
				{/if}

				<div class="utility-bar">
					{#if runMode === 'combat'}
						<CampaignRouteNav
							campaignId={data.campaignId}
							active="arena"
							{loadoutTooltip}
							showSweeperToggle={true}
							showStatsToggle={true}
							onToggleSweeper={() => {
								showLoadoutPreview = !showLoadoutPreview;
							}}
							sweeperEnabled={showLoadoutPreview}
							onToggleStats={() => {
								showStatsOverlay = !showStatsOverlay;
								if (showStatsOverlay) {
									showStageDrawer = false;
								}
							}}
							statsEnabled={showStatsOverlay}
						/>
						<button
							class="toggle campaign-toggle"
							type="button"
							onclick={() => {
								showStageDrawer = !showStageDrawer;
								if (showStageDrawer) {
									showStatsOverlay = false;
								}
							}}
							aria-pressed={showStageDrawer}
						>
							{showStageDrawer ? 'Close Campaign Menu' : 'Campaign Menu'}
						</button>
					{/if}
				</div>

				{#if showStageDrawer}
					<CampaignStageDrawer
						campaignId={data.campaignId}
						campaignNumber={data.campaign.campaign}
						campaignRoutes={data.campaignRoutes}
						{currentStage}
						currentLevel={sketchCampaignLevel}
						{highestUnlockedLevel}
						{highestClearedLevel}
						levelsPerStage={data.campaign.levelsPerStage}
						{unlockedStages}
						hasCampaignState={Boolean(data.campaignState)}
						stageError={form?.stageError}
						stageSuccess={form?.stageSuccess}
						submit={selectStage}
						onClose={() => (showStageDrawer = false)}
					/>
				{/if}

				{#if runMode === 'combat'}
					{#if showStatsOverlay}
						<ArenaStatsOverlay
							stats={overlayStatCards}
							upgradeOptions={overlayUpgradeOptions}
							signedIn={Boolean(data.gameState)}
							purchaseError={form?.purchaseError}
							submit={purchaseUpgrade}
						/>
					{/if}

					{#if showResultsPopup}
						<LevelResultsPopup
							campaignNumber={data.campaign.campaign}
							stage={combatOverlay.stage}
							stageLevel={combatOverlay.stageLevel}
							{rewardDropRows}
							{resultsEmptyLabel}
							{resultsCountdownLabel}
							onSkip={() => (skipResultsSignal += 1)}
						/>
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
								<span>Banked xp</span>
								<strong>{combatOverlay.bankedXp}</strong>
							</div>
							<div>
								<span>Wave xp</span>
								<strong>{combatOverlay.waveXp}</strong>
							</div>
							<div>
								<span>Wave drops</span>
								<strong>{combatOverlay.waveDrops.length}</strong>
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
						<div class="combat-bars">
							<div class="combat-bar-group">
								<div class="combat-bar-meta">
									<span>Health</span>
									<strong>{combatOverlay.pixlHealth} / {combatOverlay.maxPixlHealth}</strong>
								</div>
								<div class="combat-health">
									<div class="combat-health-fill" style:--health-ratio={combatHealthRatio}></div>
								</div>
							</div>
							<div class="combat-bar-group">
								<div class="combat-bar-meta">
									<span>XP</span>
									<strong>{combatXpLabel}</strong>
								</div>
								<div class="combat-xp">
									<div class="combat-xp-fill" style:--xp-ratio={combatXpRatio}></div>
								</div>
							</div>
						</div>
					</div>

					{#if combatStatusLabel}
						<div class={`status-overlay ${combatStatusTone}`}>
							{combatStatusLabel}
						</div>
					{/if}
				{/if}
			</div>
		</section>

		{#if runMode === 'combat' && showLoadoutPreview}
			<aside class="overlay loadout-preview-panel" aria-label="Loadout sweep preview">
				<div class="loadout-preview-header compact-heading">
					<p class="eyebrow">Loadout sweep</p>
					<p class="upgrade-note">
						Live preview synced to equipped weapons, attack speed, and loadout size.
					</p>
				</div>
				<div class="loadout-preview-meta summary-row">
					<span>Equipped</span>
					<strong>{currentLoadoutRows.length}</strong>
				</div>
				{#if previewLoadoutRows.length > 0}
					<div class="loadout-preview-list" aria-label="Equipped weapons sorted by rarity">
						{#each previewLoadoutRows as weapon (weapon.weaponInstanceId)}
							<div class={`summary-row loadout-preview-row rarity-${weapon.rarity}`}>
								<div class="loadout-preview-copy">
									<strong>{weapon.name}</strong>
									<span>{weapon.rarity}</span>
								</div>
								<span class="loadout-preview-coords">{weapon.x},{weapon.y}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="loadout-preview-empty">No equipped weapons.</p>
				{/if}
				<div class="loadout-preview-canvas-shell">
					{#key loadoutPreviewRemountKey}
						<P5Canvas class="preview-canvas-frame" sketch={loadoutSweepPreviewSketch} />
					{/key}
				</div>
			</aside>
		{/if}
	</div>
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
		flex: 1;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.arena-shell {
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem;
		box-sizing: border-box;
	}

	.arena-shell.preview-enabled {
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
	}

	.canvas-stage {
		position: relative;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-radius: 1.5rem;
	}

	.overlay-layout {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 1rem;
		padding: 1rem;
		pointer-events: none;
	}

	.drawer-backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		background: rgba(0, 0, 0, 0.4);
		pointer-events: auto;
		cursor: pointer;
	}

	.overlay {
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
	.utility-actions,
	.mode-toggle {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.toggle {
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

	.campaign-toggle {
		justify-self: start;
	}

	.utility-bar {
		grid-column: 1 / -1;
		grid-row: 1;
		justify-content: flex-end;
		pointer-events: auto;
	}

	.meta-pill {
		padding: 0.55rem 0.75rem;
	}

	.eyebrow,
	p,
	span,
	strong {
		margin: 0;
	}

	.eyebrow,
	.combat-grid span {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	.upgrade-note,
	.upgrade-level {
		color: #c4c4c4;
	}

	.overlay {
		position: relative;
		max-height: 100%;
		overflow: auto;
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.shop-panel {
		grid-column: 3;
		grid-row: 2 / span 2;
		align-self: start;
		width: 100%;
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
		border-radius: 0;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: -24px 0 60px rgba(0, 0, 0, 0.42);
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

	.campaign-summary-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.drawer-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
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
		background: rgba(255, 255, 255, 0.05);
		color: #f5f5f5;
		text-decoration: none;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.drawer-campaign-link.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}

	.drawer-close {
		min-height: 2rem;
		padding: 0 0.8rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.06);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
	}

	.drawer-back-link {
		min-height: 2rem;
		padding: 0 0.8rem;
		background: rgba(255, 255, 255, 0.06);
		color: #f5f5f5;
	}

	.drawer-stage-card {
		gap: 0.35rem;
	}

	.management-block,
	.stage-detail,
	.summary-section {
		display: grid;
		gap: 0.65rem;
	}

	.compact-heading {
		gap: 0.2rem;
	}

	.stage-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.stage-card,
	.summary-row,
	.stage-detail {
		padding: 0.8rem 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
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

	.summary-list {
		display: grid;
		gap: 0.55rem;
	}

	.snapshot-list {
		gap: 0.45rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.loadout-editor-row,
	.placement-row {
		align-items: center;
	}

	.placement-row {
		flex-wrap: wrap;
	}

	.slim-toggle {
		width: auto;
		min-height: 2rem;
	}

	.slim-toggle {
		padding: 0.35rem 0.6rem;
		font-size: 0.76rem;
	}

	.summary-row.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
	}

	.summary-row.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
	}

	.summary-row.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
	}

	.summary-row.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
	}

	.summary-row.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
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

	.stats-overlay {
		grid-column: 1;
		grid-row: 2;
		justify-self: end;
		align-self: start;
		width: min(22rem, 100%);
		padding: 0.9rem;
		display: grid;
		gap: 0.75rem;
	}

	.stats-overlay-header {
		display: grid;
		gap: 0.2rem;
	}

	.stats-overlay-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.55rem;
	}

	.overlay-upgrade-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.overlay-upgrade-card {
		gap: 0.4rem;
		padding: 0.8rem;
	}

	.combat-panel {
		grid-column: 1;
		grid-row: 3;
		justify-self: center;
		align-self: end;
		width: min(42rem, 100%);
		padding: 0.7rem 0.9rem;
		display: grid;
		gap: 0.55rem;
	}

	.combat-title {
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #cfcfcf;
	}

	.combat-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.55rem 0.7rem;
	}

	.combat-grid div {
		display: grid;
		gap: 0.15rem;
		align-content: start;
	}

	.combat-grid strong {
		font-size: 0.88rem;
		color: #f5f5f5;
		text-align: left;
	}

	.combat-bars {
		display: grid;
		gap: 0.4rem;
	}

	.combat-bar-group {
		display: grid;
		gap: 0.18rem;
	}

	.combat-bar-meta {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		align-items: baseline;
	}

	.combat-bar-meta span {
		font-size: 0.63rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #8abdcf;
	}

	.combat-bar-meta strong {
		font-size: 0.74rem;
		color: #dff8ff;
		text-align: right;
	}

	.combat-health {
		height: 0.32rem;
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

	.combat-xp {
		height: 0.3rem;
		border-radius: 999px;
		background: rgba(93, 210, 255, 0.14);
		overflow: hidden;
	}

	.combat-xp-fill {
		height: 100%;
		width: calc(var(--xp-ratio) * 100%);
		border-radius: inherit;
		background: linear-gradient(90deg, #27d3ff, #6bf0c8);
	}

	.status-overlay {
		grid-column: 1;
		grid-row: 2;
		justify-self: center;
		align-self: start;
		margin-top: 0.25rem;
		padding: 0.5rem 0.95rem;
		border-radius: 999px;
		width: fit-content;
		max-width: min(42rem, 100%);
		cursor: pointer;
		font: inherit;
		color: #f5f5f5;
		text-align: center;
		background: rgba(0, 0, 0, 0.78);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.status-overlay.danger {
		color: #ff7a7a;
	}

	.status-overlay.neutral {
		color: #f5f5f5;
	}

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
	}

	.results-popup-header,
	.results-popup-footer,
	.results-drop-copy {
		display: grid;
		gap: 0.2rem;
	}

	.results-context,
	.results-countdown,
	.results-drop-copy span,
	.results-empty {
		color: #cfcfcf;
	}

	.results-drop-list {
		display: grid;
		gap: 0.6rem;
	}

	.results-drop-row {
		align-items: center;
	}

	.results-drop-copy strong {
		font-size: 1rem;
	}

	.results-drop-copy span,
	.results-tag,
	.results-countdown {
		font-size: 0.82rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.results-tag {
		color: #bfbfbf;
	}

	.results-tag-new {
		color: #c9f8cc;
	}

	.results-popup-footer {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
	}

	.results-skip {
		justify-self: end;
	}

	.loadout-preview-panel {
		align-self: stretch;
		min-width: 0;
		min-height: 0;
		padding: 0.9rem;
		display: grid;
		grid-template-rows: auto auto auto minmax(0, 1fr);
		gap: 0.75rem;
		overflow: hidden;
	}

	.loadout-preview-header {
		display: grid;
		gap: 0.2rem;
	}

	.loadout-preview-meta {
		align-items: center;
	}

	.loadout-preview-list {
		display: grid;
		gap: 0.45rem;
		max-height: 12rem;
		overflow: auto;
	}

	.loadout-preview-row {
		align-items: center;
		padding: 0.55rem 0.7rem;
	}

	.loadout-preview-copy {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}

	.loadout-preview-copy strong {
		font-size: 0.88rem;
	}

	.loadout-preview-copy span,
	.loadout-preview-coords,
	.loadout-preview-empty {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #cfcfcf;
	}

	.loadout-preview-coords {
		white-space: nowrap;
	}

	.loadout-preview-empty {
		padding: 0 0.1rem;
	}

	.loadout-preview-canvas-shell {
		min-width: 0;
		min-height: 0;
		height: 100%;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
		overflow: hidden;
		pointer-events: none;
	}

	.placement-row.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}

	.grid-placement-panel,
	.weapon-shape-preview {
		gap: 0.65rem;
	}

	.shape-grid,
	.loadout-grid {
		display: grid;
		gap: 0.3rem;
	}

	.shape-grid {
		width: fit-content;
	}

	.shape-cell,
	.grid-cell {
		aspect-ratio: 1;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
	}

	.shape-cell.filled {
		background: rgba(103, 217, 111, 0.18);
		border-color: rgba(103, 217, 111, 0.42);
	}

	.loadout-grid-wrapper {
		overflow-x: auto;
	}

	.loadout-grid {
		min-width: 100%;
	}

	.grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		color: #f5f5f5;
	}

	.grid-cell.occupied {
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.grid-cell.empty {
		opacity: 0.45;
	}

	.grid-anchor {
		width: 100%;
		min-height: 2.25rem;
		padding: 0;
		cursor: pointer;
		background: rgba(103, 217, 111, 0.12);
		border-color: rgba(103, 217, 111, 0.42);
		font: inherit;
		color: #c9f8cc;
	}

	.compact-stats {
		gap: 0.55rem;
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

	:global(.preview-canvas-frame) {
		width: 100%;
		height: 100%;
		background: transparent;
	}

	:global(.preview-canvas-frame canvas) {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	@media (max-width: 860px) {
		.arena-shell,
		.overlay-layout {
			grid-template-columns: 1fr;
		}

		.arena-shell,
		.arena-shell.preview-enabled {
			grid-template-columns: 1fr;
			grid-template-rows: minmax(0, 1fr) auto;
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.overlay-layout {
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
		.stats-overlay,
		.combat-panel,
		.loadout-preview-panel {
			grid-column: 1;
			width: 100%;
			max-height: none;
		}

		.stats-panel,
		.stats-overlay {
			grid-row: 2;
			justify-self: stretch;
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

		.stats-overlay-grid,
		.overlay-upgrade-grid {
			grid-template-columns: 1fr;
		}

		.stage-grid {
			grid-template-columns: 1fr;
		}

		.status-overlay {
			grid-column: 1;
			grid-row: 2;
			justify-self: center;
			align-self: start;
			margin-top: 0;
		}

		.results-popup {
			width: min(100%, 28rem);
		}

		.campaign-drawer {
			width: min(100vw, 26rem);
			padding: 0.85rem;
		}

		.campaign-summary-grid {
			grid-template-columns: 1fr;
		}

		.loadout-preview-panel {
			min-height: 18rem;
		}
	}
</style>
