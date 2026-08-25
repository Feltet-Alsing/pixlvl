<script lang="ts">
	import type {
		LoadoutRotation,
		WeaponTargetingKind,
		UtilityDefinition,
		WeaponDefinition,
		WeaponShape
	} from '$lib/data/types';

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
		upgradeLevel: number;
		rarity: WeaponDefinition['rarity'];
		shape: WeaponShape;
		baseDamage?: number;
		attack?: WeaponDefinition['attack'];
		projectileSpeed?: number;
		activationKind?: UtilityDefinition['activationKind'];
		effectSummary: string;
		role: string;
		totalScrapInvested: number;
		isUpgradeable: boolean;
		nextUpgradeCost: number | null;
		isMaxUpgradeLevel: boolean;
		x: number;
		y: number;
		rotation: LoadoutRotation;
		targeting?: WeaponTargetingKind;
	}

	interface Props {
		gridTemplateColumns: string;
		gridTemplateRows: string;
		gridCells: GridCell[];
		occupiedCellKeys: Record<string, true>;
		previewCellStateByKey: Record<string, 'valid' | 'invalid'>;
		weapons: LoadoutWeapon[];
		draggedWeaponInstanceId: string | null;
		mobilePlacementMode?: boolean;
		onSelectWeapon: (weapon: LoadoutWeapon) => void;
		onPlacedWeaponPointerDown: (event: PointerEvent, weapon: LoadoutWeapon) => void;
		onGridCellPress?: (cell: GridCell) => void;
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
		mobilePlacementMode = false,
		onSelectWeapon,
		onPlacedWeaponPointerDown,
		onGridCellPress,
		getWeaponGridArea,
		getShapeGridTemplate,
		isShapeCellFilled,
		isLabelCell
	}: Props = $props();

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}

	function getWeaponLabel(weapon: LoadoutWeapon) {
		if (weapon.category === 'weapon') {
			switch (weapon.targeting ?? weapon.attack?.targeting) {
				case 'nearest-target':
				case 'current-target':
					return 'NT';
				case 'furthest-target':
					return 'FT';
				case 'strongest-target':
					return 'ST';
				case 'weakest-target':
					return 'WT';
			}
		}

		return weapon.name.slice(0, 2).toUpperCase();
	}

	function hashString(input: string) {
		let hash = 0;

		for (let index = 0; index < input.length; index += 1) {
			hash = (hash * 31 + input.charCodeAt(index)) | 0;
		}

		return Math.abs(hash);
	}

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function getWeaponColorStyle(weapon: LoadoutWeapon) {
		const hash = hashString(`${weapon.definitionId}:${weapon.weaponInstanceId}`);
		const hueOffset = (hash % 31) - 15;
		const saturationOffset = ((Math.floor(hash / 31) % 9) - 4) * 3;
		const lightnessOffset = ((Math.floor(hash / (31 * 9)) % 11) - 5) * 2.2;

		const paletteByRarity = {
			normal: { hue: 215, saturation: 9, lightness: 51 },
			magic: { hue: 219, saturation: 57, lightness: 49 },
			rare: { hue: 40, saturation: 72, lightness: 43 },
			exotic: { hue: 2, saturation: 57, lightness: 45 },
			legendary: { hue: 28, saturation: 63, lightness: 34 }
		} as const;

		const base = paletteByRarity[weapon.rarity];
		const fillHue = base.hue + hueOffset;
		const fillSaturation = clamp(base.saturation + saturationOffset, 8, 92);
		const fillLightness = clamp(base.lightness + lightnessOffset, 24, 72);
		const borderHue = fillHue + (hash % 2 === 0 ? 6 : -6);
		const outlineHue = fillHue + (hash % 3 === 0 ? 11 : -11);
		const borderSaturation = clamp(fillSaturation + 10, 14, 96);
		const outlineSaturation = clamp(fillSaturation + 16, 18, 98);
		const borderLightness = clamp(fillLightness + 29, 44, 94);
		const outlineLightness = clamp(fillLightness + 20, 36, 84);

		return [
			`--weapon-fill-color: hsl(${fillHue} ${fillSaturation}% ${fillLightness}%)`,
			`--weapon-border-color: hsl(${borderHue} ${borderSaturation}% ${borderLightness}%)`,
			`--weapon-outline-stroke: hsl(${outlineHue} ${outlineSaturation}% ${outlineLightness}%)`
		].join('; ');
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
				tabindex={mobilePlacementMode ? 0 : -1}
				aria-label={`Loadout cell ${cell.x}, ${cell.y}`}
				class:occupied={occupiedCellKeys[cell.key] && !previewCellStateByKey[cell.key]}
				class:preview-valid={previewCellStateByKey[cell.key] === 'valid'}
				class:preview-invalid={previewCellStateByKey[cell.key] === 'invalid'}
				onclick={() => mobilePlacementMode && onGridCellPress?.(cell)}
				onkeydown={(event) => {
					if ((event.key === 'Enter' || event.key === ' ') && mobilePlacementMode) {
						event.preventDefault();
						onGridCellPress?.(cell);
					}
				}}
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
				class:dragging={draggedWeaponInstanceId === weapon.weaponInstanceId}
				style={`${getWeaponGridArea(weapon)} ${getWeaponColorStyle(weapon)}`}
				onclick={() => onSelectWeapon(weapon)}
				onpointerdown={(event) => onPlacedWeaponPointerDown(event, weapon)}
			>
				<div class="placed-weapon-shape" style={getShapeGridTemplate(weapon.shape)}>
					{#each createIndexArray(weapon.shape.height) as shapeY (`${weapon.weaponInstanceId}:${shapeY}`)}
						{#each createIndexArray(weapon.shape.width) as shapeX (`${weapon.weaponInstanceId}:${shapeY}:${shapeX}`)}
							{@const isFilled = isShapeCellFilled(weapon.shape, shapeX, shapeY)}
							<div class="placed-weapon-cell" class:filled={isFilled} aria-hidden={!isFilled}>
								{#if isLabelCell(weapon.shape, shapeX, shapeY)}
									<span>{getWeaponLabel(weapon)}</span>
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
		touch-action: none;
		--board-gap: 0.22rem;
		--shape-gap: 0.35rem;
		--cell-radius: 0.4rem;
		--weapon-outline-inset: -0.26rem;
		--weapon-outline-width: 3px;
		--weapon-outline-radius: 0.82rem;
	}

	.loadout-grid,
	.placed-weapons-layer,
	.placed-weapon-shape {
		display: grid;
		gap: var(--shape-gap);
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
		border-radius: var(--cell-radius);
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
		touch-action: none;
	}

	.placed-weapon::after {
		content: '';
		position: absolute;
		inset: var(--weapon-outline-inset);
		border: var(--weapon-outline-width) solid var(--weapon-outline-stroke, rgba(245, 245, 245, 0.9));
		border-radius: var(--weapon-outline-radius);
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

	@media (max-width: 640px) {
		.loadout-grid-shell {
			--board-gap: 0.14rem;
			--shape-gap: 0.24rem;
			--cell-radius: 0.3rem;
			--weapon-outline-inset: -0.12rem;
			--weapon-outline-width: 2px;
			--weapon-outline-radius: 0.58rem;
		}
	}
</style>
