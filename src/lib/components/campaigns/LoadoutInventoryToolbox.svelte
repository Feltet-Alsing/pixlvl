<script lang="ts">
	import CampaignItemCard from '$lib/components/campaigns/CampaignItemCard.svelte';
	import type {
		LoadoutItemDefinition,
		UtilityDefinition,
		WeaponDefinition,
		WeaponShape
	} from '$lib/data/types';

	interface InventoryWeaponGroup {
		definitionId: string;
		definition: LoadoutItemDefinition;
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
		onRequestScrap?: (group: InventoryWeaponGroup) => void;
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
		onRequestScrap,
		onInventoryDragOver,
		onInventoryDragLeave,
		onInventoryDrop,
		onGroupDragStart,
		onWeaponDragEnd,
		formatGroupStatus,
		isShapeCellFilled
	}: Props = $props();

	function handleSearchInput(event: Event) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		onSearchInput(target.value);
	}

	function getScrapableCount(group: InventoryWeaponGroup) {
		return Math.max(0, Math.min(group.availableCount, group.totalCount - 1));
	}

	function buildGroupMetaRows(group: InventoryWeaponGroup) {
		return [
			{ label: 'Owned', value: group.totalCount.toString() },
			{ label: 'Ready', value: group.availableCount.toString() },
			{ label: 'Equip', value: group.equippedCount.toString() }
		];
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
						<div
							class={`inventory-weapon inventory-toolbox-item rarity-${group.rarity}`}
							role="group"
							draggable={group.availableCount > 0}
							class:equipped={group.equippedCount > 0}
							class:unavailable={group.availableCount < 1}
							class:dragging={draggedWeaponInstanceId === group.representativeWeaponInstanceId}
							ondragstart={(event) => onGroupDragStart(event, group)}
							ondragend={onWeaponDragEnd}
						>
							<button
								class="inventory-card-button"
								type="button"
								disabled={group.availableCount < 1}
								onclick={() => onSelectGroup(group)}
							>
								<CampaignItemCard
									definition={group.definition}
									headerStartLabel={group.totalCount > 1 ? String(group.totalCount) : ''}
									subtitle={group.role}
									metaRows={buildGroupMetaRows(group)}
									size="compact"
								>
									{#snippet footer()}
										<div class="inventory-toolbox-footer">
											<span class="inventory-status">{formatGroupStatus(group)}</span>
										</div>
									{/snippet}
								</CampaignItemCard>
							</button>

							{#if onRequestScrap && getScrapableCount(group) > 0}
								<button class="scrap-button" type="button" onclick={() => onRequestScrap(group)}>
									Scrap {getScrapableCount(group)}
								</button>
							{/if}
						</div>
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
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 0.7rem;
		height: 100%;
		min-height: 0;
	}

	.section-head {
		display: grid;
		gap: 0.35rem;
	}

	.section-head h2,
	.section-head p,
	.inventory-empty-state {
		margin: 0;
	}

	.section-head p {
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
		height: 100%;
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
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.inventory-scroll::-webkit-scrollbar {
		display: none;
	}

	.inventory-toolbox-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.65rem;
	}

	.inventory-weapon {
		width: 100%;
		display: grid;
		gap: 0.65rem;
		text-align: left;
		font: inherit;
		position: relative;
		color: #f5f5f5;
		cursor: grab;
	}

	.inventory-card-button {
		width: 100%;
		padding: 0;
		display: block;
		text-align: left;
		font: inherit;
		color: inherit;
		background: transparent;
		border: 0;
		cursor: inherit;
	}

	.inventory-card-button:disabled {
		cursor: default;
	}

	.inventory-weapon.equipped :global(.campaign-item-card) {
		border-color: rgba(103, 217, 111, 0.3);
		background:
			radial-gradient(circle at top, rgba(103, 217, 111, 0.18), transparent 56%),
			linear-gradient(180deg, rgba(8, 12, 8, 0.98), rgba(5, 8, 5, 0.96));
	}

	.inventory-weapon.unavailable {
		opacity: 0.72;
		cursor: default;
	}

	.inventory-toolbox-item {
		min-height: 0;
		align-content: start;
	}

	.scrap-button {
		margin: 0 0.72rem 0.72rem;
		min-height: 1.95rem;
		padding: 0 0.75rem;
		justify-self: start;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.inventory-toolbox-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
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

	@media (max-width: 860px) {
		.inventory-toolbox-grid {
			grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		}

		.inventory-scroll {
			height: auto;
		}
	}
</style>
