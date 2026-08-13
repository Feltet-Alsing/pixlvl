<script lang="ts">
	import LoadoutDraggedShapePreview from '$lib/components/campaigns/LoadoutDraggedShapePreview.svelte';
	import LoadoutGridBoard from '$lib/components/campaigns/LoadoutGridBoard.svelte';
	import LoadoutInventoryToolbox from '$lib/components/campaigns/LoadoutInventoryToolbox.svelte';
	import LoadoutSaveDialog from '$lib/components/campaigns/LoadoutSaveDialog.svelte';
	import LoadoutSummaryStrip from '$lib/components/campaigns/LoadoutSummaryStrip.svelte';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
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
		formatInventoryCardSummary,
		formatInventoryGroupStatus,
		getDefaultDragAnchor,
		getDragAnchorFromGrid,
		getGridCellKey,
		getPlacedWeaponDragAnchor,
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
	import type { LoadoutItemDefinition, LoadoutPlacement } from '$lib/data/types';
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

	let { data, form }: PageProps = $props();
	let draggedWeaponInstanceId = $state<string | null>(null);
	let draggedWeaponAnchor = $state<{ x: number; y: number } | null>(null);
	let hoveredGridOrigin = $state<{ x: number; y: number } | null>(null);
	let isInventoryDropTargetActive = $state(false);
	let inventorySearch = $state('');
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
	let inventoryWeaponGroups = $derived.by(() => buildInventoryWeaponGroups(inventoryWeapons));
	let filteredInventoryWeaponGroups = $derived.by(() =>
		filterInventoryWeaponGroups(inventoryWeaponGroups, inventorySearch)
	);

	function getInitialLoadoutPlacements() {
		return cloneLoadoutPlacements(data.gameState?.pixlState.loadoutPlacements ?? []);
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

	function clearDragState() {
		draggedWeaponInstanceId = null;
		draggedWeaponAnchor = null;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
	}

	function getGridCellFromPoint(event: DragEvent) {
		const target = event.target;

		if (!(target instanceof Element)) {
			return null;
		}

		const cellElement = target.closest('[data-grid-x][data-grid-y]');

		if (!(cellElement instanceof HTMLElement)) {
			return null;
		}

		const x = Number(cellElement.dataset.gridX);
		const y = Number(cellElement.dataset.gridY);

		if (!Number.isInteger(x) || !Number.isInteger(y)) {
			return null;
		}

		return {
			x,
			y,
			key: getGridCellKey(x, y)
		} satisfies GridCell;
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

				<LoadoutSummaryStrip
					stage={liveRunStage}
					stageLevel={liveRunStageLevel}
					status={liveRunStatus}
					damagePerCycle={formatCycleAverage(equippedDamagePerCycle)}
					projectilesPerCycle={formatCycleAverage(equippedProjectilesPerCycle)}
					equippedCount={loadoutWeapons.length}
				/>

				{#if showSaveWarning}
					<LoadoutSaveDialog
						stage={liveRunStage}
						stageLevel={liveRunStageLevel}
						campaignLevel={liveRunCampaignLevel}
						onCancel={cancelLoadoutSave}
						onConfirm={confirmLoadoutSave}
					/>
				{/if}

				{#if draggedWeaponDefinition}
					<LoadoutDraggedShapePreview
						shape={draggedWeaponDefinition.shape}
						role={draggedWeaponDefinition.role}
					/>
				{/if}

				<LoadoutGridBoard
					gridTemplateColumns={loadoutGridTemplateColumns}
					gridTemplateRows={loadoutGridTemplateRows}
					{gridCells}
					{occupiedCellKeys}
					{previewCellStateByKey}
					weapons={visiblePlacedWeapons}
					{draggedWeaponInstanceId}
					onGridDragOver={handleGridDragOver}
					onGridDrop={handleGridDrop}
					onPlacedWeaponDragOver={handlePlacedWeaponDragOver}
					onPlacedWeaponDrop={handlePlacedWeaponDrop}
					onPlacedWeaponDragStart={beginPlacedWeaponDrag}
					onWeaponDragEnd={handleWeaponDragEnd}
					{getWeaponGridArea}
					{getShapeGridTemplate}
					{isShapeCellFilled}
					{isLabelCell}
				/>
			</div>

			<aside class="panel inventory-panel" aria-label="Loadout toolbox">
				<LoadoutInventoryToolbox
					searchValue={inventorySearch}
					onSearchInput={(value) => (inventorySearch = value)}
					isDropTargetActive={isInventoryDropTargetActive}
					groups={filteredInventoryWeaponGroups}
					{draggedWeaponInstanceId}
					onInventoryDragOver={handleInventoryDragOver}
					onInventoryDragLeave={handleInventoryDragLeave}
					onInventoryDrop={handleInventoryDrop}
					onGroupDragStart={beginInventoryWeaponGroupDrag}
					onWeaponDragEnd={handleWeaponDragEnd}
					formatGroupStatus={formatInventoryGroupStatus}
					formatCardSummary={formatInventoryCardSummary}
					{isShapeCellFilled}
				/>
			</aside>
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

	:global(.loadout-live-sketch) {
		width: 1px;
		height: 1px;
	}

	.shell {
		max-width: 1120px;
		margin: 0 auto;
		padding: 0.75rem;
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

	.section-head-split,
	.draft-actions {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		align-items: center;
	}

	.section-head-split {
		align-items: start;
		flex-wrap: wrap;
	}

	.draft-actions {
		justify-content: flex-end;
	}

	.section-head h2 {
		margin: 0;
	}

	.section-head p {
		letter-spacing: 0.12em;
	}

	.section-head p {
		margin: 0;
		color: #c4c4c4;
		font-size: 0.92rem;
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
		position: sticky;
		top: 0.75rem;
		max-height: calc(100vh - 1.5rem);
		overflow: hidden;
		grid-template-rows: auto auto 1fr;
		gap: 0.75rem;
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

	@media (min-width: 980px) {
		.layout-stack {
			grid-template-columns: minmax(0, 1.65fr) minmax(18rem, 21rem);
		}

		.grid-panel,
		.inventory-panel {
			min-width: 0;
		}
	}

	@media (max-width: 860px) {
		.inventory-panel {
			position: static;
			max-height: none;
			overflow: visible;
		}

		.save,
		.ghost {
			width: 100%;
		}

		.section-head-split {
			align-items: start;
			flex-direction: column;
		}
	}
</style>
