<script lang="ts">
	import { resolve } from '$app/paths';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import { isUtilityDefinition, isWeaponDefinition } from '$lib/data';
	import { getCampaignRouteNotificationCounts } from '$lib/game/notifications';
	import { createBaselineUpgradeablePixlState } from '$lib/game/upgrades';
	import { createCampaignSketch } from '$lib/p5/campaign-1-sketch';
	import type {
		LoadoutItemDefinition,
		LoadoutPlacement,
		UtilityDefinition,
		WeaponDefinition,
		WeaponShape
	} from '$lib/data/types';
	import type { PageProps } from './$types';

	const baselinePixlProgression = createBaselineUpgradeablePixlState();

	interface LoadoutWeapon {
		weaponInstanceId: string;
		definitionId: string;
		category: 'weapon' | 'utility';
		name: string;
		rarity: WeaponDefinition['rarity'];
		shape: WeaponShape;
		baseDamage?: number;
		attack?: WeaponDefinition['attack'];
		activationKind?: UtilityDefinition['activationKind'];
		effectSummary: string;
		role: string;
		x: number;
		y: number;
	}

	interface InventoryWeapon {
		weaponInstanceId: string;
		definitionId: string;
		category: 'weapon' | 'utility';
		name: string;
		rarity: WeaponDefinition['rarity'];
		shape: WeaponShape;
		baseDamage?: number;
		projectileSpeed?: number;
		attack?: WeaponDefinition['attack'];
		projectileVisual?: WeaponDefinition['projectileVisual'];
		activationKind?: UtilityDefinition['activationKind'];
		effectSummary: string;
		role: string;
		x: number | null;
		y: number | null;
		isEquipped: boolean;
	}

	interface InventoryWeaponGroup {
		definitionId: string;
		category: 'weapon' | 'utility';
		name: string;
		rarity: WeaponDefinition['rarity'];
		shape: WeaponShape;
		baseDamage?: number;
		projectileSpeed?: number;
		attack?: WeaponDefinition['attack'];
		projectileVisual?: WeaponDefinition['projectileVisual'];
		activationKind?: UtilityDefinition['activationKind'];
		effectSummary: string;
		role: string;
		totalCount: number;
		availableCount: number;
		equippedCount: number;
		representativeWeaponInstanceId: string | null;
	}

	interface GridCell {
		x: number;
		y: number;
		key: string;
	}

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

	interface LiveCombatProgress {
		stage: number;
		stageLevel: number;
		campaignLevel: number;
		status: 'running' | 'cleared' | 'defeated' | 'complete';
	}

	let { data, form }: PageProps = $props();
	let draggedWeaponInstanceId = $state<string | null>(null);
	let draggedWeaponAnchor = $state<{ x: number; y: number } | null>(null);
	let hoveredGridOrigin = $state<{ x: number; y: number } | null>(null);
	let isInventoryDropTargetActive = $state(false);
	let showSaveWarning = $state(false);
	let saveLoadoutForm = $state<HTMLFormElement | null>(null);
	let pixlStateOverride = $state.raw<PixlStateOverride | null>(null);
	let campaignStateOverride = $state.raw<CampaignStateOverride | null>(null);
	let liveCombatProgressOverride = $state<LiveCombatProgress | null>(null);

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
	let lastSyncedSavedLoadoutPayload = $state(getInitialSavedLoadoutPayload());
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
	let loadoutWeapons = $derived.by(() => {
		const rows: LoadoutWeapon[] = [];

		for (const placement of draftLoadoutPlacements) {
			const ownedWeapon = ownedWeaponByInstanceId[placement.weaponInstanceId];
			const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

			if (!ownedWeapon || !definition) {
				continue;
			}

			rows.push({
				weaponInstanceId: placement.weaponInstanceId,
				definitionId: ownedWeapon.definitionId,
				category: isWeaponDefinition(definition) ? 'weapon' : 'utility',
				name: definition.name,
				rarity: definition.rarity,
				shape: definition.shape,
				baseDamage: isWeaponDefinition(definition) ? definition.baseDamage : undefined,
				attack: isWeaponDefinition(definition) ? definition.attack : undefined,
				activationKind: isUtilityDefinition(definition) ? definition.activationKind : undefined,
				effectSummary: getLoadoutItemEffectSummary(definition),
				role: definition.role,
				x: placement.x,
				y: placement.y
			});
		}

		return rows.sort(
			(left, right) => left.y - right.y || left.x - right.x || left.name.localeCompare(right.name)
		);
	});
	let inventoryWeapons = $derived.by(() => {
		const rows: InventoryWeapon[] = [];

		for (const weapon of ownedWeapons) {
			const definition = weaponDefinitionById[weapon.definitionId];
			const placement = placementByWeaponInstanceId[weapon.instanceId] ?? null;

			if (!definition) {
				continue;
			}

			rows.push({
				weaponInstanceId: weapon.instanceId,
				definitionId: weapon.definitionId,
				category: isWeaponDefinition(definition) ? 'weapon' : 'utility',
				name: definition.name,
				rarity: definition.rarity,
				shape: definition.shape,
				baseDamage: isWeaponDefinition(definition) ? definition.baseDamage : undefined,
				projectileSpeed: isWeaponDefinition(definition) ? definition.projectileSpeed : undefined,
				attack: isWeaponDefinition(definition) ? definition.attack : undefined,
				projectileVisual: isWeaponDefinition(definition) ? definition.projectileVisual : undefined,
				activationKind: isUtilityDefinition(definition) ? definition.activationKind : undefined,
				effectSummary: getLoadoutItemEffectSummary(definition),
				role: definition.role,
				x: placement?.x ?? null,
				y: placement?.y ?? null,
				isEquipped: Boolean(placement)
			});
		}

		return rows.sort(
			(left, right) =>
				Number(right.isEquipped) - Number(left.isEquipped) ||
				left.name.localeCompare(right.name) ||
				left.weaponInstanceId.localeCompare(right.weaponInstanceId)
		);
	});
	let draggedWeaponDefinition = $derived(
		draggedWeaponInstanceId
			? weaponDefinitionById[ownedWeaponByInstanceId[draggedWeaponInstanceId]?.definitionId]
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
	let gridCells = $derived.by(() => {
		const cells: GridCell[] = [];

		for (let y = 0; y < loadoutRowCount; y += 1) {
			for (let x = 0; x < loadoutColumnCount; x += 1) {
				cells.push({ x, y, key: getGridCellKey(x, y) });
			}
		}

		return cells;
	});
	let visiblePlacedWeapons = $derived(loadoutWeapons);
	let previewCellStateByKey = $derived.by(() => {
		const preview: Record<string, 'valid' | 'invalid'> = {};

		if (!draggedWeaponInstanceId || !draggedWeaponDefinition || !hoveredGridOrigin) {
			return preview;
		}

		const isValid = canPlaceWeaponAt(
			draggedWeaponInstanceId,
			hoveredGridOrigin.x,
			hoveredGridOrigin.y
		);

		for (const [shapeX, shapeY] of draggedWeaponDefinition.shape.cells) {
			const gridX = hoveredGridOrigin.x + shapeX;
			const gridY = hoveredGridOrigin.y + shapeY;

			if (gridX >= 0 && gridX < loadoutColumnCount && gridY >= 0 && gridY < loadoutRowCount) {
				preview[getGridCellKey(gridX, gridY)] = isValid ? 'valid' : 'invalid';
			}
		}

		return preview;
	});
	let loadoutTooltip = $derived(
		loadoutWeapons.map((weapon) => `${weapon.name} (${weapon.x}, ${weapon.y})`).join('\n') ||
			'No equipped items'
	);
	let notificationCounts = $derived(
		getCampaignRouteNotificationCounts(livePixlState ?? data.gameState?.pixlState ?? null)
	);
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
		`${data.campaignId}:${savedLoadoutPayload}:${data.campaignState?.currentLevel ?? 1}`
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
	let inventoryWeaponGroups = $derived.by(() => {
		const groups: Record<string, InventoryWeaponGroup> = {};

		for (const weapon of inventoryWeapons) {
			const existing = groups[weapon.definitionId];

			if (!existing) {
				groups[weapon.definitionId] = {
					definitionId: weapon.definitionId,
					category: weapon.category,
					name: weapon.name,
					rarity: weapon.rarity,
					shape: weapon.shape,
					baseDamage: weapon.baseDamage,
					projectileSpeed: weapon.projectileSpeed,
					attack: weapon.attack,
					projectileVisual: weapon.projectileVisual,
					role: weapon.role,
					totalCount: 1,
					availableCount: weapon.isEquipped ? 0 : 1,
					equippedCount: weapon.isEquipped ? 1 : 0,
					representativeWeaponInstanceId: weapon.isEquipped ? null : weapon.weaponInstanceId
				};
				continue;
			}

			existing.totalCount += 1;

			if (weapon.isEquipped) {
				existing.equippedCount += 1;
			} else {
				existing.availableCount += 1;

				if (!existing.representativeWeaponInstanceId) {
					existing.representativeWeaponInstanceId = weapon.weaponInstanceId;
				}
			}
		}

		return Object.values(groups).sort(
			(left, right) =>
				Number(left.category === 'utility') - Number(right.category === 'utility') ||
				right.availableCount - left.availableCount ||
				right.totalCount - left.totalCount ||
				left.name.localeCompare(right.name)
		);
	});

	function getGridCellKey(x: number, y: number) {
		return `${x}:${y}`;
	}

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}

	function cloneLoadoutPlacements(placements: LoadoutPlacement[]) {
		return placements.map((placement) => ({ ...placement }));
	}

	function getInitialLoadoutPlacements() {
		return cloneLoadoutPlacements(data.gameState?.pixlState.loadoutPlacements ?? []);
	}

	function getInitialSavedLoadoutPayload() {
		return JSON.stringify(data.gameState?.pixlState.loadoutPlacements ?? []);
	}

	function isShapeCellFilled(shape: WeaponShape, x: number, y: number) {
		return shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);
	}

	function isLabelCell(shape: WeaponShape, x: number, y: number) {
		const [labelX, labelY] = shape.cells[0] ?? [0, 0];
		return labelX === x && labelY === y;
	}

	function getWeaponGridArea(weapon: { x: number; y: number; shape: WeaponShape }) {
		return `grid-column: ${weapon.x + 1} / span ${weapon.shape.width}; grid-row: ${weapon.y + 1} / span ${weapon.shape.height};`;
	}

	function getShapeGridTemplate(shape: WeaponShape) {
		return `grid-template-columns: repeat(${shape.width}, minmax(0, 1fr)); grid-template-rows: repeat(${shape.height}, minmax(0, 1fr));`;
	}

	function getDefaultDragAnchor(shape: WeaponShape) {
		let topLeftCell = shape.cells[0] ?? [0, 0];

		for (const cell of shape.cells) {
			if (cell[1] < topLeftCell[1] || (cell[1] === topLeftCell[1] && cell[0] < topLeftCell[0])) {
				topLeftCell = cell;
			}
		}

		return { x: topLeftCell[0], y: topLeftCell[1] };
	}

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function getPlacedWeaponDragAnchor(event: DragEvent, shape: WeaponShape) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLElement)) {
			return getDefaultDragAnchor(shape);
		}

		const rect = target.getBoundingClientRect();

		if (!rect.width || !rect.height) {
			return getDefaultDragAnchor(shape);
		}

		const localX = clamp(event.clientX - rect.left, 0, rect.width - 1);
		const localY = clamp(event.clientY - rect.top, 0, rect.height - 1);
		const anchorX = clamp(Math.floor((localX / rect.width) * shape.width), 0, shape.width - 1);
		const anchorY = clamp(Math.floor((localY / rect.height) * shape.height), 0, shape.height - 1);

		return { x: anchorX, y: anchorY };
	}

	function getDragAnchorFromGrid(
		event: DragEvent,
		shape: WeaponShape,
		gridElement: HTMLElement,
		fallback: { x: number; y: number }
	) {
		const rect = gridElement.getBoundingClientRect();

		if (!rect.width || !rect.height) {
			return fallback;
		}

		const isInsideGrid =
			event.clientX >= rect.left &&
			event.clientX <= rect.right &&
			event.clientY >= rect.top &&
			event.clientY <= rect.bottom;

		if (!isInsideGrid) {
			return fallback;
		}

		const localX = clamp(event.clientX - rect.left, 0, rect.width - 1);
		const localY = clamp(event.clientY - rect.top, 0, rect.height - 1);
		const anchorX = clamp(Math.floor((localX / rect.width) * shape.width), 0, shape.width - 1);
		const anchorY = clamp(Math.floor((localY / rect.height) * shape.height), 0, shape.height - 1);

		return { x: anchorX, y: anchorY };
	}

	function setShapeGridDragImage(
		event: DragEvent,
		shape: WeaponShape,
		gridElement: HTMLElement,
		anchor: { x: number; y: number }
	) {
		if (!event.dataTransfer) {
			return;
		}

		const cellIndex = anchor.y * shape.width + anchor.x;
		const anchorCell = gridElement.children.item(cellIndex);

		if (!(anchorCell instanceof HTMLElement)) {
			return;
		}

		const gridRect = gridElement.getBoundingClientRect();
		const cellRect = anchorCell.getBoundingClientRect();
		const hotspotX = cellRect.left - gridRect.left + cellRect.width / 2;
		const hotspotY = cellRect.top - gridRect.top + cellRect.height / 2;

		event.dataTransfer.setDragImage(gridElement, hotspotX, hotspotY);
	}

	$effect(() => {
		const nextSavedLoadoutPayload = savedLoadoutPayload;

		if (nextSavedLoadoutPayload === lastSyncedSavedLoadoutPayload) {
			return;
		}

		draftLoadoutPlacements = cloneLoadoutPlacements(savedLoadoutPlacements);
		lastSyncedSavedLoadoutPayload = nextSavedLoadoutPayload;
		clearDragState();
	});

	$effect(() => {
		void data.campaignId;
		void data.gameState?.pixlState;
		void data.campaignState;

		pixlStateOverride = null;
		campaignStateOverride = null;
		liveCombatProgressOverride = null;
		showSaveWarning = false;
	});

	function clearDragState() {
		draggedWeaponInstanceId = null;
		draggedWeaponAnchor = null;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
	}

	function getGridCellFromPoint(event: DragEvent): GridCell | null {
		for (const element of document.elementsFromPoint(event.clientX, event.clientY)) {
			if (!(element instanceof HTMLElement) || !element.classList.contains('grid-cell')) {
				continue;
			}

			const x = Number(element.dataset.gridX);
			const y = Number(element.dataset.gridY);

			if (!Number.isInteger(x) || !Number.isInteger(y)) {
				continue;
			}

			return { x, y, key: getGridCellKey(x, y) };
		}

		return null;
	}

	function isPointWithinElementBounds(element: HTMLElement, x: number, y: number) {
		const rect = element.getBoundingClientRect();

		return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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

	function canPlaceWeaponAt(weaponInstanceId: string, x: number, y: number) {
		const ownedWeapon = ownedWeaponByInstanceId[weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!definition) {
			return false;
		}

		if (hasLegendaryPlacementConflict(weaponInstanceId)) {
			return false;
		}

		return definition.shape.cells.every(([shapeX, shapeY]) => {
			const gridX = x + shapeX;
			const gridY = y + shapeY;

			return (
				gridX >= 0 &&
				gridX < loadoutColumnCount &&
				gridY >= 0 &&
				gridY < loadoutRowCount &&
				!occupiedCellKeys[getGridCellKey(gridX, gridY)]
			);
		});
	}

	function placeWeaponAt(weaponInstanceId: string, x: number, y: number) {
		if (!canPlaceWeaponAt(weaponInstanceId, x, y)) {
			return;
		}

		draftLoadoutPlacements = [
			...draftLoadoutPlacements.filter(
				(placement) => placement.weaponInstanceId !== weaponInstanceId
			),
			{ weaponInstanceId, x, y } satisfies LoadoutPlacement
		];
		clearDragState();
	}

	function removeDraftPlacement(weaponInstanceId: string) {
		draftLoadoutPlacements = draftLoadoutPlacements.filter(
			(placement) => placement.weaponInstanceId !== weaponInstanceId
		);
		clearDragState();
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
		event: DragEvent,
		weaponInstanceId: string,
		anchor: { x: number; y: number }
	) {
		draggedWeaponInstanceId = weaponInstanceId;
		draggedWeaponAnchor = anchor;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
		event.dataTransfer?.setData('text/plain', weaponInstanceId);

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function scrollLoadoutGridIntoView() {
		document.getElementById('loadout-grid-shell')?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest'
		});
	}

	function handleGridDragOver(event: DragEvent, cell: GridCell) {
		if (!draggedWeaponInstanceId) {
			return;
		}

		event.preventDefault();
		const anchor = draggedWeaponAnchor ?? { x: 0, y: 0 };
		const nextOrigin = { x: cell.x - anchor.x, y: cell.y - anchor.y };
		hoveredGridOrigin = nextOrigin;
		isInventoryDropTargetActive = false;

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = canPlaceWeaponAt(
				draggedWeaponInstanceId,
				nextOrigin.x,
				nextOrigin.y
			)
				? 'move'
				: 'none';
		}
	}

	function handleGridDrop(event: DragEvent, cell: GridCell) {
		if (!draggedWeaponInstanceId) {
			return;
		}

		event.preventDefault();
		const anchor = draggedWeaponAnchor ?? { x: 0, y: 0 };
		placeWeaponAt(draggedWeaponInstanceId, cell.x - anchor.x, cell.y - anchor.y);
	}

	function handleInventoryDragOver(event: DragEvent) {
		if (!draggedWeaponInstanceId || !draggedInventoryWeapon?.isEquipped) {
			return;
		}

		event.preventDefault();
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = true;

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleInventoryDragLeave() {
		isInventoryDropTargetActive = false;
	}

	function handleInventoryDrop(event: DragEvent) {
		if (!draggedWeaponInstanceId || !draggedInventoryWeapon?.isEquipped) {
			return;
		}

		event.preventDefault();
		removeDraftPlacement(draggedWeaponInstanceId);
	}

	function handleWeaponDragEnd(event: DragEvent) {
		const loadoutGridShell = document.getElementById('loadout-grid-shell');

		if (
			draggedWeaponInstanceId &&
			draggedInventoryWeapon?.isEquipped &&
			loadoutGridShell instanceof HTMLElement &&
			!isPointWithinElementBounds(loadoutGridShell, event.clientX, event.clientY)
		) {
			removeDraftPlacement(draggedWeaponInstanceId);
			return;
		}

		clearDragState();
	}

	function beginPlacedWeaponDrag(event: DragEvent, weapon: LoadoutWeapon) {
		beginWeaponDrag(event, weapon.weaponInstanceId, getPlacedWeaponDragAnchor(event, weapon.shape));
	}

	function handlePlacedWeaponDragOver(event: DragEvent) {
		const cell = getGridCellFromPoint(event);

		if (!cell) {
			return;
		}

		handleGridDragOver(event, cell);
	}

	function handlePlacedWeaponDrop(event: DragEvent) {
		const cell = getGridCellFromPoint(event);

		if (!cell) {
			return;
		}

		handleGridDrop(event, cell);
	}

	function beginInventoryWeaponDrag(event: DragEvent, weapon: InventoryWeapon) {
		const target = event.currentTarget;
		const defaultAnchor = getDefaultDragAnchor(weapon.shape);
		let anchor = defaultAnchor;

		if (target instanceof HTMLElement) {
			const shapeGrid = target.querySelector('.inventory-shape-grid');

			if (shapeGrid instanceof HTMLElement) {
				anchor = getDragAnchorFromGrid(event, weapon.shape, shapeGrid, defaultAnchor);
				setShapeGridDragImage(event, weapon.shape, shapeGrid, anchor);
			}
		}

		scrollLoadoutGridIntoView();
		beginWeaponDrag(event, weapon.weaponInstanceId, anchor);
	}

	function beginInventoryWeaponGroupDrag(event: DragEvent, group: InventoryWeaponGroup) {
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

	function formatInventoryGroupStatus(group: InventoryWeaponGroup) {
		if (!group.availableCount) {
			return group.equippedCount ? `All ${group.totalCount} equipped` : `${group.totalCount} owned`;
		}

		if (!group.equippedCount) {
			return `${group.availableCount} ready`;
		}

		return `${group.availableCount} ready, ${group.equippedCount} equipped`;
	}

	function getWeaponCycleRate(weapon: Pick<LoadoutWeapon, 'attack'>) {
		if (!weapon.attack) {
			return 0;
		}

		return 1 / Math.max(1, weapon.attack.cycleInterval ?? 1);
	}

	function getLoadoutItemEffectSummary(definition: LoadoutItemDefinition) {
		if (isWeaponDefinition(definition)) {
			return formatAttackLabel(definition.attack.kind);
		}

		switch (definition.effect.type) {
			case 'shield-pool':
				return `Shield ${definition.effect.shieldAmount} for ${definition.effect.durationCycles} cycles`;
			case 'cycle-adjacency-reduction':
				return `Adjacent weapons activate ${definition.effect.reduction} cycle faster`;
			case 'cycle-damage-boost':
				return `${definition.effect.damageMultiplier}x damage next cycle`;
		}
	}

	function formatActivationLabel(
		weapon: Pick<InventoryWeaponGroup, 'category' | 'attack' | 'activationKind'>
	) {
		if (weapon.category === 'weapon') {
			return weapon.attack ? formatCycleThreshold(weapon.attack) : '1';
		}

		return weapon.activationKind === 'passive' ? 'Passive' : 'Triggered';
	}

	function formatCycleThreshold(attack: WeaponDefinition['attack']) {
		const cycleInterval = Math.max(1, attack.cycleInterval ?? 1);

		return cycleInterval.toString();
	}

	function formatAttackLabel(kind: WeaponDefinition['attack']['kind']) {
		switch (kind) {
			case 'single':
				return 'Single shot';
			case 'dual':
				return 'Dual shot';
			case 'spread':
				return 'Spread shot';
			default:
				return kind;
		}
	}

	function formatRarityLabel(rarity: WeaponDefinition['rarity']) {
		return `${rarity.slice(0, 1).toUpperCase()}${rarity.slice(1)}`;
	}

	function formatCycleAverage(value: number) {
		return Number.isInteger(value)
			? value.toString()
			: value.toLocaleString(undefined, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 2
				});
	}
</script>

<svelte:head>
	<title>Loadout | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	{#if hiddenSketchPixlState && (liveCampaignState ?? data.campaignState)}
		<div class="loadout-live-sketch-shell" aria-hidden="true">
			{#key backgroundSketchRemountKey}
				<P5Canvas class="loadout-live-sketch" sketch={backgroundCampaignSketch} />
			{/key}
		</div>
	{/if}

	<div class="shell">
		<div class="topbar">
			<a class="back" href={resolve('/campaigns')}>All campaigns</a>
			<CampaignRouteNav
				campaignId={data.campaignId}
				active="loadout"
				{loadoutTooltip}
				{notificationCounts}
			/>
		</div>

		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Loadout</h1>
			<p class="lede">
				Every item keeps its exact shape. If the shape fits inside the {loadoutRowCount} x {loadoutColumnCount}
				grid without overlapping another item, it can be equipped.
			</p>
			<p class="live-run-label">
				Pixl level {progressionState.level} · {progressionState.perkPoints} perk {progressionState.perkPoints ===
				1
					? 'point'
					: 'points'} · Loadout {loadoutRowCount} x {loadoutColumnCount}
			</p>
			<p class="live-run-label">
				Run continues here: Stage {liveRunStage} · Level {liveRunStageLevel} · Campaign level {liveRunCampaignLevel}
			</p>
		</section>

		<section class="layout-stack">
			<div class="panel grid-panel">
				<div class="section-head section-head-split">
					<div>
						<h2>Loadout grid</h2>
						<p>
							Drag an item from inventory into the grid, drag placed items to reposition, or drag
							them back out to unequip.
						</p>
					</div>
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
				</div>

				{#if form?.loadoutError}
					<p class="feedback error">{form.loadoutError}</p>
				{:else if form?.loadoutSuccess}
					<p class="feedback success">{form.loadoutSuccess}</p>
				{:else if hasUnsavedChanges}
					<p class="feedback neutral">You have unsaved loadout changes.</p>
				{/if}

				<div class="draft-actions">
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

				<div class="loadout-summary-strip" aria-label="Equipped loadout cycle summary">
					<div class="loadout-summary-card">
						<span>Run state</span>
						<strong>Stage {liveRunStage} · {liveRunStageLevel}</strong>
						<small>{liveRunStatus === 'running' ? 'Live run active' : `Run ${liveRunStatus}`}</small
						>
					</div>
					<div class="loadout-summary-card">
						<span>Damage / cycle</span>
						<strong>{formatCycleAverage(equippedDamagePerCycle)}</strong>
					</div>
					<div class="loadout-summary-card">
						<span>Projectiles / cycle</span>
						<strong>{formatCycleAverage(equippedProjectilesPerCycle)}</strong>
					</div>
					<div class="loadout-summary-card">
						<span>Items equipped</span>
						<strong>{loadoutWeapons.length}</strong>
					</div>
				</div>

				{#if showSaveWarning}
					<button
						class="save-warning-backdrop"
						type="button"
						aria-label="Cancel loadout save"
						onclick={cancelLoadoutSave}
					></button>
					<div
						class="save-warning-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="save-warning-title"
					>
						<h3 id="save-warning-title">Apply new loadout?</h3>
						<p>
							The campaign keeps running while you are on this screen. Saving a new loadout will
							apply the changes and restart the current level from the beginning.
						</p>
						<p class="save-warning-meta">
							Current run: Stage {liveRunStage} · Level {liveRunStageLevel} · Campaign level {liveRunCampaignLevel}
						</p>
						<div class="save-warning-actions">
							<button class="ghost" type="button" onclick={cancelLoadoutSave}>Cancel</button>
							<button class="save" type="button" onclick={confirmLoadoutSave}
								>Save and restart level</button
							>
						</div>
					</div>
				{/if}

				{#if draggedWeaponDefinition}
					<div class="weapon-shape-preview centered-preview">
						<div
							class="shape-grid"
							style:grid-template-columns={`repeat(${draggedWeaponDefinition.shape.width}, 1fr)`}
						>
							{#each createIndexArray(draggedWeaponDefinition.shape.height) as shapeY (shapeY)}
								{#each createIndexArray(draggedWeaponDefinition.shape.width) as shapeX (shapeX)}
									<div
										class="shape-cell"
										class:filled={isShapeCellFilled(draggedWeaponDefinition.shape, shapeX, shapeY)}
									></div>
								{/each}
							{/each}
						</div>
						<p class="weapon-role">{draggedWeaponDefinition.role}</p>
					</div>
				{/if}

				<div class="loadout-grid-shell" id="loadout-grid-shell">
					<div
						class="loadout-grid main-loadout-grid"
						style:grid-template-columns={loadoutGridTemplateColumns}
						style:grid-template-rows={loadoutGridTemplateRows}
					>
						{#each gridCells as cell (cell.key)}
							<div
								class="grid-cell"
								data-grid-x={cell.x}
								data-grid-y={cell.y}
								role="gridcell"
								tabindex="-1"
								aria-label={`Loadout cell ${cell.x}, ${cell.y}`}
								class:occupied={occupiedCellKeys[cell.key] && !previewCellStateByKey[cell.key]}
								class:preview-valid={previewCellStateByKey[cell.key] === 'valid'}
								class:preview-invalid={previewCellStateByKey[cell.key] === 'invalid'}
								ondragover={(event) => handleGridDragOver(event, cell)}
								ondrop={(event) => handleGridDrop(event, cell)}
							></div>
						{/each}
					</div>

					<div
						class="placed-weapons-layer"
						style:grid-template-columns={loadoutGridTemplateColumns}
						style:grid-template-rows={loadoutGridTemplateRows}
					>
						{#each visiblePlacedWeapons as weapon (weapon.weaponInstanceId)}
							<button
								class={`placed-weapon rarity-${weapon.rarity}`}
								type="button"
								draggable="true"
								class:dragging={draggedWeaponInstanceId === weapon.weaponInstanceId}
								style={getWeaponGridArea(weapon)}
								ondragover={handlePlacedWeaponDragOver}
								ondrop={handlePlacedWeaponDrop}
								ondragstart={(event) => beginPlacedWeaponDrag(event, weapon)}
								ondragend={handleWeaponDragEnd}
								title={`${weapon.name} at ${weapon.x}, ${weapon.y}`}
							>
								<div class="placed-weapon-shape" style={getShapeGridTemplate(weapon.shape)}>
									{#each createIndexArray(weapon.shape.height) as shapeY (`${weapon.weaponInstanceId}:${shapeY}`)}
										{#each createIndexArray(weapon.shape.width) as shapeX (`${weapon.weaponInstanceId}:${shapeY}:${shapeX}`)}
											{@const isFilled = isShapeCellFilled(weapon.shape, shapeX, shapeY)}
											<div
												class="placed-weapon-cell"
												class:filled={isFilled}
												aria-hidden={!isFilled}
											>
												{#if isLabelCell(weapon.shape, shapeX, shapeY)}
													<span>{weapon.name.slice(0, 2).toUpperCase()}</span>
												{/if}
											</div>
										{/each}
									{/each}
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="panel inventory-panel">
				<div class="section-head">
					<h2>Loadout toolbox</h2>
					<p>
						Acquired weapons and utilities sit in a structured toolbox under the loadout. Drag any
						ready copy into the grid to equip it, or drag equipped items back here to unequip.
					</p>
				</div>

				<div
					class="inventory-drop-zone"
					class:drop-target={isInventoryDropTargetActive}
					role="button"
					tabindex="0"
					aria-label="Drag equipped weapons here to unequip them"
					aria-label="Drag equipped items here to unequip them"
					ondragover={handleInventoryDragOver}
					ondragleave={handleInventoryDragLeave}
					ondrop={handleInventoryDrop}
				>
					<div class="inventory-scroll">
						<div class="inventory-toolbox-grid">
							{#each inventoryWeaponGroups as group (group.definitionId)}
								<button
									class={`inventory-weapon inventory-toolbox-item rarity-${group.rarity}`}
									type="button"
									draggable={group.availableCount > 0}
									disabled={group.availableCount < 1}
									class:equipped={group.equippedCount > 0}
									class:unavailable={group.availableCount < 1}
									class:dragging={draggedWeaponInstanceId === group.representativeWeaponInstanceId}
									ondragstart={(event) => beginInventoryWeaponGroupDrag(event, group)}
									ondragend={handleWeaponDragEnd}
								>
									{#if group.totalCount > 1}
										<span class="inventory-count-badge">{group.totalCount}</span>
									{/if}

									<div class="inventory-toolbox-head">
										<div>
											<strong>{group.name}</strong>
											<p class="weapon-role">{group.role}</p>
										</div>
										<span class="inventory-status">{formatInventoryGroupStatus(group)}</span>
									</div>

									<div
										class="shape-grid inventory-shape-grid"
										style:grid-template-columns={`repeat(${group.shape.width}, 1fr)`}
									>
										{#each createIndexArray(group.shape.height) as shapeY (`inventory:${group.definitionId}:${shapeY}`)}
											{#each createIndexArray(group.shape.width) as shapeX (`inventory:${group.definitionId}:${shapeY}:${shapeX}`)}
												<div
													class="shape-cell"
													class:filled={isShapeCellFilled(group.shape, shapeX, shapeY)}
												></div>
											{/each}
										{/each}
									</div>

									<div class="inventory-tooltip" aria-hidden="true">
										<div class="inventory-tooltip-header">
											<div>
												<strong>{group.name}</strong>
												<p>{formatRarityLabel(group.rarity)}</p>
											</div>
											<span>{group.shape.cells.length} cells</span>
										</div>

										<div class="inventory-tooltip-stats">
											<div>
												<span>Category</span>
												<strong>{group.category === 'weapon' ? 'Weapon' : 'Utility'}</strong>
											</div>
											<div>
												<span>Activation</span>
												<strong>{formatActivationLabel(group)}</strong>
											</div>
											<div>
												<span>Effect</span>
												<strong>{group.effectSummary}</strong>
											</div>
											<div>
												<span>Shape</span>
												<strong>{group.shape.width} x {group.shape.height}</strong>
											</div>
											{#if group.category === 'weapon' && group.baseDamage && group.attack}
												<div>
													<span>Damage</span>
													<strong>{group.baseDamage}</strong>
												</div>
												<div>
													<span>Pattern</span>
													<strong>{formatAttackLabel(group.attack.kind)}</strong>
												</div>
												<div>
													<span>Projectiles</span>
													<strong>{group.attack.projectileCount}</strong>
												</div>
												{#if group.projectileSpeed}
													<div>
														<span>Projectile</span>
														<strong>{group.projectileSpeed}</strong>
													</div>
												{/if}
												{#if group.projectileVisual}
													<div>
														<span>Payload</span>
														<strong>{group.projectileVisual.size}</strong>
													</div>
												{/if}
											{/if}
										</div>

										{#if group.category === 'weapon' && group.attack?.spreadDegrees}
											<p class="inventory-tooltip-note">
												Spread: {group.attack.spreadDegrees} degrees
											</p>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
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

	.loadout-live-sketch {
		width: 1px;
		height: 1px;
	}

	.shell {
		max-width: 1160px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		gap: 1rem;
	}

	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.panel,
	.back,
	.feedback,
	.save,
	.ghost,
	.inventory-weapon {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.back {
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

	.section-head-split,
	.draft-actions,
	.inventory-toolbox-head {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: center;
	}

	.section-head-split {
		align-items: start;
		flex-wrap: wrap;
	}

	.draft-actions {
		justify-content: flex-end;
	}

	.hero h1,
	.section-head h2 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow,
	.section-head p,
	.inventory-status {
		letter-spacing: 0.12em;
	}

	.eyebrow {
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p,
	.weapon-role {
		margin: 0;
		color: #c4c4c4;
	}

	.live-run-label {
		font-size: 0.88rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #d7d7dc;
	}

	.layout-stack {
		display: grid;
		gap: 1rem;
	}

	.loadout-summary-strip {
		width: min(100%, 58rem);
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.loadout-summary-card {
		padding: 0.85rem 0.95rem;
		border-radius: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.3rem;
	}

	.loadout-summary-card span {
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #bdbdc3;
	}

	.loadout-summary-card strong {
		font-size: 1.45rem;
		line-height: 1;
	}

	.loadout-summary-card small {
		font-size: 0.78rem;
		color: #c4c4ca;
	}

	.save-warning-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.62);
		z-index: 19;
	}

	.save-warning-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(32rem, calc(100vw - 2rem));
		padding: 1.1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(10, 10, 12, 0.98);
		box-shadow: 0 28px 72px rgba(0, 0, 0, 0.5);
		display: grid;
		gap: 0.8rem;
		z-index: 20;
	}

	.save-warning-modal h3,
	.save-warning-modal p {
		margin: 0;
	}

	.save-warning-meta {
		font-size: 0.84rem;
		color: #d3d3d8;
	}

	.save-warning-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.grid-panel {
		justify-items: center;
	}

	.inventory-panel {
		gap: 0.9rem;
	}

	.save,
	.ghost {
		min-height: 2.2rem;
		padding: 0 0.9rem;
		color: #f5f5f5;
		font: inherit;
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

	.shape-grid,
	.loadout-grid,
	.placed-weapons-layer,
	.placed-weapon-shape {
		display: grid;
		gap: 0.35rem;
	}

	.shape-grid {
		width: fit-content;
	}

	.shape-cell,
	.grid-cell,
	.placed-weapon-cell {
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		box-sizing: border-box;
	}

	.shape-cell,
	.grid-cell {
		aspect-ratio: 1;
	}

	.shape-cell.filled,
	.placed-weapon-cell.filled {
		background: rgba(255, 255, 255, 0.14);
	}

	.loadout-grid-shell {
		position: relative;
		width: min(100%, 58rem);
		margin: 0 auto;
		--board-gap: 0.35rem;
	}

	.main-loadout-grid,
	.placed-weapons-layer {
		gap: var(--board-gap);
		grid-auto-rows: minmax(4.9rem, 1fr);
	}

	.placed-weapons-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.grid-cell,
	.placed-weapon-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #f5f5f5;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.grid-cell {
		background: rgba(255, 255, 255, 0.03);
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	.grid-cell.occupied {
		background: transparent;
		border-color: transparent;
		box-shadow: none;
	}

	.grid-cell.preview-valid {
		background: rgba(103, 217, 111, 0.18);
		border-color: rgba(103, 217, 111, 0.7);
		box-shadow: inset 0 0 0 1px rgba(103, 217, 111, 0.25);
	}

	.grid-cell.preview-invalid {
		background: rgba(255, 96, 96, 0.15);
		border-color: rgba(255, 96, 96, 0.52);
		box-shadow: inset 0 0 0 1px rgba(255, 96, 96, 0.15);
	}

	.placed-weapon,
	.inventory-weapon {
		color: #f5f5f5;
		cursor: grab;
	}

	.placed-weapon {
		position: relative;
		display: block;
		pointer-events: auto;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
		appearance: none;
		-webkit-appearance: none;
	}

	.placed-weapon::after {
		content: '';
		position: absolute;
		inset: -0.42rem;
		border: 4px solid var(--weapon-outline-stroke, rgba(245, 245, 245, 0.9));
		border-radius: 1.2rem;
		pointer-events: none;
	}

	.placed-weapon-shape {
		width: 100%;
		height: 100%;
	}

	.placed-weapon-cell {
		border-radius: 0.6rem;
		border-color: transparent;
		background: transparent;
		pointer-events: none;
	}

	.placed-weapon-cell.filled {
		background: var(--weapon-fill-color, rgba(64, 64, 64, 0.94));
		border: 2px solid var(--weapon-border-color, rgba(255, 255, 255, 0.96));
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.16),
			0 0 0 1px rgba(0, 0, 0, 0.82);
	}

	.inventory-weapon {
		width: 100%;
		padding: 0.9rem;
		display: grid;
		gap: 0.85rem;
		text-align: left;
		font: inherit;
		position: relative;
	}

	.inventory-weapon.equipped {
		border-color: rgba(103, 217, 111, 0.3);
		background: rgba(103, 217, 111, 0.08);
	}

	.inventory-weapon.unavailable {
		opacity: 0.72;
		cursor: default;
	}

	.inventory-status {
		font-size: 0.72rem;
		text-transform: uppercase;
		color: #d6d6d6;
	}

	.inventory-toolbox-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.85rem;
	}

	.inventory-toolbox-item {
		min-height: 11rem;
		align-content: start;
		overflow: visible;
		isolation: isolate;
		z-index: 0;
	}

	.inventory-toolbox-item:hover,
	.inventory-toolbox-item:focus-visible {
		z-index: 6;
	}

	.inventory-count-badge {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		min-width: 1.7rem;
		height: 1.7rem;
		padding: 0 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.22);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1;
	}

	.inventory-shape-grid {
		justify-self: start;
		padding: 0.2rem;
	}

	.inventory-weapon .shape-cell.filled {
		background: var(--inventory-fill-color, rgba(255, 255, 255, 0.18));
		border-color: var(--inventory-border-color, rgba(255, 255, 255, 0.52));
	}

	.inventory-toolbox-head strong {
		display: block;
		padding-right: 2.2rem;
	}

	.inventory-tooltip {
		position: absolute;
		top: 0.55rem;
		left: 0.55rem;
		right: 0.55rem;
		border-radius: 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(12, 12, 14, 0.96);
		backdrop-filter: blur(8px);
		padding: 0.8rem;
		display: grid;
		gap: 0.65rem;
		align-content: start;
		opacity: 0;
		transform: translateY(0.3rem);
		transition:
			opacity 140ms ease,
			transform 140ms ease;
		pointer-events: none;
		z-index: 2;
		box-shadow: 0 20px 44px rgba(0, 0, 0, 0.42);
	}

	.inventory-weapon:hover .inventory-tooltip,
	.inventory-weapon:focus-visible .inventory-tooltip {
		opacity: 1;
		transform: translateY(0);
	}

	.inventory-tooltip-header,
	.inventory-tooltip-stats,
	.inventory-tooltip-stats div {
		display: grid;
	}

	.inventory-tooltip-header {
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: start;
	}

	.inventory-tooltip-header strong,
	.inventory-tooltip-stats strong {
		color: #f5f5f5;
	}

	.inventory-tooltip-header p,
	.inventory-tooltip-note,
	.inventory-tooltip-stats span {
		margin: 0;
		color: #c9c9cf;
	}

	.inventory-tooltip-header span,
	.inventory-tooltip-stats span {
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.inventory-tooltip-stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.6rem;
	}

	.inventory-tooltip-stats div {
		gap: 0.25rem;
		padding: 0.45rem 0.5rem;
		border-radius: 0.7rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.inventory-tooltip-note {
		font-size: 0.78rem;
	}

	.dragging {
		opacity: 0.5;
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

	.centered-preview {
		justify-items: center;
		text-align: center;
	}

	.inventory-drop-zone {
		border-radius: 1rem;
		border: 1px dashed rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.02);
		padding: 0.5rem;
		transition:
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.inventory-drop-zone.drop-target {
		border-color: rgba(255, 96, 96, 0.78);
		background: rgba(255, 96, 96, 0.08);
	}

	.inventory-scroll {
		max-height: 20rem;
		overflow-y: auto;
		padding-bottom: 10rem;
		padding-right: 0.25rem;
	}

	.placed-weapon.rarity-normal,
	.inventory-weapon.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
	}

	.placed-weapon.rarity-normal,
	.inventory-weapon.rarity-normal {
		--weapon-fill-color: rgba(122, 128, 138, 0.94);
		--weapon-border-color: rgba(240, 244, 248, 0.98);
		--weapon-outline-stroke: rgba(240, 244, 248, 0.98);
		--inventory-fill-color: rgba(122, 128, 138, 0.86);
		--inventory-border-color: rgba(240, 244, 248, 0.9);
	}

	.placed-weapon.rarity-magic,
	.inventory-weapon.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
	}

	.placed-weapon.rarity-magic,
	.inventory-weapon.rarity-magic {
		--weapon-fill-color: rgba(54, 101, 196, 0.95);
		--weapon-border-color: rgba(170, 206, 255, 0.98);
		--weapon-outline-stroke: rgba(170, 206, 255, 0.98);
		--inventory-fill-color: rgba(54, 101, 196, 0.86);
		--inventory-border-color: rgba(170, 206, 255, 0.92);
	}

	.placed-weapon.rarity-rare,
	.inventory-weapon.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
	}

	.placed-weapon.rarity-rare,
	.inventory-weapon.rarity-rare {
		--weapon-fill-color: rgba(191, 139, 30, 0.96);
		--weapon-border-color: rgba(255, 232, 153, 0.98);
		--weapon-outline-stroke: rgba(255, 232, 153, 0.98);
		--inventory-fill-color: rgba(191, 139, 30, 0.88);
		--inventory-border-color: rgba(255, 232, 153, 0.92);
	}

	.placed-weapon.rarity-exotic,
	.inventory-weapon.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
	}

	.placed-weapon.rarity-exotic,
	.inventory-weapon.rarity-exotic {
		--weapon-fill-color: rgba(177, 49, 49, 0.96);
		--weapon-border-color: rgba(255, 170, 170, 0.98);
		--weapon-outline-stroke: rgba(255, 170, 170, 0.98);
		--inventory-fill-color: rgba(177, 49, 49, 0.88);
		--inventory-border-color: rgba(255, 170, 170, 0.92);
	}

	.placed-weapon.rarity-legendary,
	.inventory-weapon.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
	}

	.placed-weapon.rarity-legendary,
	.inventory-weapon.rarity-legendary {
		--weapon-fill-color: rgba(123, 72, 28, 0.97);
		--weapon-border-color: rgba(224, 156, 92, 0.98);
		--weapon-outline-stroke: rgba(224, 156, 92, 0.98);
		--inventory-fill-color: rgba(123, 72, 28, 0.9);
		--inventory-border-color: rgba(224, 156, 92, 0.94);
	}

	@media (max-width: 860px) {
		.loadout-summary-strip {
			grid-template-columns: 1fr;
		}

		.save,
		.ghost {
			width: 100%;
		}

		.inventory-toolbox-head,
		.section-head-split {
			align-items: start;
			flex-direction: column;
		}

		.main-loadout-grid,
		.placed-weapons-layer {
			grid-auto-rows: minmax(3.5rem, 1fr);
		}
	}
</style>
