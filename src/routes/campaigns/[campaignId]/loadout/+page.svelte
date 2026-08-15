<script lang="ts">
	import { fade } from 'svelte/transition';
	import LoadoutDraggedShapePreview from '$lib/components/campaigns/LoadoutDraggedShapePreview.svelte';
	import LoadoutGridBoard from '$lib/components/campaigns/LoadoutGridBoard.svelte';
	import LoadoutInventoryToolbox from '$lib/components/campaigns/LoadoutInventoryToolbox.svelte';
	import LoadoutSaveDialog from '$lib/components/campaigns/LoadoutSaveDialog.svelte';
	import LoadoutSummaryStrip from '$lib/components/campaigns/LoadoutSummaryStrip.svelte';
	import LoadoutWeaponDetailsPane from '$lib/components/campaigns/LoadoutWeaponDetailsPane.svelte';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import {
		cycleLoadoutRotation,
		getLoadoutRotationLabel,
		getPlacementRotation,
		rotateWeaponShape
	} from '$lib/game/loadout-rotation';
	import { createBaselineUpgradeablePixlState } from '$lib/game/upgrades';
	import { createCampaignSketch } from '$lib/p5/campaign-1-sketch';
	import {
		buildGridCells,
		buildInventoryWeaponGroups,
		buildInventoryWeapons,
		buildLoadoutWeapons,
		cloneLoadoutPlacements,
		filterInventoryWeaponGroups,
		formatCycleAverage,
		formatCycleThreshold,
		formatAttackLabel,
		formatInventoryGroupStatus,
		getDefaultDragAnchor,
		getDragAnchorFromGrid,
		getGridCellKey,
		getPlacedWeaponDragAnchor,
		getShapeLabel,
		getShapeGridTemplate,
		getWeaponCycleRate,
		getWeaponGridArea,
		isLabelCell,
		isPointWithinElementBounds,
		isShapeCellFilled,
		setShapeGridDragImage,
		type GridCell,
		type InventoryWeapon,
		type InventoryWeaponGroup,
		type LiveCombatProgress,
		type LoadoutWeapon
	} from './loadout-helpers';
	import type { LoadoutItemDefinition, LoadoutPlacement, LoadoutRotation } from '$lib/data/types';
	import type { PageProps } from './$types';

	const baselinePixlProgression = createBaselineUpgradeablePixlState();

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

	interface SelectedWeaponDetails {
		name: string;
		rarity: string;
		category: 'weapon' | 'utility';
		role: string;
		shapeLabel: string;
		rotationLabel?: string;
		summary: string;
		stats: Array<{ label: string; value: string }>;
		canRotate?: boolean;
	}

	interface ScrapDialogState {
		definitionId: string;
		name: string;
		rarity: InventoryWeaponGroup['rarity'];
		totalCount: number;
		availableCount: number;
		equippedCount: number;
		scrapableCount: number;
	}

	const scrapValueByRarity = {
		normal: 5,
		magic: 25,
		rare: 100,
		exotic: 500,
		legendary: 5000
	} as const;
	const MOBILE_LAYOUT_BREAKPOINT = 860;

	let { data, form }: PageProps = $props();
	let innerWidth = $state<number | null>(null);
	let isMobileLayout = $derived(innerWidth !== null && innerWidth <= MOBILE_LAYOUT_BREAKPOINT);
	let draggedWeaponInstanceId = $state<string | null>(null);
	let draggedWeaponAnchor = $state<{ x: number; y: number } | null>(null);
	let draggedWeaponRotation = $state<LoadoutRotation>(0);
	let draggedWeaponPointerId = $state<number | null>(null);
	let hoveredGridOrigin = $state<{ x: number; y: number } | null>(null);
	let isInventoryDropTargetActive = $state(false);
	let inventorySearch = $state('');
	let showSaveWarning = $state(false);
	let showUnsavedToast = $state(false);
	let showRotationTip = $state(false);
	let hasSeenRotationTip = $state(false);
	let isMobileItemPaneOpen = $state(false);
	let selectedPlacedWeaponInstanceId = $state<string | null>(null);
	let selectedInventoryDefinitionId = $state<string | null>(null);
	let scrapDialog = $state<ScrapDialogState | null>(null);
	let scrapQuantity = $state(1);
	let confirmHighRarityScrap = $state(false);
	let saveLoadoutForm = $state<HTMLFormElement | null>(null);
	let pixlStateOverride = $state.raw<PixlStateOverride | null>(null);
	let campaignStateOverride = $state.raw<CampaignStateOverride | null>(null);
	let liveCombatProgressOverride = $state<LiveCombatProgress | null>(null);
	let previousHasUnsavedChanges = false;
	let unsavedToastTimeout: ReturnType<typeof setTimeout> | null = null;
	let rotationTipTimeout: ReturnType<typeof setTimeout> | null = null;
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
	let progressionState = $derived(
		livePixlState ?? data.gameState?.pixlState ?? baselinePixlProgression
	);
	let loadoutRowCount = $derived(progressionState.loadoutRows);
	let loadoutColumnCount = $derived(progressionState.loadoutColumns);
	let loadoutGridTemplateColumns = $derived(`repeat(${loadoutColumnCount}, minmax(0, 1fr))`);
	let loadoutGridTemplateRows = $derived(`repeat(${loadoutRowCount}, minmax(0, 1fr))`);

	let weaponDefinitionById = $derived(
		data.weaponDefinitionsById as Record<string, LoadoutItemDefinition>
	);
	let ownedWeapons = $derived(
		livePixlState?.ownedWeapons ?? data.gameState?.pixlState.ownedWeapons ?? []
	);
	let ownedWeaponByInstanceId = $derived(
		Object.fromEntries(ownedWeapons.map((weapon) => [weapon.instanceId, weapon])) as Record<
			string,
			(typeof ownedWeapons)[number]
		>
	);
	let savedLoadoutPlacements = $derived(data.gameState?.pixlState.loadoutPlacements ?? []);
	let savedLoadoutPayload = $derived(JSON.stringify(savedLoadoutPlacements));
	let draftLoadoutPlacements = $state.raw(getInitialLoadoutPlacements());
	let liveCampaignLevel = $derived(
		liveCampaignState?.currentLevel ?? data.campaignState?.currentLevel ?? 1
	);
	let liveCampaignLevelData = $derived(
		data.campaign.levels[
			Math.max(0, Math.min(liveCampaignLevel - 1, data.campaign.levels.length - 1))
		] ?? data.campaign.levels[0]
	);
	let liveRunStage = $derived(
		liveCombatProgressOverride?.stage ?? liveCampaignLevelData?.stage ?? 1
	);
	let liveRunStageLevel = $derived(
		liveCombatProgressOverride?.stageLevel ?? liveCampaignLevelData?.stageLevel ?? 1
	);
	let liveRunCampaignLevel = $derived(
		liveCombatProgressOverride?.campaignLevel ??
			liveCampaignLevelData?.campaignLevel ??
			liveCampaignLevel
	);
	let liveRunStatus = $derived(liveCombatProgressOverride?.status ?? 'running');
	let placementByWeaponInstanceId = $derived(
		Object.fromEntries(
			draftLoadoutPlacements.map((placement) => [placement.weaponInstanceId, placement])
		) as Record<string, LoadoutPlacement>
	);
	let draftLoadoutPayload = $derived(JSON.stringify(draftLoadoutPlacements));
	let hasUnsavedChanges = $derived(savedLoadoutPayload !== draftLoadoutPayload);
	let canSaveLoadout = $derived(Boolean(data.gameState) && hasUnsavedChanges);
	let loadoutWeapons = $derived.by(() =>
		buildLoadoutWeapons(draftLoadoutPlacements, ownedWeaponByInstanceId, weaponDefinitionById)
	);
	let inventoryWeapons = $derived.by(() =>
		buildInventoryWeapons(ownedWeapons, weaponDefinitionById, placementByWeaponInstanceId)
	);
	let draggedWeaponDefinition = $derived(
		draggedWeaponInstanceId
			? weaponDefinitionById[ownedWeaponByInstanceId[draggedWeaponInstanceId]?.definitionId]
			: null
	);
	let draggedWeaponShape = $derived(
		draggedWeaponDefinition
			? rotateWeaponShape(draggedWeaponDefinition.shape, draggedWeaponRotation)
			: null
	);
	let occupiedCellKeys = $derived.by(() => {
		const occupied: Record<string, true> = {};

		for (const weapon of loadoutWeapons) {
			if (weapon.weaponInstanceId === draggedWeaponInstanceId) {
				continue;
			}

			for (const [shapeX, shapeY] of weapon.shape.cells) {
				occupied[getGridCellKey(weapon.x + shapeX, weapon.y + shapeY)] = true;
			}
		}

		return occupied;
	});
	let gridCells = $derived.by(() => buildGridCells(loadoutRowCount, loadoutColumnCount));
	let visiblePlacedWeapons = $derived(loadoutWeapons);
	let previewCellStateByKey = $derived.by(() => {
		const preview: Record<string, 'valid' | 'invalid'> = {};

		if (!draggedWeaponInstanceId || !draggedWeaponShape || !hoveredGridOrigin) {
			return preview;
		}

		const isValid = canPlaceWeaponAt(
			draggedWeaponInstanceId,
			hoveredGridOrigin.x,
			hoveredGridOrigin.y
		);

		for (const [shapeX, shapeY] of draggedWeaponShape.cells) {
			const gridX = hoveredGridOrigin.x + shapeX;
			const gridY = hoveredGridOrigin.y + shapeY;

			if (gridX >= 0 && gridX < loadoutColumnCount && gridY >= 0 && gridY < loadoutRowCount) {
				preview[getGridCellKey(gridX, gridY)] = isValid ? 'valid' : 'invalid';
			}
		}

		return preview;
	});
	let equippedDamagePerCycle = $derived(
		loadoutWeapons.reduce(
			(total, weapon) =>
				total +
				(weapon.category === 'weapon' && weapon.baseDamage && weapon.attack
					? weapon.baseDamage * weapon.attack.projectileCount * getWeaponCycleRate(weapon)
					: 0),
			0
		)
	);
	let equippedProjectilesPerCycle = $derived(
		loadoutWeapons.reduce(
			(total, weapon) =>
				total +
				(weapon.category === 'weapon' && weapon.attack
					? weapon.attack.projectileCount * getWeaponCycleRate(weapon)
					: 0),
			0
		)
	);
	let progressionSignature = $derived(
		`${progressionState.xp}:${progressionState.defence}:${progressionState.agility}:${progressionState.health}:${progressionState.attackSpeed}:${progressionState.loadoutRows}:${progressionState.loadoutColumns}`
	);
	let hiddenSketchPixlState = $derived.by(() => {
		const source = livePixlState ?? data.gameState?.pixlState ?? null;

		if (!source) {
			return null;
		}

		return {
			xp: source.xp,
			defence: source.defence,
			agility: source.agility,
			ownedWeapons: source.ownedWeapons,
			loadoutPlacements: savedLoadoutPlacements
		};
	});
	let backgroundSketchRemountKey = $derived(
		`${data.campaignId}:${savedLoadoutPayload}:${data.campaignState?.currentLevel ?? 1}:${progressionSignature}`
	);
	let backgroundCampaignSketch = $derived.by(() => {
		return (p: import('p5').default) =>
			createCampaignSketch(data.campaign, data.combatProfile, {
				persistPath: '/api/game/state',
				runMode: 'combat',
				showLoadoutSketch: false,
				pixlState: hiddenSketchPixlState,
				campaignState: liveCampaignState ?? data.campaignState ?? null,
				onStateChange: handleBackgroundStateChange,
				onCombatStateChange: handleBackgroundCombatStateChange
			})(p);
	});
	let draggedInventoryWeapon = $derived(
		draggedWeaponInstanceId
			? (inventoryWeapons.find((weapon) => weapon.weaponInstanceId === draggedWeaponInstanceId) ??
					null)
			: null
	);
	let mobileRotateInstanceId = $derived(
		draggedWeaponInstanceId ?? selectedPlacedWeaponInstanceId ?? null
	);
	let mobileRotateWeapon = $derived(
		mobileRotateInstanceId
			? (loadoutWeapons.find((weapon) => weapon.weaponInstanceId === mobileRotateInstanceId) ??
					inventoryWeapons.find((weapon) => weapon.weaponInstanceId === mobileRotateInstanceId) ??
					null)
			: null
	);
	let inventoryWeaponGroups = $derived.by(() => buildInventoryWeaponGroups(inventoryWeapons));
	let filteredInventoryWeaponGroups = $derived.by(() =>
		filterInventoryWeaponGroups(inventoryWeaponGroups, inventorySearch)
	);
	let selectedPlacedWeapon = $derived(
		selectedPlacedWeaponInstanceId
			? (loadoutWeapons.find(
					(weapon) => weapon.weaponInstanceId === selectedPlacedWeaponInstanceId
				) ?? null)
			: null
	);
	let selectedInventoryGroup = $derived(
		selectedInventoryDefinitionId
			? (inventoryWeaponGroups.find(
					(group) => group.definitionId === selectedInventoryDefinitionId
				) ?? null)
			: null
	);
	let selectedWeaponDetails = $derived.by(() => {
		if (selectedPlacedWeapon) {
			return {
				name: selectedPlacedWeapon.name,
				rarity: selectedPlacedWeapon.rarity,
				category: selectedPlacedWeapon.category,
				role: selectedPlacedWeapon.role,
				shapeLabel: getShapeLabel(selectedPlacedWeapon.shape, selectedPlacedWeapon.rotation),
				rotationLabel: getLoadoutRotationLabel(selectedPlacedWeapon.rotation),
				summary:
					selectedPlacedWeapon.category === 'weapon'
						? selectedPlacedWeapon.effectSummary
						: `${selectedPlacedWeapon.activationKind === 'passive' ? 'Passive' : 'Triggered'} utility · ${selectedPlacedWeapon.effectSummary}`,
				stats: [
					...(selectedPlacedWeapon.category === 'weapon' && selectedPlacedWeapon.baseDamage
						? [{ label: 'Damage', value: `${selectedPlacedWeapon.baseDamage}` }]
						: []),
					...(selectedPlacedWeapon.category === 'weapon' && selectedPlacedWeapon.attack
						? [
								{ label: 'Projectiles', value: `${selectedPlacedWeapon.attack.projectileCount}` },
								{
									label: 'Cadence',
									value: `Every ${formatCycleThreshold(selectedPlacedWeapon.attack)} cycle${formatCycleThreshold(selectedPlacedWeapon.attack) === '1' ? '' : 's'}`
								},
								{ label: 'Attack', value: formatAttackLabel(selectedPlacedWeapon.attack.kind) }
							]
						: []),
					...(selectedPlacedWeapon.category === 'utility'
						? [
								{
									label: 'Activation',
									value: selectedPlacedWeapon.activationKind === 'passive' ? 'Passive' : 'Triggered'
								}
							]
						: []),
					{ label: 'Placement', value: `${selectedPlacedWeapon.x}, ${selectedPlacedWeapon.y}` }
				],
				canRotate: true
			} satisfies SelectedWeaponDetails;
		}

		if (selectedInventoryGroup) {
			return {
				name: selectedInventoryGroup.name,
				rarity: selectedInventoryGroup.rarity,
				category: selectedInventoryGroup.category,
				role: selectedInventoryGroup.role,
				shapeLabel: getShapeLabel(selectedInventoryGroup.shape),
				summary:
					selectedInventoryGroup.category === 'weapon'
						? selectedInventoryGroup.effectSummary
						: `${selectedInventoryGroup.activationKind === 'passive' ? 'Passive' : 'Triggered'} utility · ${selectedInventoryGroup.effectSummary}`,
				stats: [
					...(selectedInventoryGroup.category === 'weapon' && selectedInventoryGroup.baseDamage
						? [{ label: 'Damage', value: `${selectedInventoryGroup.baseDamage}` }]
						: []),
					...(selectedInventoryGroup.category === 'weapon' && selectedInventoryGroup.attack
						? [
								{ label: 'Projectiles', value: `${selectedInventoryGroup.attack.projectileCount}` },
								{
									label: 'Cadence',
									value: `Every ${formatCycleThreshold(selectedInventoryGroup.attack)} cycle${formatCycleThreshold(selectedInventoryGroup.attack) === '1' ? '' : 's'}`
								},
								{ label: 'Attack', value: formatAttackLabel(selectedInventoryGroup.attack.kind) }
							]
						: []),
					...(selectedInventoryGroup.projectileSpeed
						? [{ label: 'Projectile speed', value: `${selectedInventoryGroup.projectileSpeed}` }]
						: []),
					...(selectedInventoryGroup.category === 'utility'
						? [
								{
									label: 'Activation',
									value:
										selectedInventoryGroup.activationKind === 'passive' ? 'Passive' : 'Triggered'
								}
							]
						: []),
					{ label: 'Ready', value: `${selectedInventoryGroup.availableCount}` },
					{ label: 'Equipped', value: `${selectedInventoryGroup.equippedCount}` }
				]
			} satisfies SelectedWeaponDetails;
		}

		return null;
	});
	let scrapValuePerItem = $derived(scrapDialog ? scrapValueByRarity[scrapDialog.rarity] : 0);
	let isHighRarityScrap = $derived(
		scrapDialog ? scrapDialog.rarity === 'exotic' || scrapDialog.rarity === 'legendary' : false
	);
	let totalScrapYield = $derived(scrapQuantity * scrapValuePerItem);

	$effect(() => {
		const shouldShowToast =
			hasUnsavedChanges &&
			!previousHasUnsavedChanges &&
			!form?.loadoutError &&
			!form?.loadoutSuccess;

		if (shouldShowToast) {
			showUnsavedToast = true;

			if (unsavedToastTimeout) {
				clearTimeout(unsavedToastTimeout);
			}

			unsavedToastTimeout = setTimeout(() => {
				showUnsavedToast = false;
				unsavedToastTimeout = null;
			}, 1800);
		}

		if (!hasUnsavedChanges) {
			showUnsavedToast = false;

			if (unsavedToastTimeout) {
				clearTimeout(unsavedToastTimeout);
				unsavedToastTimeout = null;
			}
		}

		previousHasUnsavedChanges = hasUnsavedChanges;
	});

	$effect(() => {
		if (!scrapDialog) {
			return;
		}

		scrapQuantity = Math.max(1, Math.min(scrapQuantity, scrapDialog.scrapableCount));
	});

	$effect(() => {
		if (typeof localStorage === 'undefined') {
			return;
		}

		hasSeenRotationTip = localStorage.getItem('pixlvl-loadout-rotation-tip-seen') === 'true';
	});

	$effect(() => {
		if (!isMobileLayout) {
			isMobileItemPaneOpen = false;
		}
	});

	function getInitialLoadoutPlacements() {
		return cloneLoadoutPlacements(data.gameState?.pixlState.loadoutPlacements ?? []);
	}

	function getScrapableCount(group: InventoryWeaponGroup) {
		return Math.max(0, Math.min(group.availableCount, group.totalCount - 1));
	}

	function clampScrapQuantity(value: number) {
		if (!scrapDialog) {
			return 1;
		}

		if (!Number.isFinite(value)) {
			return 1;
		}

		return Math.max(1, Math.min(Math.floor(value), scrapDialog.scrapableCount));
	}

	function openScrapDialog(group: InventoryWeaponGroup) {
		const scrapableCount = getScrapableCount(group);

		if (scrapableCount < 1) {
			return;
		}

		scrapDialog = {
			definitionId: group.definitionId,
			name: group.name,
			rarity: group.rarity,
			totalCount: group.totalCount,
			availableCount: group.availableCount,
			equippedCount: group.equippedCount,
			scrapableCount
		};
		scrapQuantity = 1;
		confirmHighRarityScrap = false;
	}

	function closeScrapDialog() {
		scrapDialog = null;
		scrapQuantity = 1;
		confirmHighRarityScrap = false;
	}

	function adjustScrapQuantity(delta: number) {
		scrapQuantity = clampScrapQuantity(scrapQuantity + delta);
	}

	function handleScrapQuantityInput(event: Event) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		scrapQuantity = clampScrapQuantity(Number(target.value));
	}

	function formatRarityLabel(value: InventoryWeaponGroup['rarity']) {
		return value[0].toUpperCase() + value.slice(1);
	}

	function handleScrapBackdropKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Escape') {
			return;
		}

		event.preventDefault();
		closeScrapDialog();
	}

	function handleBackgroundStateChange(update: {
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
	}) {
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
	}

	function handleBackgroundCombatStateChange(update: LiveCombatProgress) {
		liveCombatProgressOverride = update;
	}

	function markRotationTipSeen() {
		hasSeenRotationTip = true;
		showRotationTip = false;

		if (rotationTipTimeout) {
			clearTimeout(rotationTipTimeout);
			rotationTipTimeout = null;
		}

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('pixlvl-loadout-rotation-tip-seen', 'true');
		}
	}

	function showRotationTipOnce() {
		if (hasSeenRotationTip) {
			return;
		}

		showRotationTip = true;

		if (rotationTipTimeout) {
			clearTimeout(rotationTipTimeout);
		}

		rotationTipTimeout = setTimeout(() => {
			showRotationTip = false;
			rotationTipTimeout = null;
		}, 2600);
	}

	function requestLoadoutSaveConfirmation() {
		if (!canSaveLoadout) {
			return;
		}

		showSaveWarning = true;
	}

	function confirmLoadoutSave() {
		showSaveWarning = false;
		saveLoadoutForm?.requestSubmit();
	}

	function cancelLoadoutSave() {
		showSaveWarning = false;
	}

	function hasLegendaryPlacementConflict(weaponInstanceId: string) {
		const ownedWeapon = ownedWeaponByInstanceId[weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!definition || definition.rarity !== 'legendary') {
			return false;
		}

		return draftLoadoutPlacements.some((placement) => {
			if (placement.weaponInstanceId === weaponInstanceId) {
				return false;
			}

			const placedOwnedWeapon = ownedWeaponByInstanceId[placement.weaponInstanceId];
			const placedDefinition = placedOwnedWeapon
				? weaponDefinitionById[placedOwnedWeapon.definitionId]
				: null;

			return Boolean(
				placedDefinition &&
				placedDefinition.rarity === 'legendary' &&
				placedDefinition.id === definition.id
			);
		});
	}

	function getOccupiedCellKeys(excludedWeaponInstanceId: string | null = draggedWeaponInstanceId) {
		const occupied: Record<string, true> = {};

		for (const weapon of loadoutWeapons) {
			if (weapon.weaponInstanceId === excludedWeaponInstanceId) {
				continue;
			}

			for (const [shapeX, shapeY] of weapon.shape.cells) {
				occupied[getGridCellKey(weapon.x + shapeX, weapon.y + shapeY)] = true;
			}
		}

		return occupied;
	}

	function clampPlacementOrigin(shape: { width: number; height: number }, x: number, y: number) {
		return {
			x: Math.max(0, Math.min(x, loadoutColumnCount - shape.width)),
			y: Math.max(0, Math.min(y, loadoutRowCount - shape.height))
		};
	}

	function canPlaceWeaponAt(
		weaponInstanceId: string,
		x: number,
		y: number,
		rotation = draggedWeaponRotation
	) {
		const ownedWeapon = ownedWeaponByInstanceId[weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!definition) {
			return false;
		}

		if (hasLegendaryPlacementConflict(weaponInstanceId)) {
			return false;
		}

		const shape = rotateWeaponShape(definition.shape, rotation);
		const occupiedCells = getOccupiedCellKeys(weaponInstanceId);

		return shape.cells.every(([shapeX, shapeY]) => {
			const gridX = x + shapeX;
			const gridY = y + shapeY;

			return (
				gridX >= 0 &&
				gridX < loadoutColumnCount &&
				gridY >= 0 &&
				gridY < loadoutRowCount &&
				!occupiedCells[getGridCellKey(gridX, gridY)]
			);
		});
	}

	function placeWeaponAt(
		weaponInstanceId: string,
		x: number,
		y: number,
		rotation = draggedWeaponRotation
	) {
		if (!canPlaceWeaponAt(weaponInstanceId, x, y, rotation)) {
			return;
		}

		draftLoadoutPlacements = [
			...draftLoadoutPlacements.filter(
				(placement) => placement.weaponInstanceId !== weaponInstanceId
			),
			{ weaponInstanceId, x, y, rotation } satisfies LoadoutPlacement
		];
		selectedPlacedWeaponInstanceId = weaponInstanceId;
		selectedInventoryDefinitionId = null;
		isMobileItemPaneOpen = false;
		clearDragState();
	}

	function removeDraftPlacement(weaponInstanceId: string) {
		draftLoadoutPlacements = draftLoadoutPlacements.filter(
			(placement) => placement.weaponInstanceId !== weaponInstanceId
		);

		if (selectedPlacedWeaponInstanceId === weaponInstanceId) {
			selectedPlacedWeaponInstanceId = null;
		}

		clearDragState();
	}

	function pickWeaponForMobilePlacement(weaponInstanceId: string, rotation: LoadoutRotation) {
		const ownedWeapon = ownedWeaponByInstanceId[weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!ownedWeapon || !definition) {
			return;
		}

		draggedWeaponInstanceId = weaponInstanceId;
		draggedWeaponRotation = rotation;
		draggedWeaponAnchor = getDefaultDragAnchor(rotateWeaponShape(definition.shape, rotation));
		draggedWeaponPointerId = null;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
		showRotationTip = false;
	}

	function resetDraftLoadout() {
		draftLoadoutPlacements = cloneLoadoutPlacements(savedLoadoutPlacements);
		clearDragState();
	}

	function clearDraftLoadout() {
		draftLoadoutPlacements = [];
		clearDragState();
	}

	function beginWeaponDrag(
		event: PointerEvent,
		weaponInstanceId: string,
		anchor: { x: number; y: number },
		rotation: LoadoutRotation
	) {
		if (event.cancelable) {
			event.preventDefault();
		}

		draggedWeaponInstanceId = weaponInstanceId;
		draggedWeaponAnchor = anchor;
		draggedWeaponRotation = rotation;
		draggedWeaponPointerId = event.pointerId;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
		showRotationTipOnce();

		const target = event.currentTarget;

		if (target instanceof HTMLElement) {
			target.setPointerCapture(event.pointerId);
		}
	}

	function scrollLoadoutGridIntoView() {
		document.getElementById('loadout-grid-shell')?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest'
		});
	}

	function updateHoveredOriginFromCell(cell: GridCell) {
		if (!draggedWeaponInstanceId) {
			return;
		}

		const anchor = draggedWeaponAnchor ?? { x: 0, y: 0 };
		hoveredGridOrigin = { x: cell.x - anchor.x, y: cell.y - anchor.y };
		isInventoryDropTargetActive = false;
	}

	function handlePointerMove(event: PointerEvent) {
		if (draggedWeaponPointerId === null || event.pointerId !== draggedWeaponPointerId) {
			return;
		}

		if (event.cancelable) {
			event.preventDefault();
		}

		const cell = getGridCellFromPoint(event.clientX, event.clientY);

		if (cell) {
			updateHoveredOriginFromCell(cell);
			return;
		}

		const inventoryDropZone = document.getElementById('loadout-inventory-drop-zone');

		if (
			draggedInventoryWeapon?.isEquipped &&
			inventoryDropZone instanceof HTMLElement &&
			isPointWithinElementBounds(inventoryDropZone, event.clientX, event.clientY)
		) {
			hoveredGridOrigin = null;
			isInventoryDropTargetActive = true;
			return;
		}

		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
	}

	function finishPointerDrag(event: PointerEvent) {
		if (!draggedWeaponInstanceId) {
			return;
		}

		if (isMobileLayout && draggedWeaponPointerId === null) {
			return;
		}

		if (draggedWeaponPointerId !== null && event.pointerId !== draggedWeaponPointerId) {
			return;
		}

		if (hoveredGridOrigin) {
			placeWeaponAt(
				draggedWeaponInstanceId,
				hoveredGridOrigin.x,
				hoveredGridOrigin.y,
				draggedWeaponRotation
			);
			return;
		}

		if (isInventoryDropTargetActive && draggedInventoryWeapon?.isEquipped) {
			removeDraftPlacement(draggedWeaponInstanceId);
			return;
		}

		clearDragState();
	}

	function clearDragState() {
		draggedWeaponInstanceId = null;
		draggedWeaponAnchor = null;
		draggedWeaponRotation = 0;
		draggedWeaponPointerId = null;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
		showRotationTip = false;
	}

	function cancelMobilePlacement() {
		clearDragState();
		selectedInventoryDefinitionId = null;
	}

	function rotateDraggedWeapon() {
		if (!draggedWeaponDefinition) {
			return;
		}

		const nextRotation = cycleLoadoutRotation(draggedWeaponRotation);
		const nextShape = rotateWeaponShape(draggedWeaponDefinition.shape, nextRotation);
		const hoveredCell =
			hoveredGridOrigin && draggedWeaponAnchor
				? {
						x: hoveredGridOrigin.x + draggedWeaponAnchor.x,
						y: hoveredGridOrigin.y + draggedWeaponAnchor.y
					}
				: null;

		draggedWeaponRotation = nextRotation;
		draggedWeaponAnchor = getDefaultDragAnchor(nextShape);

		if (hoveredCell) {
			hoveredGridOrigin = {
				x: hoveredCell.x - draggedWeaponAnchor!.x,
				y: hoveredCell.y - draggedWeaponAnchor!.y
			};
		}

		markRotationTipSeen();
	}

	function rotatePlacedWeapon(weaponInstanceId: string) {
		const placement = placementByWeaponInstanceId[weaponInstanceId];
		const ownedWeapon = ownedWeaponByInstanceId[weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!placement || !definition) {
			return;
		}

		const nextRotation = cycleLoadoutRotation(getPlacementRotation(placement));
		const rotatedShape = rotateWeaponShape(definition.shape, nextRotation);
		const nextOrigin = clampPlacementOrigin(rotatedShape, placement.x, placement.y);

		if (!canPlaceWeaponAt(weaponInstanceId, nextOrigin.x, nextOrigin.y, nextRotation)) {
			return;
		}

		draftLoadoutPlacements = draftLoadoutPlacements.map((entry) =>
			entry.weaponInstanceId === weaponInstanceId
				? { ...entry, x: nextOrigin.x, y: nextOrigin.y, rotation: nextRotation }
				: entry
		);
		selectedPlacedWeaponInstanceId = weaponInstanceId;
		selectedInventoryDefinitionId = null;
		markRotationTipSeen();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if ((event.key === 'r' || event.key === 'R') && draggedWeaponInstanceId) {
			event.preventDefault();
			rotateDraggedWeapon();
		}
	}

	function getGridCellFromPoint(clientX: number, clientY: number) {
		if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
			return null;
		}

		for (const element of document.elementsFromPoint(clientX, clientY)) {
			if (!(element instanceof HTMLElement)) {
				continue;
			}

			const cellElement = element.closest('[data-grid-x][data-grid-y]');

			if (!(cellElement instanceof HTMLElement)) {
				continue;
			}

			const x = Number(cellElement.dataset.gridX);
			const y = Number(cellElement.dataset.gridY);

			if (!Number.isInteger(x) || !Number.isInteger(y)) {
				continue;
			}

			return {
				x,
				y,
				key: getGridCellKey(x, y)
			} satisfies GridCell;
		}

		return null;
	}

	function beginPlacedWeaponDrag(event: PointerEvent, weapon: LoadoutWeapon) {
		selectedPlacedWeaponInstanceId = weapon.weaponInstanceId;
		selectedInventoryDefinitionId = null;

		if (isMobileLayout) {
			isMobileItemPaneOpen = false;
		}

		beginWeaponDrag(
			event,
			weapon.weaponInstanceId,
			getPlacedWeaponDragAnchor(event, weapon.shape),
			weapon.rotation
		);
	}

	function beginInventoryWeaponDrag(event: PointerEvent, weapon: InventoryWeapon) {
		const target = event.currentTarget;
		const defaultAnchor = getDefaultDragAnchor(weapon.shape);
		let anchor = defaultAnchor;

		if (target instanceof HTMLElement) {
			const shapeGrid = target.querySelector('.shape-grid');

			if (shapeGrid instanceof HTMLElement) {
				anchor = getDragAnchorFromGrid(event, weapon.shape, shapeGrid, defaultAnchor);
			}
		}

		selectedPlacedWeaponInstanceId = null;
		selectedInventoryDefinitionId = weapon.definitionId;

		scrollLoadoutGridIntoView();
		beginWeaponDrag(event, weapon.weaponInstanceId, anchor, 0);
	}

	function beginInventoryWeaponGroupDrag(event: PointerEvent, group: InventoryWeaponGroup) {
		if (!group.representativeWeaponInstanceId) {
			return;
		}

		const weapon = inventoryWeapons.find(
			(candidate) => candidate.weaponInstanceId === group.representativeWeaponInstanceId
		);

		if (!weapon) {
			return;
		}

		beginInventoryWeaponDrag(event, weapon);
	}

	function handleMobileGroupPick(group: InventoryWeaponGroup) {
		if (!isMobileLayout || !group.representativeWeaponInstanceId || group.availableCount < 1) {
			return;
		}

		const weapon = inventoryWeapons.find(
			(candidate) => candidate.weaponInstanceId === group.representativeWeaponInstanceId
		);

		if (!weapon) {
			return;
		}

		selectedPlacedWeaponInstanceId = null;
		selectedInventoryDefinitionId = group.definitionId;
		pickWeaponForMobilePlacement(weapon.weaponInstanceId, 0);
		isMobileItemPaneOpen = false;
	}

	function handleMobileGridCellPress(cell: GridCell) {
		if (!isMobileLayout || !draggedWeaponInstanceId) {
			return;
		}

		const anchor = draggedWeaponAnchor ?? { x: 0, y: 0 };
		placeWeaponAt(
			draggedWeaponInstanceId,
			cell.x - anchor.x,
			cell.y - anchor.y,
			draggedWeaponRotation
		);
	}

	function selectPlacedWeapon(weapon: LoadoutWeapon) {
		selectedPlacedWeaponInstanceId = weapon.weaponInstanceId;
		selectedInventoryDefinitionId = null;
	}

	function selectInventoryGroup(group: InventoryWeaponGroup) {
		selectedPlacedWeaponInstanceId = null;
		selectedInventoryDefinitionId = group.definitionId;
	}
</script>

<svelte:head>
	<title>Loadout | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<svelte:window
	bind:innerWidth
	onkeydown={handleWindowKeydown}
	onpointermove={handlePointerMove}
	onpointerup={finishPointerDrag}
	onpointercancel={finishPointerDrag}
/>

<div class="route-page">
	{#if hiddenSketchPixlState && (liveCampaignState ?? data.campaignState)}
		<div class="loadout-live-sketch-shell" aria-hidden="true">
			{#key backgroundSketchRemountKey}
				<P5Canvas class="loadout-live-sketch" sketch={backgroundCampaignSketch} />
			{/key}
		</div>
	{/if}

	<div class="shell">
		<section class="layout-stack">
			<div class="panel grid-panel">
				{#if form?.loadoutError}
					<p class="feedback error">{form.loadoutError}</p>
				{:else if form?.loadoutSuccess}
					<p class="feedback success">{form.loadoutSuccess}</p>
				{/if}

				{#if showUnsavedToast}
					<div class="toast-anchor" aria-live="polite">
						<div
							class="feedback neutral toast-message"
							in:fade={{ duration: 160 }}
							out:fade={{ duration: 220 }}
						>
							You have unsaved loadout changes.
						</div>
					</div>
				{/if}

				{#if showRotationTip}
					<div class="toast-anchor" aria-live="polite">
						<div
							class="feedback neutral toast-message"
							in:fade={{ duration: 160 }}
							out:fade={{ duration: 220 }}
						>
							Press R while dragging to rotate weapon pieces.
						</div>
					</div>
				{/if}

				<div class="loadout-toolbar-row">
					<LoadoutSummaryStrip
						stage={liveRunStage}
						stageLevel={liveRunStageLevel}
						status={liveRunStatus}
						damagePerCycle={formatCycleAverage(equippedDamagePerCycle)}
						projectilesPerCycle={formatCycleAverage(equippedProjectilesPerCycle)}
						equippedCount={loadoutWeapons.length}
					/>

					<div class="draft-actions toolbar-actions">
						<form method="post" action="?/saveLoadout" bind:this={saveLoadoutForm}>
							<input type="hidden" name="loadoutPlacements" value={draftLoadoutPayload} />
							<button
								class="save"
								type="button"
								onclick={requestLoadoutSaveConfirmation}
								disabled={!canSaveLoadout}
							>
								Save loadout
							</button>
						</form>
						<button
							class="ghost"
							type="button"
							onclick={clearDraftLoadout}
							disabled={!draftLoadoutPlacements.length}
						>
							Reset loadout
						</button>
						<button
							class="ghost"
							type="button"
							onclick={resetDraftLoadout}
							disabled={!hasUnsavedChanges}
						>
							Reset draft
						</button>
					</div>
				</div>

				{#if isMobileLayout}
					<div class="mobile-loadout-actions">
						<button class="ghost" type="button" onclick={() => (isMobileItemPaneOpen = true)}>
							Items
						</button>
						{#if mobileRotateInstanceId && mobileRotateWeapon}
							<button
								class="save"
								type="button"
								onclick={() => {
									if (
										draggedWeaponInstanceId &&
										draggedWeaponInstanceId === mobileRotateInstanceId
									) {
										rotateDraggedWeapon();
									} else {
										rotatePlacedWeapon(mobileRotateInstanceId);
									}
								}}
							>
								Rotate {mobileRotateWeapon.name}
							</button>
							{#if draggedWeaponInstanceId}
								<button class="ghost" type="button" onclick={cancelMobilePlacement}>
									Cancel
								</button>
							{/if}
						{/if}
					</div>
				{/if}

				{#if showSaveWarning}
					<LoadoutSaveDialog
						stage={liveRunStage}
						stageLevel={liveRunStageLevel}
						campaignLevel={liveRunCampaignLevel}
						onCancel={cancelLoadoutSave}
						onConfirm={confirmLoadoutSave}
					/>
				{/if}

				{#if draggedWeaponShape}
					<LoadoutDraggedShapePreview shape={draggedWeaponShape} />
				{/if}

				<LoadoutGridBoard
					gridTemplateColumns={loadoutGridTemplateColumns}
					gridTemplateRows={loadoutGridTemplateRows}
					{gridCells}
					{occupiedCellKeys}
					{previewCellStateByKey}
					weapons={visiblePlacedWeapons}
					{draggedWeaponInstanceId}
					mobilePlacementMode={isMobileLayout && Boolean(draggedWeaponInstanceId)}
					onSelectWeapon={selectPlacedWeapon}
					onPlacedWeaponPointerDown={beginPlacedWeaponDrag}
					onGridCellPress={handleMobileGridCellPress}
					{getWeaponGridArea}
					{getShapeGridTemplate}
					{isShapeCellFilled}
					{isLabelCell}
				/>

				<LoadoutWeaponDetailsPane
					detail={selectedWeaponDetails}
					onRotate={() => {
						if (selectedPlacedWeaponInstanceId) {
							rotatePlacedWeapon(selectedPlacedWeaponInstanceId);
						}
					}}
				/>
			</div>

			<aside
				class={[
					'panel',
					'inventory-panel',
					isMobileLayout ? 'mobile-item-pane' : '',
					isMobileLayout && isMobileItemPaneOpen ? 'open' : ''
				]}
				aria-label="Loadout toolbox"
			>
				<LoadoutInventoryToolbox
					searchValue={inventorySearch}
					onSearchInput={(value) => (inventorySearch = value)}
					isDropTargetActive={isInventoryDropTargetActive}
					groups={filteredInventoryWeaponGroups}
					{draggedWeaponInstanceId}
					onSelectGroup={selectInventoryGroup}
					onRequestScrap={openScrapDialog}
					onGroupPointerDown={beginInventoryWeaponGroupDrag}
					onGroupPick={handleMobileGroupPick}
					formatGroupStatus={formatInventoryGroupStatus}
					{isShapeCellFilled}
				/>
			</aside>

			{#if isMobileLayout && isMobileItemPaneOpen}
				<button
					class="mobile-pane-backdrop"
					type="button"
					aria-label="Close item pane"
					onclick={() => (isMobileItemPaneOpen = false)}
				></button>
			{/if}
		</section>
	</div>

	{#if scrapDialog}
		<div
			class="scrap-modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Close scrap dialog"
			onclick={closeScrapDialog}
			onkeydown={handleScrapBackdropKeydown}
		>
			<div
				class="scrap-modal panel"
				role="dialog"
				tabindex="-1"
				aria-modal="true"
				aria-labelledby="scrap-modal-title"
				onclick={(event) => event.stopPropagation()}
				onkeydown={(event) => event.stopPropagation()}
			>
				<div class="scrap-modal-head">
					<div>
						<p class="scrap-modal-eyebrow">Scrap duplicates</p>
						<h2 id="scrap-modal-title">{scrapDialog.name}</h2>
					</div>
					<button class="modal-close" type="button" onclick={closeScrapDialog}>Close</button>
				</div>

				<div class="scrap-stats-grid">
					<div class="stat-card">
						<span>Duplicates</span>
						<strong>{Math.max(0, scrapDialog.totalCount - 1)}</strong>
					</div>
					<div class="stat-card">
						<span>Scrapable now</span>
						<strong>{scrapDialog.scrapableCount}</strong>
					</div>
					<div class="stat-card">
						<span>Equipped</span>
						<strong>{scrapDialog.equippedCount}</strong>
					</div>
					<div class="stat-card">
						<span>Value per item</span>
						<strong>{scrapValuePerItem} Scrap</strong>
					</div>
				</div>

				<p class="scrap-copy">
					{formatRarityLabel(scrapDialog.rarity)} rarity copies can be scrapped from the available pool
					only.
				</p>

				{#if isHighRarityScrap}
					<p class="feedback error">
						High-rarity scrapping is permanent. Double-check equipped coverage before continuing.
					</p>
				{/if}

				<form method="post" action="?/scrapItems" class="scrap-form">
					<input type="hidden" name="definitionId" value={scrapDialog.definitionId} />

					<label class="scrap-quantity-field" for="scrap-quantity-input">
						<span>Quantity</span>
						<div class="scrap-quantity-controls">
							<button
								class="ghost quantity-button"
								type="button"
								onclick={() => adjustScrapQuantity(-1)}
								disabled={scrapQuantity <= 1}
							>
								-
							</button>
							<input
								id="scrap-quantity-input"
								name="quantity"
								type="number"
								min="1"
								max={scrapDialog.scrapableCount}
								step="1"
								value={scrapQuantity}
								oninput={handleScrapQuantityInput}
							/>
							<button
								class="ghost quantity-button"
								type="button"
								onclick={() => adjustScrapQuantity(1)}
								disabled={scrapQuantity >= scrapDialog.scrapableCount}
							>
								+
							</button>
						</div>
					</label>

					<div class="scrap-total-card stat-card">
						<span>Total yield</span>
						<strong>{totalScrapYield} Scrap</strong>
					</div>

					{#if isHighRarityScrap}
						<label class="scrap-confirmation">
							<input
								type="checkbox"
								name="confirmHighRarity"
								value="yes"
								bind:checked={confirmHighRarityScrap}
							/>
							<span>Confirm scrapping this {scrapDialog.rarity} item.</span>
						</label>
					{/if}

					<div class="scrap-actions">
						<button class="ghost" type="button" onclick={closeScrapDialog}>Cancel</button>
						<button
							class="save"
							type="submit"
							disabled={isHighRarityScrap && !confirmHighRarityScrap}
						>
							Scrap for {totalScrapYield}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.route-page {
		min-height: 100%;
		width: 100%;
		overflow-x: hidden;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 24%), #050505;
		position: relative;
	}

	.loadout-live-sketch-shell {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
	}

	:global(.loadout-live-sketch) {
		width: 1px;
		height: 1px;
	}

	.shell {
		width: 100%;
		max-width: none;
		margin: 0;
		padding: 0.75rem;
		box-sizing: border-box;
		display: grid;
		gap: 0.75rem;
	}

	.panel,
	.feedback,
	.save,
	.ghost {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.panel {
		padding: 0.8rem;
		display: grid;
		gap: 0.65rem;
	}

	.draft-actions,
	.loadout-toolbar-row {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		align-items: center;
	}

	.draft-actions {
		justify-content: flex-end;
	}

	.loadout-toolbar-row {
		align-items: flex-start;
	}

	.toolbar-actions {
		flex: 0 0 auto;
		flex-wrap: wrap;
	}

	.toolbar-actions form {
		margin: 0;
	}

	.layout-stack {
		display: grid;
		gap: 0.75rem;
		align-items: start;
	}

	.grid-panel {
		justify-items: stretch;
		align-content: start;
	}

	.inventory-panel {
		position: static;
		align-self: start;
		height: auto;
		max-height: none;
		min-height: 0;
		overflow: visible;
		grid-template-rows: minmax(0, 1fr);
		gap: 0.75rem;
	}

	.mobile-loadout-actions {
		display: none;
	}

	.save,
	.ghost {
		min-height: 1.95rem;
		padding: 0 0.8rem;
		color: #f5f5f5;
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.save {
		background: rgba(103, 217, 111, 0.14);
		border-color: rgba(103, 217, 111, 0.42);
	}

	.ghost {
		background: rgba(255, 255, 255, 0.04);
	}

	.save:disabled,
	.ghost:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.feedback {
		padding: 0.7rem 0.8rem;
		font-size: 0.9rem;
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

	.stat-card {
		padding: 0.85rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.25rem;
	}

	.stat-card span,
	.scrap-modal-eyebrow,
	.scrap-quantity-field span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.stat-card strong {
		font-size: 1.1rem;
	}

	.toast-anchor {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	.toast-message {
		width: min(24rem, calc(100vw - 2rem));
		padding: 0.95rem 1.1rem;
		text-align: center;
		backdrop-filter: blur(12px);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.38);
	}

	.scrap-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 1rem;
		border: 0;
		background: rgba(5, 5, 5, 0.7);
		backdrop-filter: blur(12px);
		cursor: pointer;
	}

	.scrap-modal {
		width: min(32rem, calc(100vw - 2rem));
		padding: 1rem;
		gap: 0.9rem;
	}

	.scrap-modal-head,
	.scrap-actions,
	.scrap-quantity-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.scrap-modal-head h2,
	.scrap-copy {
		margin: 0;
	}

	.scrap-modal-eyebrow {
		margin: 0 0 0.25rem;
	}

	.scrap-stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.scrap-copy {
		color: #c4c4c4;
		font-size: 0.94rem;
	}

	.scrap-form,
	.scrap-quantity-field {
		display: grid;
		gap: 0.75rem;
	}

	.scrap-quantity-controls input {
		width: 100%;
		min-height: 2.35rem;
		padding: 0.65rem 0.8rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		font: inherit;
		text-align: center;
	}

	.quantity-button {
		width: 2.5rem;
		padding: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.scrap-total-card strong {
		font-size: 1.35rem;
	}

	.scrap-confirmation {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		color: #f5f5f5;
		font-size: 0.92rem;
	}

	.scrap-confirmation input {
		margin-top: 0.15rem;
	}

	.modal-close {
		min-height: 1.95rem;
		padding: 0 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	@media (min-width: 980px) {
		.layout-stack {
			grid-template-columns: minmax(0, 1fr) minmax(22rem, 26rem);
		}

		.grid-panel,
		.inventory-panel {
			min-width: 0;
		}

		.inventory-panel {
			position: sticky;
			top: 1.15rem;
			height: calc(100dvh - 6.6rem);
			max-height: calc(100dvh - 6.6rem);
			overflow: hidden;
		}
	}

	@media (max-width: 860px) {
		.mobile-loadout-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			align-items: center;
		}

		.mobile-loadout-actions .save,
		.mobile-loadout-actions .ghost {
			min-height: 2rem;
			padding: 0 0.72rem;
		}

		.inventory-panel {
			position: static;
			height: auto;
			max-height: none;
			overflow: visible;
		}

		.inventory-panel.mobile-item-pane {
			position: fixed;
			top: 50%;
			right: 0.75rem;
			bottom: auto;
			z-index: 35;
			width: min(20rem, calc(100vw - 1.5rem));
			max-height: min(78dvh, 40rem);
			transform: translate3d(calc(100% + 1rem), -50%, 0);
			transition: transform 180ms ease;
			overflow: hidden;
		}

		.inventory-panel.mobile-item-pane.open {
			transform: translate3d(0, -50%, 0);
		}

		.mobile-pane-backdrop {
			position: fixed;
			inset: 0;
			z-index: 34;
			border: 0;
			padding: 0;
			background: rgba(0, 0, 0, 0.42);
		}

		.loadout-toolbar-row,
		.toolbar-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.scrap-modal-head,
		.scrap-actions,
		.scrap-quantity-controls {
			align-items: stretch;
			flex-direction: column;
		}

		.scrap-stats-grid {
			grid-template-columns: 1fr;
		}

		.save,
		.ghost,
		.modal-close,
		.quantity-button {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		.shell {
			padding: 0.55rem;
			gap: 0.55rem;
		}

		.layout-stack,
		.inventory-panel {
			gap: 0.55rem;
		}

		.panel {
			padding: 0.65rem;
			gap: 0.55rem;
		}
	}

	@media (max-width: 480px) {
		.inventory-panel.mobile-item-pane {
			right: 0.5rem;
			width: min(18.5rem, calc(100vw - 1rem));
		}
	}
</style>
