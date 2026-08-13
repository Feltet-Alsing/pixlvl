<script lang="ts">
	import type { UtilityDefinition, WeaponDefinition, WeaponShape } from '$lib/data/types';

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

	interface Props {
		searchValue: string;
		onSearchInput: (value: string) => void;
		isDropTargetActive: boolean;
		groups: InventoryWeaponGroup[];
		draggedWeaponInstanceId: string | null;
		onSelectGroup: (group: InventoryWeaponGroup) => void;
		onInventoryDragOver: (event: DragEvent) => void;
		onInventoryDragLeave: () => void;
		onInventoryDrop: (event: DragEvent) => void;
		onGroupDragStart: (event: DragEvent, group: InventoryWeaponGroup) => void;
		onWeaponDragEnd: (event: DragEvent) => void;
		formatGroupStatus: (group: InventoryWeaponGroup) => string;
		isShapeCellFilled: (shape: WeaponShape, x: number, y: number) => boolean;
	}

	let {
		searchValue,
		onSearchInput,
		isDropTargetActive,
		groups,
		draggedWeaponInstanceId,
		onSelectGroup,
		onInventoryDragOver,
		onInventoryDragLeave,
		onInventoryDrop,
		onGroupDragStart,
		onWeaponDragEnd,
		formatGroupStatus,
		isShapeCellFilled
	}: Props = $props();

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}

	function handleSearchInput(event: Event) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		onSearchInput(target.value);
	}
</script>

<div class="toolbox-shell">
	<div class="section-head">
		<h2>Loadout toolbox</h2>
		<p>
			Search or drag any ready item into the grid, and drag equipped items back here to unequip.
		</p>
	</div>

	<label class="inventory-search" for="inventory-search-input">
		<span>Search items</span>
		<input
			id="inventory-search-input"
			type="search"
			placeholder="Search by name, role, effect, rarity..."
			value={searchValue}
			oninput={handleSearchInput}
		/>
	</label>

	<div
		class="inventory-drop-zone"
		class:drop-target={isDropTargetActive}
		role="button"
		tabindex="0"
		aria-label="Drag equipped items here to unequip them"
		ondragover={onInventoryDragOver}
		ondragleave={onInventoryDragLeave}
		ondrop={onInventoryDrop}
	>
		<div class="inventory-scroll">
			{#if groups.length}
				<div class="inventory-toolbox-grid">
					{#each groups as group (group.definitionId)}
						<button
							class={`inventory-weapon inventory-toolbox-item rarity-${group.rarity}`}
							type="button"
							draggable={group.availableCount > 0}
							disabled={group.availableCount < 1}
							class:equipped={group.equippedCount > 0}
							class:unavailable={group.availableCount < 1}
							class:dragging={draggedWeaponInstanceId === group.representativeWeaponInstanceId}
							onclick={() => onSelectGroup(group)}
							ondragstart={(event) => onGroupDragStart(event, group)}
							ondragend={onWeaponDragEnd}
						>
							{#if group.totalCount > 1}
								<span class="inventory-count-badge">{group.totalCount}</span>
							{/if}

							<div class="inventory-toolbox-head">
								<div>
									<strong>{group.name}</strong>
									<p class="weapon-role">{group.role}</p>
								</div>
								<span class="inventory-status">{formatGroupStatus(group)}</span>
							</div>

							<div class="inventory-toolbox-body">
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
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<p class="inventory-empty-state">No items match that search.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.toolbox-shell {
		display: grid;
		gap: 0.7rem;
		min-height: 0;
	}

	.section-head {
		display: grid;
		gap: 0.35rem;
	}

	.section-head h2,
	.section-head p,
	.weapon-role,
	.inventory-empty-state {
		margin: 0;
	}

	.section-head p,
	.weapon-role {
		color: #c4c4c4;
	}

	.inventory-search {
		display: grid;
		gap: 0.35rem;
	}

	.inventory-search span,
	.inventory-status {
		font-size: 0.64rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #bdbdc3;
	}

	.inventory-search input {
		width: 100%;
		min-height: 2.25rem;
		padding: 0.65rem 0.8rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.92rem;
	}

	.inventory-search input::placeholder {
		color: #8f8f96;
	}

	.inventory-search input:focus {
		outline: none;
		border-color: rgba(170, 206, 255, 0.58);
		box-shadow: 0 0 0 3px rgba(84, 150, 255, 0.16);
	}

	.inventory-drop-zone {
		display: grid;
		min-height: 0;
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
		min-height: 0;
		height: 100%;
		overflow-y: auto;
		padding-bottom: 1rem;
		padding-right: 0.25rem;
	}

	.inventory-toolbox-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.65rem;
	}

	.inventory-weapon {
		width: 100%;
		padding: 0.72rem;
		display: grid;
		gap: 0.65rem;
		text-align: left;
		font: inherit;
		position: relative;
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		color: #f5f5f5;
		cursor: grab;
	}

	.inventory-weapon.equipped {
		border-color: rgba(103, 217, 111, 0.3);
		background: rgba(103, 217, 111, 0.08);
	}

	.inventory-weapon.unavailable {
		opacity: 0.72;
		cursor: default;
	}

	.inventory-toolbox-item {
		min-height: 8.1rem;
		align-content: start;
		overflow: hidden;
	}

	.inventory-count-badge {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		min-width: 1.4rem;
		height: 1.4rem;
		padding: 0 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.22);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1;
	}

	.inventory-toolbox-head {
		display: flex;
		justify-content: space-between;
		gap: 0.55rem;
		align-items: center;
	}

	.inventory-toolbox-head strong {
		display: block;
		padding-right: 2.2rem;
		font-size: 1.05rem;
	}

	.inventory-toolbox-body {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	.shape-grid {
		display: grid;
		gap: 0.22rem;
		width: fit-content;
	}

	.inventory-shape-grid {
		justify-self: start;
		padding: 0.15rem;
		flex: 0 0 auto;
	}

	.shape-cell {
		aspect-ratio: 1;
		border-radius: 0.42rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
	}

	.inventory-weapon .shape-cell.filled {
		background: var(--inventory-fill-color, rgba(255, 255, 255, 0.18));
		border-color: var(--inventory-border-color, rgba(255, 255, 255, 0.52));
	}

	.dragging {
		opacity: 0.5;
	}

	.inventory-empty-state {
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px dashed rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.03);
		color: #c9c9cf;
		text-align: center;
		font-size: 0.9rem;
	}

	.inventory-weapon.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
		--inventory-fill-color: rgba(122, 128, 138, 0.86);
		--inventory-border-color: rgba(240, 244, 248, 0.9);
	}

	.inventory-weapon.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
		--inventory-fill-color: rgba(54, 101, 196, 0.86);
		--inventory-border-color: rgba(170, 206, 255, 0.92);
	}

	.inventory-weapon.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
		--inventory-fill-color: rgba(191, 139, 30, 0.88);
		--inventory-border-color: rgba(255, 232, 153, 0.92);
	}

	.inventory-weapon.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
		--inventory-fill-color: rgba(177, 49, 49, 0.88);
		--inventory-border-color: rgba(255, 170, 170, 0.92);
	}

	.inventory-weapon.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
		--inventory-fill-color: rgba(123, 72, 28, 0.9);
		--inventory-border-color: rgba(224, 156, 92, 0.94);
	}

	@media (max-width: 860px) {
		.inventory-toolbox-grid {
			grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		}

		.inventory-toolbox-body {
			align-items: start;
		}

		.inventory-scroll {
			height: auto;
		}

		.inventory-toolbox-head {
			align-items: start;
			flex-direction: column;
		}
	}
</style>
