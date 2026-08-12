<script lang="ts">
	import { resolve } from '$app/paths';
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
	type PixlStateOverride = Pick<LivePixlState, 'gold'>;
	type CampaignStateOverride = Pick<
		LiveCampaignState,
		'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
	>;

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
			remainingEnemies: composition.biters + composition.swarmers + composition.tankers,
			composition,
			status: 'running'
		};
	}

	let { data, form }: PageProps = $props();
	let runMode = $state<LocalRunMode>('management');
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
				gold: update.gold
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
					<div class="mode-toggle" role="group" aria-label="Run mode">
						<button
							class:active={runMode === 'management'}
							class="toggle"
							type="button"
							aria-pressed={runMode === 'management'}
							onclick={() => (runMode = 'management')}
						>
							Management
						</button>
						<button
							class:active={runMode === 'combat'}
							class="toggle"
							type="button"
							aria-pressed={runMode === 'combat'}
							onclick={() => (runMode = 'combat')}
						>
							Combat
						</button>
					</div>
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

					{#if runMode === 'management'}
						<div class="management-block stage-block">
							<div class="panel-heading compact-heading">
								<h2>Stage selection</h2>
								<p class="lede">Pick any unlocked stage between runs.</p>
							</div>

							{#if form?.stageError}
								<p class="feedback error">{form.stageError}</p>
							{:else if form?.stageSuccess}
								<p class="feedback success">{form.stageSuccess}</p>
							{/if}

							{#if liveCampaignState}
								<div class="stage-grid">
									{#each unlockedStages as stage (stage.stage)}
										<form method="post" action="?/selectStage">
											<input type="hidden" name="stage" value={stage.stage} />
											<button
												class:active={activeManagementStage === stage.stage}
												class="stage-card"
												type="submit"
												onclick={() => (selectedManagementStage = stage.stage)}
											>
												<span>Stage {stage.stage}</span>
												<strong
													>{stage.unlockedLevelCount} / {data.campaign.levelsPerStage} levels</strong
												>
											</button>
										</form>
									{/each}
								</div>

								{#if selectedStageSummary}
									<div class="stage-detail">
										<p class="eyebrow">Selected stage</p>
										<strong>Stage {selectedStageSummary.stage}</strong>
										<p>
											Levels {selectedStageSummary.startLevel}-{selectedStageSummary.endLevel} ·
											{selectedStageSummary.isCurrentStage ? 'current' : 'available'}
											{selectedStageSummary.isCleared ? ' · cleared' : ''}
										</p>
									</div>
								{/if}
							{:else}
								<p class="upgrade-note">Sign in to save progress and choose unlocked stages.</p>
							{/if}
						</div>
					{/if}
				</aside>
			{/if}

			{#if showShop && runMode === 'management'}
				<aside class="overlay panel shop-panel">
					<div class="management-block loadout-block">
						<div class="panel-heading compact-heading">
							<h2>Loadout editor</h2>
							<p class="lede">Place or remove weapons between runs.</p>
						</div>

						{#if form?.loadoutError}
							<p class="feedback error">{form.loadoutError}</p>
						{:else if form?.loadoutSuccess}
							<p class="feedback success">{form.loadoutSuccess}</p>
						{/if}

						<div class="summary-section">
							<p class="eyebrow">Current loadout</p>
							{#if currentLoadoutRows.length > 0}
								<div class="summary-list">
									{#each currentLoadoutRows as weapon (weapon.weaponInstanceId)}
										<form
											class={`summary-row loadout-editor-row rarity-${weapon.rarity}`}
											method="post"
											action="?/removeLoadoutPlacement"
										>
											<input
												type="hidden"
												name="weaponInstanceId"
												value={weapon.weaponInstanceId}
											/>
											<span>{weapon.name}</span>
											<strong>({weapon.x}, {weapon.y})</strong>
											<button class="toggle slim-toggle" type="submit">Remove</button>
										</form>
									{/each}
								</div>
							{:else}
								<p class="upgrade-note">No equipped weapons yet.</p>
							{/if}
						</div>

						<div class="summary-section">
							<p class="eyebrow">Unequipped owned weapons</p>
							{#if unequippedOwnedWeaponRows.length > 0}
								<div class="summary-list">
									{#each unequippedOwnedWeaponRows as weapon (weapon.weaponInstanceId)}
										<button
											class:active={selectedPlacementWeaponInstanceId === weapon.weaponInstanceId}
											class={`summary-row placement-row rarity-${weapon.rarity}`}
											type="button"
											onclick={() => (selectedPlacementWeaponInstanceId = weapon.weaponInstanceId)}
										>
											<span>{weapon.name}</span>
											<strong>{weapon.weaponInstanceId.slice(-6)}</strong>
										</button>
									{/each}
								</div>

								<div class="grid-placement-panel">
									<div class="panel-heading compact-heading">
										<h2>Placement grid</h2>
										<p class="lede">
											{#if selectedPlacementDefinition && selectedPlacementWeapon}
												Place {selectedPlacementWeapon.name} on a highlighted anchor.
											{:else}
												Select an unequipped weapon to show valid anchors.
											{/if}
										</p>
									</div>

									{#if selectedPlacementDefinition}
										<div class="weapon-shape-preview">
											<div
												class="shape-grid"
												style:grid-template-columns={`repeat(${selectedPlacementDefinition.shape.width}, 1fr)`}
											>
												{#each Array.from( { length: selectedPlacementDefinition.shape.height } ) as _, shapeY (shapeY)}
													{#each Array.from( { length: selectedPlacementDefinition.shape.width } ) as _, shapeX (shapeX)}
														<div
															class:filled={selectedPlacementDefinition.shape.cells.some(
																([cellX, cellY]) => cellX === shapeX && cellY === shapeY
															)}
															class="shape-cell"
														></div>
													{/each}
												{/each}
											</div>
											<p class="upgrade-note">{selectedPlacementDefinition.role}</p>
										</div>
									{/if}

									<div class="loadout-grid-wrapper">
										<div
											class="loadout-grid"
											style:grid-template-columns={`repeat(${LOADOUT_COLUMN_COUNT}, minmax(0, 1fr))`}
										>
											{#each loadoutGridRows as row, rowIndex (rowIndex)}
												{#each row as cell (`${rowIndex}:${cell.x}:${cell.y}`)}
													{#if cell.occupiedByName}
														<div
															class={`grid-cell occupied rarity-${cell.occupiedRarity ?? 'normal'}`}
														>
															<span>{cell.occupiedByName.slice(0, 2).toUpperCase()}</span>
														</div>
													{:else if selectedPlacementWeapon && cell.canPlaceSelectedWeapon}
														<form method="post" action="?/placeLoadoutWeapon">
															<input
																type="hidden"
																name="weaponInstanceId"
																value={selectedPlacementWeapon.weaponInstanceId}
															/>
															<input type="hidden" name="x" value={cell.x} />
															<input type="hidden" name="y" value={cell.y} />
															<button
																class="grid-cell grid-anchor"
																type="submit"
																aria-label={`Place at ${cell.x}, ${cell.y}`}
															>
																<span>+</span>
															</button>
														</form>
													{:else}
														<div class="grid-cell empty"></div>
													{/if}
												{/each}
											{/each}
										</div>
									</div>
								</div>
							{:else}
								<p class="upgrade-note">All owned weapons are currently equipped.</p>
							{/if}
						</div>

						<div class="summary-section">
							<p class="eyebrow">Owned weapons</p>
							{#if ownedWeaponSummaryRows.length > 0}
								<div class="summary-list">
									{#each ownedWeaponSummaryRows as weapon (weapon.definitionId)}
										<div class={`summary-row rarity-${weapon.rarity}`}>
											<span>{weapon.name}</span>
											<strong>{weapon.count} total · {weapon.equippedCount} equipped</strong>
										</div>
									{/each}
								</div>
							{:else}
								<p class="upgrade-note">No owned weapons recorded yet.</p>
							{/if}
						</div>
					</div>

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

	.toggle.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}

	.summary-list {
		display: grid;
		gap: 0.55rem;
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

	.placement-field {
		display: grid;
		gap: 0.2rem;
		font-size: 0.75rem;
		color: #c4c4c4;
	}

	.placement-field input {
		width: 4rem;
		min-height: 2rem;
		padding: 0.2rem 0.45rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 0.7rem;
		background: rgba(255, 255, 255, 0.05);
		color: #f5f5f5;
		font: inherit;
	}

	.placement-submit,
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
