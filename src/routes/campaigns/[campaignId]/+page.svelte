<script lang="ts">
	import { resolve } from '$app/paths';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import { createBaselineUpgradeablePixlState, getUpgradeOptions } from '$lib/game/upgrades';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { createCampaignSketch } from '$lib/p5/campaign-1-sketch';
	import type { WeaponDefinition } from '$lib/data/types';
	import type { PageProps } from './$types';

	type LocalRunMode = 'management' | 'combat';
	const LOADOUT_ROW_COUNT = 5;
	const LOADOUT_COLUMN_COUNT = 8;

	type LivePixlState = NonNullable<NonNullable<PageProps['data']['gameState']>['pixlState']>;
	type LiveCampaignState = NonNullable<PageProps['data']['campaignState']>;
	type PixlStateOverride = Pick<LivePixlState, 'gold' | 'ownedWeapons'>;
	type CampaignStateOverride = Pick<
		LiveCampaignState,
		'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
	>;

	interface SketchStateUpdate {
		gold: number;
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
		bankedGold: number;
		waveGold: number;
		waveDrops: number;
		remainingEnemies: number;
		composition: {
			biters: number;
			swarmers: number;
			tankers: number;
		};
		status: 'running' | 'cleared' | 'defeated' | 'complete';
	}

	interface ManagementStageSummary {
		stage: number;
		startLevel: number;
		endLevel: number;
		unlockedLevelCount: number;
		isCurrentStage: boolean;
		isCleared: boolean;
	}

	interface LoadoutRow {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		x: number;
		y: number;
	}

	interface OwnedWeaponSummaryRow {
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		count: number;
		equippedCount: number;
	}

	interface UnequippedOwnedWeaponRow {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
	}

	interface LoadoutGridCell {
		x: number;
		y: number;
		occupiedByName: string | null;
		occupiedRarity: WeaponDefinition['rarity'] | null;
		canPlaceSelectedWeapon: boolean;
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
			waveDrops: 0,
			remainingEnemies: composition.biters + composition.swarmers + composition.tankers,
			composition,
			status: 'running'
		};
	}

	let { data, form }: PageProps = $props();
	let runMode = $state<LocalRunMode>('combat');
	let showStats = $state(true);
	let showShop = $state(true);
	let pixlStateOverride = $state.raw<PixlStateOverride | null>(null);
	let campaignStateOverride = $state.raw<CampaignStateOverride | null>(null);
	let selectedPlacementWeaponInstanceId = $state<string | null>(null);
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
	let selectedManagementStage = $state<number | null>(null);
	let combatOverlayOverride = $state<CombatOverlayState | null>(null);
	let combatOverlay = $derived(combatOverlayOverride ?? createInitialCombatOverlay(data));
	let upgradeState = $derived(livePixlState ?? createBaselineUpgradeablePixlState());
	let upgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let highestUnlockedLevel = $derived(liveCampaignState?.highestUnlockedLevel ?? 1);
	let highestClearedLevel = $derived(liveCampaignState?.highestClearedLevel ?? 0);
	let weaponDefinitionById = $derived(
		Object.fromEntries(
			data.weaponPool.map((weapon) => [weapon.id, weapon] satisfies [string, WeaponDefinition])
		) as Record<string, WeaponDefinition>
	);
	let ownedWeapons = $derived(livePixlState?.ownedWeapons ?? []);
	let loadoutPlacements = $derived(livePixlState?.loadoutPlacements ?? []);
	let sketchCampaignLevel = $derived(
		liveCampaignState?.currentLevel ?? data.campaignState?.currentLevel ?? 1
	);
	let equippedWeaponInstanceIds = $derived(
		Object.fromEntries(
			loadoutPlacements.map((placement) => [placement.weaponInstanceId, true])
		) as Record<string, true>
	);
	let activeManagementStage = $derived(selectedManagementStage ?? combatOverlay.stage);
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
					isCurrentStage: combatOverlay.stage === stage,
					isCleared: highestClearedLevel >= endLevel
				} satisfies ManagementStageSummary;
			})
			.filter((stage) => stage.unlockedLevelCount > 0);
	});
	let selectedStageSummary = $derived(
		unlockedStages.find((stage) => stage.stage === activeManagementStage) ??
			unlockedStages[0] ??
			null
	);
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
	let ownedWeaponSummaryRows = $derived.by(() => {
		const equippedCounts: Record<string, number> = {};

		for (const placement of loadoutPlacements) {
			equippedCounts[placement.weaponInstanceId] =
				(equippedCounts[placement.weaponInstanceId] ?? 0) + 1;
		}

		const grouped: Record<string, OwnedWeaponSummaryRow> = {};

		for (const weapon of ownedWeapons) {
			const definition = weaponDefinitionById[weapon.definitionId];

			if (!definition) {
				continue;
			}

			const current = grouped[definition.id];
			const equippedCount = equippedCounts[weapon.instanceId] ? 1 : 0;

			if (!current) {
				grouped[definition.id] = {
					definitionId: definition.id,
					name: definition.name,
					rarity: definition.rarity,
					count: 1,
					equippedCount
				};
				continue;
			}

			current.count += 1;
			current.equippedCount += equippedCount;
		}

		return Object.values(grouped).sort(
			(left, right) =>
				right.equippedCount - left.equippedCount ||
				right.count - left.count ||
				left.name.localeCompare(right.name)
		);
	});
	let unequippedOwnedWeaponRows = $derived.by(() => {
		return ownedWeapons
			.map((weapon) => {
				if (equippedWeaponInstanceIds[weapon.instanceId]) {
					return null;
				}

				const definition = weaponDefinitionById[weapon.definitionId];

				if (!definition) {
					return null;
				}

				return {
					weaponInstanceId: weapon.instanceId,
					definitionId: definition.id,
					name: definition.name,
					rarity: definition.rarity
				} satisfies UnequippedOwnedWeaponRow;
			})
			.filter((entry): entry is UnequippedOwnedWeaponRow => entry !== null)
			.sort(
				(left, right) =>
					left.name.localeCompare(right.name) ||
					left.weaponInstanceId.localeCompare(right.weaponInstanceId)
			);
	});
	let selectedPlacementWeapon = $derived(
		unequippedOwnedWeaponRows.find(
			(weapon) => weapon.weaponInstanceId === selectedPlacementWeaponInstanceId
		) ?? null
	);
	let selectedPlacementDefinition = $derived(
		selectedPlacementWeapon ? weaponDefinitionById[selectedPlacementWeapon.definitionId] : null
	);
	let occupiedLoadoutCells = $derived.by(() => {
		const occupied: Record<
			string,
			{ occupiedByName: string; occupiedRarity: WeaponDefinition['rarity'] }
		> = {};

		for (const weapon of currentLoadoutRows) {
			const definition = weaponDefinitionById[weapon.definitionId];

			if (!definition) {
				continue;
			}

			for (const [cellX, cellY] of definition.shape.cells) {
				occupied[`${weapon.x + cellX}:${weapon.y + cellY}`] = {
					occupiedByName: weapon.name,
					occupiedRarity: weapon.rarity
				};
			}
		}

		return occupied;
	});
	let loadoutGridRows = $derived.by(() => {
		const selectedDefinition = selectedPlacementDefinition;

		return Array.from({ length: LOADOUT_ROW_COUNT }, (_, y) => {
			return Array.from({ length: LOADOUT_COLUMN_COUNT }, (_, x) => {
				const occupiedCell = occupiedLoadoutCells[`${x}:${y}`];
				const canPlaceSelectedWeapon =
					!occupiedCell && selectedDefinition
						? selectedDefinition.shape.cells.every(([cellX, cellY]) => {
								const gridX = x + cellX;
								const gridY = y + cellY;

								return (
									gridX >= 0 &&
									gridX < LOADOUT_COLUMN_COUNT &&
									gridY >= 0 &&
									gridY < LOADOUT_ROW_COUNT &&
									!occupiedLoadoutCells[`${gridX}:${gridY}`]
								);
							})
						: false;

				return {
					x,
					y,
					occupiedByName: occupiedCell?.occupiedByName ?? null,
					occupiedRarity: occupiedCell?.occupiedRarity ?? null,
					canPlaceSelectedWeapon
				} satisfies LoadoutGridCell;
			});
		});
	});
	let loadoutSignature = $derived(
		currentLoadoutRows
			.map((weapon) => `${weapon.weaponInstanceId}:${weapon.x}:${weapon.y}`)
			.join('|')
	);
	let sketchRemountKey = $derived(
		`${data.campaignId}:${runMode}:${sketchCampaignLevel}:${loadoutSignature}`
	);
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
	let loadoutTooltip = $derived(
		currentLoadoutRows.map((weapon) => `${weapon.name} (${weapon.x}, ${weapon.y})`).join('\n') ||
			'No equipped weapons'
	);

	$effect(() => {
		data.campaignId;
		data.gameState?.pixlState;
		data.campaignState;

		pixlStateOverride = null;
		campaignStateOverride = null;
		combatOverlayOverride = null;
		selectedManagementStage = null;
		selectedPlacementWeaponInstanceId = null;
	});

	function handleSketchStateChange(update: SketchStateUpdate) {
		if (livePixlState) {
			pixlStateOverride = {
				gold: update.gold,
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
			bankedGold: update.gold,
			campaignLevel: update.currentLevel
		};
	}

	function handleCombatStateChange(update: CombatOverlayState) {
		combatOverlayOverride = update;
	}

	let campaignSketch = $derived.by(() => {
		return (p: import('p5').default) =>
			createCampaignSketch(data.campaign, data.combatProfile, {
				persistPath: '/api/game/state',
				runMode,
				pixlState: livePixlState ?? data.gameState?.pixlState ?? null,
				campaignState: liveCampaignState ?? data.campaignState ?? null,
				onCombatStateChange: handleCombatStateChange,
				onStateChange: handleSketchStateChange
			})(p);
	});
</script>

<svelte:head>
	<title>Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="page">
	<section class="canvas-stage">
		{#key sketchRemountKey}
			<P5Canvas class="canvas-frame" sketch={campaignSketch} />
		{/key}

		<div class="overlay-layout">
			<div class="utility-bar">
				<a class="back" href={resolve('/campaigns')}>All campaigns</a>
				<div class="utility-actions">
					<CampaignRouteNav campaignId={data.campaignId} active="arena" {loadoutTooltip} />
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
						<h2>Command deck</h2>
						<p class="lede">
							Move management, stats, and loadout to dedicated routes while the arena stays
							readable.
						</p>
					</div>

					<div class="route-card-grid">
						<a class="route-card" href={resolve(`/campaigns/${data.campaignId}/management`)}>
							<span>Management</span>
							<strong>Stage {combatOverlay.stage}</strong>
							<p>Pick replay targets and review campaign progression.</p>
						</a>
						<a class="route-card" href={resolve(`/campaigns/${data.campaignId}/stats`)}>
							<span>Stats</span>
							<strong>{livePixlState?.gold ?? 0} gold banked</strong>
							<p>Health, damage, attack speed, and upgrades without combat clutter.</p>
						</a>
						<a
							class="route-card"
							href={resolve(`/campaigns/${data.campaignId}/loadout`)}
							title={loadoutTooltip}
						>
							<span>Loadout</span>
							<strong>{currentLoadoutRows.length} equipped · {ownedWeapons.length} owned</strong>
							<p>Hover this route for equipped weapons, or open the full placement grid.</p>
						</a>
					</div>

					<div class="stats">
						<div>
							<span>Health</span>
							<strong>{livePixlState?.health ?? data.combatProfile.pixl.health}</strong>
						</div>
						<div>
							<span>Damage</span>
							<strong>{livePixlState?.damage ?? data.combatProfile.pixl.damage}</strong>
						</div>
						<div>
							<span>Attack speed</span>
							<strong
								>{(livePixlState?.attackSpeed ?? data.combatProfile.pixl.attackSpeed).toFixed(
									1
								)}/s</strong
							>
						</div>
					</div>
				</aside>
			{/if}

			{#if showShop}
				<aside class="overlay panel shop-panel">
					<div class="panel-heading compact-heading">
						<h2>Loadout snapshot</h2>
						<p class="lede">Arena stays compact while loadout details move to their own route.</p>
					</div>

					<div class="summary-section">
						<p class="eyebrow">Equipped now</p>
						{#if currentLoadoutRows.length > 0}
							<div class="summary-list snapshot-list">
								{#each currentLoadoutRows.slice(0, 3) as weapon (weapon.weaponInstanceId)}
									<div
										class={`summary-row rarity-${weapon.rarity}`}
										title={`${weapon.name} at ${weapon.x}, ${weapon.y}`}
									>
										<span>{weapon.name}</span>
										<strong>({weapon.x}, {weapon.y})</strong>
									</div>
								{/each}
							</div>
							{#if currentLoadoutRows.length > 3}
								<p class="upgrade-note">
									+{currentLoadoutRows.length - 3} more equipped on the loadout route.
								</p>
							{/if}
						{:else}
							<p class="upgrade-note">No equipped weapons yet.</p>
						{/if}
					</div>

					<div class="stats compact-stats">
						<div>
							<span>Owned weapons</span>
							<strong>{ownedWeapons.length}</strong>
						</div>
						<div>
							<span>Unlocked level</span>
							<strong>{highestUnlockedLevel}</strong>
						</div>
						<div>
							<span>Cleared level</span>
							<strong>{highestClearedLevel}</strong>
						</div>
					</div>

					<div class="route-card-grid side-route-grid">
						<a
							class="route-card"
							href={resolve(`/campaigns/${data.campaignId}/loadout`)}
							title={loadoutTooltip}
						>
							<span>Open loadout</span>
							<strong>Hover for equipped</strong>
							<p>Inspect placements and inventory in a dedicated editor.</p>
						</a>
						<a class="route-card" href={resolve(`/campaigns/${data.campaignId}/stats`)}>
							<span>Open stats</span>
							<strong>Upgrade between waves</strong>
							<p>Persistent perks no longer compete with live combat telemetry.</p>
						</a>
					</div>
				</aside>
			{/if}

			{#if runMode === 'combat'}
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
							<span>Wave drops</span>
							<strong>{combatOverlay.waveDrops}</strong>
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
	.utility-actions,
	.mode-toggle {
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

	.panel-heading {
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

	.route-card-grid {
		display: grid;
		gap: 0.65rem;
	}

	.side-route-grid {
		grid-template-columns: 1fr;
	}

	.route-card {
		padding: 0.85rem 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.3rem;
		text-decoration: none;
		color: #f5f5f5;
	}

	.route-card p {
		color: #c4c4c4;
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

	.toggle.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
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
		border-color: rgba(179, 132, 62, 0.28);
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
		grid-column: 2;
		grid-row: 2;
		justify-self: center;
		align-self: start;
		margin-top: 0.25rem;
		padding: 0.5rem 0.95rem;
		border-radius: 999px;
		width: 100%;
		cursor: pointer;
		font: inherit;
		color: #f5f5f5;
		text-align: left;
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

	.grid-anchor span {
		font-size: 1.1rem;
		line-height: 1;
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
	}
</style>
