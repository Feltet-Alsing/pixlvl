<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { getCampaignRouteNotificationCounts } from '$lib/game/notifications';
	import { createCampaignSketch, createLoadoutSweepPreviewSketch } from '$lib/p5/campaign-1-sketch';
	import {
		applyUpgradePurchase,
		createBaselineUpgradeablePixlState,
		getUpgradeOptions,
		isUpgradeKey
	} from '$lib/game/upgrades';
	import type { OwnedWeaponInstance, WeaponDefinition } from '$lib/data/types';
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

	interface CombatOverlayState {
		stage: number;
		stageLevel: number;
		campaignLevel: number;
		pixlHealth: number;
		maxPixlHealth: number;
		bankedXp: number;
		waveXp: number;
		waveDrops: OwnedWeaponInstance[];
		statusTimerRemaining: number;
		remainingEnemies: number;
		composition: {
			biters: number;
			swarmers: number;
			tankers: number;
		};
		status: 'running' | 'cleared' | 'defeated' | 'complete';
	}

	interface RewardDropRow {
		instanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		isNew: boolean;
	}

	interface LoadoutRow {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		x: number;
		y: number;
	}

	interface CampaignStageSummary {
		stage: number;
		startLevel: number;
		endLevel: number;
		unlockedLevelCount: number;
		isCurrentStage: boolean;
		isCleared: boolean;
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
			bankedXp: pageData.gameState?.pixlState.xp ?? 0,
			waveXp: 0,
			waveDrops: [],
			statusTimerRemaining: 0,
			remainingEnemies: composition.biters + composition.swarmers + composition.tankers,
			composition,
			status: 'running'
		};
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
	let weaponDefinitionById = $derived(
		data.weaponDefinitionsById as Record<string, WeaponDefinition>
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
					isCurrentStage: currentStage === stage,
					isCleared: highestClearedLevel >= endLevel
				} satisfies CampaignStageSummary;
			})
			.filter((stage) => stage.unlockedLevelCount > 0);
	});
	let currentLoadoutRows = $derived.by(() => {
		const ownedWeaponById = Object.fromEntries(
			ownedWeapons.map((weapon) => [weapon.instanceId, weapon])
		) as Record<string, (typeof ownedWeapons)[number]>;

		return loadoutPlacements
			.map((placement) => {
				const ownedWeapon = ownedWeaponById[placement.weaponInstanceId];
				const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

				if (!ownedWeapon || !definition) {
					return null;
				}

				return {
					weaponInstanceId: placement.weaponInstanceId,
					definitionId: definition.id,
					name: definition.name,
					rarity: definition.rarity,
					x: placement.x,
					y: placement.y
				} satisfies LoadoutRow;
			})
			.filter((entry): entry is LoadoutRow => entry !== null)
			.sort(
				(left, right) => left.y - right.y || left.x - right.x || left.name.localeCompare(right.name)
			);
	});
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
	let combatHealthRatio = $derived(
		combatOverlay.maxPixlHealth > 0 ? combatOverlay.pixlHealth / combatOverlay.maxPixlHealth : 0
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
	let rewardDropRows = $derived.by(() => {
		return combatOverlay.waveDrops
			.map((weapon) => {
				const definition = weaponDefinitionById[weapon.definitionId];

				if (!definition) {
					return null;
				}

				return {
					instanceId: weapon.instanceId,
					definitionId: definition.id,
					name: definition.name,
					rarity: definition.rarity,
					isNew: !ownedDefinitionIdsBeforeDrops.has(definition.id)
				} satisfies RewardDropRow;
			})
			.filter((entry): entry is RewardDropRow => entry !== null);
	});
	let showResultsPopup = $derived(
		combatOverlay.status === 'cleared' || combatOverlay.status === 'complete'
	);
	let resultsCountdownLabel = $derived.by(() => {
		const secondsRemaining = Math.max(0, Math.ceil(combatOverlay.statusTimerRemaining));
		return `Auto-continue in ${secondsRemaining}s`;
	});
	let resultsEmptyLabel = $derived(`No weapon drops. +${combatOverlay.waveXp} XP earned.`);
	let loadoutTooltip = $derived(
		currentLoadoutRows.map((weapon) => `${weapon.name} (${weapon.x}, ${weapon.y})`).join('\n') ||
			'No equipped weapons'
	);
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
		if (form?.purchaseError || form?.purchaseSuccess) {
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
						{showStageDrawer ? 'Close campaign' : 'Campaign menu'}
					</button>
					<div class="utility-actions">
						{#if runMode === 'combat'}
							<button
								class="toggle slim-toggle"
								type="button"
								onclick={() => {
									showLoadoutPreview = !showLoadoutPreview;
								}}
								aria-pressed={showLoadoutPreview}
							>
								{showLoadoutPreview ? 'Hide Loadout Sweep' : 'Show Loadout Sweep'}
							</button>
							<button
								class="toggle slim-toggle"
								type="button"
								onclick={() => {
									showStatsOverlay = !showStatsOverlay;
									if (showStatsOverlay) {
										showStageDrawer = false;
									}
								}}
								aria-pressed={showStatsOverlay}
							>
								{showStatsOverlay ? 'Hide stats' : 'Show stats'}
							</button>
						{/if}
						<CampaignRouteNav
							campaignId={data.campaignId}
							active="arena"
							{loadoutTooltip}
							{notificationCounts}
						/>
					</div>
				</div>

				{#if showStageDrawer}
					<aside class="overlay campaign-drawer" aria-label="Campaign menu">
						<div class="campaign-drawer-header">
							<div class="compact-heading">
								<p class="eyebrow">Campaign {data.campaign.campaign}</p>
								<p class="upgrade-note">Jump between unlocked stages without leaving the arena.</p>
							</div>
							<a class="back drawer-back-link" href={resolve('/campaigns')}>All campaigns</a>
							<button
								class="drawer-close"
								type="button"
								aria-label="Close campaign menu"
								onclick={() => (showStageDrawer = false)}
							>
								Close
							</button>
						</div>

						<div class="campaign-summary-grid">
							<div class="summary-row">
								<span>Current stage</span>
								<strong>{currentStage}</strong>
							</div>
							<div class="summary-row">
								<span>Current level</span>
								<strong>{sketchCampaignLevel}</strong>
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

						{#if form?.stageError}
							<p class="feedback error">{form.stageError}</p>
						{:else if form?.stageSuccess}
							<p class="feedback success">{form.stageSuccess}</p>
						{/if}

						{#if data.campaignState}
							<div class="campaign-stage-list">
								{#each unlockedStages as stage (stage.stage)}
									<form method="post" action="?/selectStage" use:enhance={selectStage}>
										<input type="hidden" name="stage" value={stage.stage} />
										<button
											class:active={stage.isCurrentStage}
											class="stage-card drawer-stage-card"
											type="submit"
										>
											<span>Stage {stage.stage}</span>
											<strong
												>{stage.unlockedLevelCount} / {data.campaign.levelsPerStage} levels</strong
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
							<p class="feedback">Sign in to persist stage progression.</p>
						{/if}
					</aside>
				{/if}

				{#if runMode === 'combat'}
					{#if showStatsOverlay}
						<div class="overlay stats-overlay">
							<div class="stats-overlay-header compact-heading">
								<p class="eyebrow">Arena stats</p>
								<p class="upgrade-note">Spend perk points without leaving the arena.</p>
							</div>

							{#if form?.purchaseError}
								<p class="feedback error">{form.purchaseError}</p>
							{:else if form?.purchaseSuccess}
								<p class="feedback success">{form.purchaseSuccess}</p>
							{/if}

							<div class="stats-overlay-grid compact-stats">
								<div class="summary-row">
									<span>Level</span>
									<strong>{upgradeState.level}</strong>
								</div>
								<div class="summary-row">
									<span>Perk points</span>
									<strong>{upgradeState.perkPoints}</strong>
								</div>
								<div class="summary-row">
									<span>XP</span>
									<strong>{upgradeState.xp}</strong>
								</div>
								<div class="summary-row">
									<span>Health</span>
									<strong>{upgradeState.health}</strong>
								</div>
								<div class="summary-row">
									<span>Attack speed</span>
									<strong>{upgradeState.attackSpeed.toFixed(1)}/s</strong>
								</div>
								<div class="summary-row">
									<span>Loadout size</span>
									<strong>{upgradeState.loadoutRows} x {upgradeState.loadoutColumns}</strong>
								</div>
							</div>

							<div class="upgrade-grid overlay-upgrade-grid">
								{#if data.gameState}
									{#each overlayUpgradeOptions as option (option.key)}
										<form
											class="upgrade-card overlay-upgrade-card"
											method="post"
											action="?/purchaseUpgrade"
											use:enhance={purchaseUpgrade}
										>
											<input type="hidden" name="upgrade" value={option.key} />
											<div class="upgrade-head">
												<span>{option.label}</span>
												<strong>Rank {option.level}</strong>
											</div>
											<p>{option.description}</p>
											<small>Allocated {option.level} point{option.level === 1 ? '' : 's'}</small>
											<button class="purchase" type="submit" disabled={!option.canSpend}>
												{option.canSpend ? 'Spend perk point' : 'No perk points'}
											</button>
										</form>
									{/each}
								{:else}
									<p class="feedback">Sign in to save stats and assign perk points.</p>
								{/if}
							</div>
						</div>
					{/if}

					{#if showResultsPopup}
						<div class="overlay results-popup" aria-live="polite">
							<div class="results-popup-header compact-heading">
								<p class="eyebrow">Level rewards</p>
								<p class="results-context">
									Campaign {data.campaign.campaign} · Stage {combatOverlay.stage} · Level {combatOverlay.stageLevel}
								</p>
							</div>

							{#if rewardDropRows.length > 0}
								<div class="results-drop-list">
									{#each rewardDropRows as drop (drop.instanceId)}
										<div class={`summary-row results-drop-row rarity-${drop.rarity}`}>
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
								<button
									class="toggle results-skip"
									type="button"
									onclick={() => (skipResultsSignal += 1)}
								>
									Skip
								</button>
							</div>
						</div>
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
						<div class="combat-health">
							<div class="combat-health-fill" style:--health-ratio={combatHealthRatio}></div>
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
					<p class="upgrade-note">Live preview synced to equipped weapons, attack speed, and loadout size.</p>
				</div>
				<div class="loadout-preview-meta summary-row">
					<span>Equipped</span>
					<strong>{currentLoadoutRows.length}</strong>
				</div>
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
		width: 100vw;
		height: 100vh;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.arena-shell {
		width: 100%;
		height: 100%;
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
		justify-content: space-between;
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
		left: 0;
		bottom: 0;
		z-index: 5;
		width: min(24rem, 100vw);
		padding: 1rem;
		display: grid;
		align-content: start;
		gap: 0.85rem;
		border-radius: 0;
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 24px 0 60px rgba(0, 0, 0, 0.42);
	}

	.campaign-drawer-header,
	.campaign-summary-grid,
	.campaign-stage-list {
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
		grid-template-columns: repeat(6, minmax(0, 1fr));
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
		grid-template-rows: auto auto minmax(0, 1fr);
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
