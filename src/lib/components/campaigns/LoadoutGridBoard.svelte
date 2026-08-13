<script lang="ts">
	import type { UtilityDefinition, WeaponDefinition, WeaponShape } from '$lib/data/types';

	interface GridCell {
		x: number;
		y: number;
		key: string;
	}

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

	interface Props {
		gridTemplateColumns: string;
		gridTemplateRows: string;
		gridCells: GridCell[];
		occupiedCellKeys: Record<string, true>;
		previewCellStateByKey: Record<string, 'valid' | 'invalid'>;
		weapons: LoadoutWeapon[];
		draggedWeaponInstanceId: string | null;
		onGridDragOver: (event: DragEvent, cell: GridCell) => void;
		onGridDrop: (event: DragEvent, cell: GridCell) => void;
		onPlacedWeaponDragOver: (event: DragEvent) => void;
		onPlacedWeaponDrop: (event: DragEvent) => void;
		onPlacedWeaponDragStart: (event: DragEvent, weapon: LoadoutWeapon) => void;
		onWeaponDragEnd: (event: DragEvent) => void;
		getWeaponGridArea: (weapon: LoadoutWeapon) => string;
		getShapeGridTemplate: (shape: WeaponShape) => string;
		isShapeCellFilled: (shape: WeaponShape, x: number, y: number) => boolean;
		isLabelCell: (shape: WeaponShape, x: number, y: number) => boolean;
	}

	let {
		gridTemplateColumns,
		gridTemplateRows,
		gridCells,
		occupiedCellKeys,
		previewCellStateByKey,
		weapons,
		draggedWeaponInstanceId,
		onGridDragOver,
		onGridDrop,
		onPlacedWeaponDragOver,
		onPlacedWeaponDrop,
		onPlacedWeaponDragStart,
		onWeaponDragEnd,
		getWeaponGridArea,
		getShapeGridTemplate,
		isShapeCellFilled,
		isLabelCell
	}: Props = $props();

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}
</script>

<div class="loadout-grid-shell" id="loadout-grid-shell">
	<div
		class="loadout-grid main-loadout-grid"
		style:grid-template-columns={gridTemplateColumns}
		style:grid-template-rows={gridTemplateRows}
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
				ondragover={(event) => onGridDragOver(event, cell)}
				ondrop={(event) => onGridDrop(event, cell)}
			></div>
		{/each}
	</div>

	<div
		class="placed-weapons-layer"
		style:grid-template-columns={gridTemplateColumns}
		style:grid-template-rows={gridTemplateRows}
	>
		{#each weapons as weapon (weapon.weaponInstanceId)}
			<button
				class={`placed-weapon rarity-${weapon.rarity}`}
				type="button"
				draggable="true"
				class:dragging={draggedWeaponInstanceId === weapon.weaponInstanceId}
				style={getWeaponGridArea(weapon)}
				ondragover={onPlacedWeaponDragOver}
				ondrop={onPlacedWeaponDrop}
				ondragstart={(event) => onPlacedWeaponDragStart(event, weapon)}
				ondragend={onWeaponDragEnd}
				title={`${weapon.name} at ${weapon.x}, ${weapon.y}`}
			>
				<div class="placed-weapon-shape" style={getShapeGridTemplate(weapon.shape)}>
					{#each createIndexArray(weapon.shape.height) as shapeY (`${weapon.weaponInstanceId}:${shapeY}`)}
						{#each createIndexArray(weapon.shape.width) as shapeX (`${weapon.weaponInstanceId}:${shapeY}:${shapeX}`)}
							{@const isFilled = isShapeCellFilled(weapon.shape, shapeX, shapeY)}
							<div class="placed-weapon-cell" class:filled={isFilled} aria-hidden={!isFilled}>
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

<style>
	.loadout-grid-shell {
		position: relative;
		width: min(100%, 56rem);
		margin: 0 auto;
		--board-gap: 0.22rem;
	}

	.loadout-grid,
	.placed-weapons-layer,
	.placed-weapon-shape {
		display: grid;
		gap: 0.35rem;
	}

	.main-loadout-grid,
	.placed-weapons-layer {
		gap: var(--board-gap);
		grid-auto-rows: minmax(3.45rem, 1fr);
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
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.grid-cell,
	.placed-weapon-cell {
		border-radius: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		box-sizing: border-box;
	}

	.grid-cell {
		aspect-ratio: 1;
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
		color: #f5f5f5;
		cursor: grab;
	}

	.placed-weapon::after {
		content: '';
		position: absolute;
		inset: -0.26rem;
		border: 3px solid var(--weapon-outline-stroke, rgba(245, 245, 245, 0.9));
		border-radius: 0.82rem;
		pointer-events: none;
	}

	.placed-weapon-shape {
		width: 100%;
		height: 100%;
	}

	.placed-weapon-cell {
		border-color: transparent;
		background: transparent;
		pointer-events: none;
	}

	.placed-weapon-cell.filled {
		background: var(--weapon-fill-color, rgba(64, 64, 64, 0.94));
		border: 1.5px solid var(--weapon-border-color, rgba(255, 255, 255, 0.96));
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.16),
			0 0 0 1px rgba(0, 0, 0, 0.82);
	}

	.dragging {
		opacity: 0.5;
	}

	.placed-weapon.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
		--weapon-fill-color: rgba(122, 128, 138, 0.94);
		--weapon-border-color: rgba(240, 244, 248, 0.98);
		--weapon-outline-stroke: rgba(240, 244, 248, 0.98);
	}

	.placed-weapon.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
		--weapon-fill-color: rgba(54, 101, 196, 0.95);
		--weapon-border-color: rgba(170, 206, 255, 0.98);
		--weapon-outline-stroke: rgba(170, 206, 255, 0.98);
	}

	.placed-weapon.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
		--weapon-fill-color: rgba(191, 139, 30, 0.96);
		--weapon-border-color: rgba(255, 232, 153, 0.98);
		--weapon-outline-stroke: rgba(255, 232, 153, 0.98);
	}

	.placed-weapon.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
		--weapon-fill-color: rgba(177, 49, 49, 0.96);
		--weapon-border-color: rgba(255, 170, 170, 0.98);
		--weapon-outline-stroke: rgba(255, 170, 170, 0.98);
	}

	.placed-weapon.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
		--weapon-fill-color: rgba(123, 72, 28, 0.97);
		--weapon-border-color: rgba(224, 156, 92, 0.98);
		--weapon-outline-stroke: rgba(224, 156, 92, 0.98);
	}

	@media (max-width: 860px) {
		.main-loadout-grid,
		.placed-weapons-layer {
			grid-auto-rows: minmax(2.7rem, 1fr);
		}
	}
</style>
