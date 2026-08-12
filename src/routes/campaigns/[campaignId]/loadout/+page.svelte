<script lang="ts">
	import { resolve } from '$app/paths';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import type { LoadoutPlacement, WeaponDefinition, WeaponShape } from '$lib/data/types';
	import type { PageProps } from './$types';

	const LOADOUT_ROW_COUNT = 5;
	const LOADOUT_COLUMN_COUNT = 8;
	const LOADOUT_GRID_TEMPLATE_COLUMNS = `repeat(${LOADOUT_COLUMN_COUNT}, minmax(0, 1fr))`;
	const LOADOUT_GRID_TEMPLATE_ROWS = `repeat(${LOADOUT_ROW_COUNT}, minmax(0, 1fr))`;

	interface LoadoutWeapon {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		shape: WeaponShape;
		role: string;
		x: number;
		y: number;
	}

	interface InventoryWeapon {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		shape: WeaponShape;
		role: string;
		x: number | null;
		y: number | null;
		isEquipped: boolean;
	}

	interface GridCell {
		x: number;
		y: number;
		key: string;
	}

	let { data, form }: PageProps = $props();
	let draggedWeaponInstanceId = $state<string | null>(null);
	let draggedWeaponAnchor = $state<{ x: number; y: number } | null>(null);
	let hoveredGridOrigin = $state<{ x: number; y: number } | null>(null);
	let isInventoryDropTargetActive = $state(false);

	let weaponDefinitionById = $derived(
		Object.fromEntries(
			data.weaponPool.map((weapon) => [weapon.id, weapon] satisfies [string, WeaponDefinition])
		) as Record<string, WeaponDefinition>
	);
	let ownedWeapons = $derived(data.gameState?.pixlState.ownedWeapons ?? []);
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
				name: definition.name,
				rarity: definition.rarity,
				shape: definition.shape,
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
				name: definition.name,
				rarity: definition.rarity,
				shape: definition.shape,
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

		for (let y = 0; y < LOADOUT_ROW_COUNT; y += 1) {
			for (let x = 0; x < LOADOUT_COLUMN_COUNT; x += 1) {
				cells.push({ x, y, key: getGridCellKey(x, y) });
			}
		}

		return cells;
	});
	let visiblePlacedWeapons = $derived(loadoutWeapons);
	let isDraggingWeapon = $derived(Boolean(draggedWeaponInstanceId));
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

			if (gridX >= 0 && gridX < LOADOUT_COLUMN_COUNT && gridY >= 0 && gridY < LOADOUT_ROW_COUNT) {
				preview[getGridCellKey(gridX, gridY)] = isValid ? 'valid' : 'invalid';
			}
		}

		return preview;
	});
	let loadoutTooltip = $derived(
		loadoutWeapons.map((weapon) => `${weapon.name} (${weapon.x}, ${weapon.y})`).join('\n') ||
			'No equipped weapons'
	);
	let draggedInventoryWeapon = $derived(
		draggedWeaponInstanceId
			? (inventoryWeapons.find((weapon) => weapon.weaponInstanceId === draggedWeaponInstanceId) ??
					null)
			: null
	);

	function getGridCellKey(x: number, y: number) {
		return `${x}:${y}`;
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

	$effect(() => {
		const nextSavedLoadoutPayload = savedLoadoutPayload;

		if (nextSavedLoadoutPayload === lastSyncedSavedLoadoutPayload) {
			return;
		}

		draftLoadoutPlacements = cloneLoadoutPlacements(savedLoadoutPlacements);
		lastSyncedSavedLoadoutPayload = nextSavedLoadoutPayload;
		clearDragState();
	});

	function clearDragState() {
		draggedWeaponInstanceId = null;
		draggedWeaponAnchor = null;
		hoveredGridOrigin = null;
		isInventoryDropTargetActive = false;
	}

	function canPlaceWeaponAt(weaponInstanceId: string, x: number, y: number) {
		const ownedWeapon = ownedWeaponByInstanceId[weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!definition) {
			return false;
		}

		return definition.shape.cells.every(([shapeX, shapeY]) => {
			const gridX = x + shapeX;
			const gridY = y + shapeY;

			return (
				gridX >= 0 &&
				gridX < LOADOUT_COLUMN_COUNT &&
				gridY >= 0 &&
				gridY < LOADOUT_ROW_COUNT &&
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

	function formatInventoryStatus(weapon: InventoryWeapon) {
		return weapon.isEquipped && weapon.x !== null && weapon.y !== null
			? `Equipped at (${weapon.x}, ${weapon.y})`
			: 'Unequipped';
	}

	function beginPlacedWeaponDrag(event: DragEvent, weapon: LoadoutWeapon) {
		beginWeaponDrag(event, weapon.weaponInstanceId, getPlacedWeaponDragAnchor(event, weapon.shape));
	}

	function beginInventoryWeaponDrag(event: DragEvent, weapon: InventoryWeapon) {
		beginWeaponDrag(event, weapon.weaponInstanceId, getDefaultDragAnchor(weapon.shape));
	}
</script>

<svelte:head>
	<title>Loadout | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<div class="topbar">
			<a class="back" href={resolve('/campaigns')}>All campaigns</a>
			<CampaignRouteNav campaignId={data.campaignId} active="loadout" {loadoutTooltip} />
		</div>

		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Loadout</h1>
			<p class="lede">
				Every weapon keeps its exact shape. If the shape fits inside the 5 x 8 grid without
				overlapping another weapon, it can be equipped.
			</p>
		</section>

		<section class="layout-stack">
			<div class="panel grid-panel">
				<div class="section-head section-head-split">
					<div>
						<h2>Loadout grid</h2>
						<p>
							Drag a weapon from inventory into the grid, drag placed weapons to reposition, or drag
							them back out to unequip.
						</p>
					</div>
					<form method="post" action="?/saveLoadout">
						<input type="hidden" name="loadoutPlacements" value={draftLoadoutPayload} />
						<button class="save" type="submit" disabled={!canSaveLoadout}>Save loadout</button>
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

				{#if draggedWeaponDefinition}
					<div class="weapon-shape-preview centered-preview">
						<div
							class="shape-grid"
							style:grid-template-columns={`repeat(${draggedWeaponDefinition.shape.width}, 1fr)`}
						>
							{#each Array.from( { length: draggedWeaponDefinition.shape.height } ) as _, shapeY (shapeY)}
								{#each Array.from( { length: draggedWeaponDefinition.shape.width } ) as _, shapeX (shapeX)}
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

				<div class="loadout-grid-shell">
					<div
						class="loadout-grid main-loadout-grid"
						style:grid-template-columns={LOADOUT_GRID_TEMPLATE_COLUMNS}
						style:grid-template-rows={LOADOUT_GRID_TEMPLATE_ROWS}
					>
						{#each gridCells as cell (cell.key)}
							<div
								class="grid-cell"
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
						class:drag-pass-through={isDraggingWeapon}
						style:grid-template-columns={LOADOUT_GRID_TEMPLATE_COLUMNS}
						style:grid-template-rows={LOADOUT_GRID_TEMPLATE_ROWS}
					>
						{#each visiblePlacedWeapons as weapon (weapon.weaponInstanceId)}
							<button
								class={`placed-weapon rarity-${weapon.rarity}`}
								type="button"
								draggable="true"
								class:dragging={draggedWeaponInstanceId === weapon.weaponInstanceId}
								style={getWeaponGridArea(weapon)}
								ondragstart={(event) => beginPlacedWeaponDrag(event, weapon)}
								ondragend={clearDragState}
								title={`${weapon.name} at ${weapon.x}, ${weapon.y}`}
							>
								<div class="placed-weapon-shape" style={getShapeGridTemplate(weapon.shape)}>
									{#each Array.from( { length: weapon.shape.height } ) as _, shapeY (`${weapon.weaponInstanceId}:${shapeY}`)}
										{#each Array.from( { length: weapon.shape.width } ) as _, shapeX (`${weapon.weaponInstanceId}:${shapeY}:${shapeX}`)}
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
					<h2>Weapon inventory</h2>
					<p>
						Weapons stay rigid here too. Drag them into the grid to equip, or drag equipped ones
						back here to unequip.
					</p>
				</div>

				<div
					class="inventory-drop-zone"
					class:drop-target={isInventoryDropTargetActive}
					role="button"
					tabindex="0"
					aria-label="Drag equipped weapons here to unequip them"
					ondragover={handleInventoryDragOver}
					ondragleave={handleInventoryDragLeave}
					ondrop={handleInventoryDrop}
				>
					<div class="inventory-scroll">
						{#each inventoryWeapons as weapon (weapon.weaponInstanceId)}
							<button
								class={`inventory-weapon rarity-${weapon.rarity}`}
								type="button"
								draggable="true"
								class:equipped={weapon.isEquipped}
								class:dragging={draggedWeaponInstanceId === weapon.weaponInstanceId}
								ondragstart={(event) => beginInventoryWeaponDrag(event, weapon)}
								ondragend={clearDragState}
							>
								<div class="inventory-weapon-head">
									<div>
										<strong>{weapon.name}</strong>
										<p class="weapon-role">{weapon.role}</p>
									</div>
									<span class="inventory-status">{formatInventoryStatus(weapon)}</span>
								</div>

								<div
									class="shape-grid inventory-shape-grid"
									style:grid-template-columns={`repeat(${weapon.shape.width}, 1fr)`}
								>
									{#each Array.from( { length: weapon.shape.height } ) as _, shapeY (`inventory:${weapon.weaponInstanceId}:${shapeY}`)}
										{#each Array.from( { length: weapon.shape.width } ) as _, shapeX (`inventory:${weapon.weaponInstanceId}:${shapeY}:${shapeX}`)}
											<div
												class="shape-cell"
												class:filled={isShapeCellFilled(weapon.shape, shapeX, shapeY)}
											></div>
										{/each}
									{/each}
								</div>
							</button>
						{/each}
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
	.inventory-weapon-head {
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

	.layout-stack {
		display: grid;
		gap: 1rem;
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
		pointer-events: auto;
	}

	.placed-weapons-layer.drag-pass-through {
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
		background: rgba(64, 64, 64, 0.94);
		border-color: rgba(255, 255, 255, 0.16);
	}

	.inventory-weapon {
		width: 100%;
		padding: 0.9rem;
		display: grid;
		gap: 0.85rem;
		text-align: left;
		font: inherit;
	}

	.inventory-weapon.equipped {
		border-color: rgba(103, 217, 111, 0.3);
		background: rgba(103, 217, 111, 0.08);
	}

	.inventory-status {
		font-size: 0.72rem;
		text-transform: uppercase;
		color: #d6d6d6;
	}

	.inventory-shape-grid {
		justify-self: start;
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
		display: grid;
		gap: 0.75rem;
		padding-right: 0.25rem;
	}

	.placed-weapon.rarity-normal,
	.inventory-weapon.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
	}

	.placed-weapon.rarity-magic,
	.inventory-weapon.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
	}

	.placed-weapon.rarity-rare,
	.inventory-weapon.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
	}

	.placed-weapon.rarity-exotic,
	.inventory-weapon.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
	}

	.placed-weapon.rarity-legendary,
	.inventory-weapon.rarity-legendary {
		border-color: rgba(179, 132, 62, 0.28);
	}

	@media (max-width: 860px) {
		.save,
		.ghost {
			width: 100%;
		}

		.inventory-weapon-head,
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
