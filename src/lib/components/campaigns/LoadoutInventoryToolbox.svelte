<script lang="ts">
	import CampaignItemCard from '$lib/components/campaigns/CampaignItemCard.svelte';
	import type {
		LoadoutItemDefinition,
		UtilityDefinition,
		WeaponDefinition,
		WeaponShape
	} from '$lib/data/types';

	interface InventoryWeaponGroup {
		groupId: string;
		definitionId: string;
		definition: LoadoutItemDefinition;
		category: 'weapon' | 'utility';
		name: string;
		upgradeLevel: number;
		totalScrapInvested: number;
		isUpgraded: boolean;
		bulkScrappable: boolean;
		isUpgradeable: boolean;
		nextUpgradeCost: number | null;
		isMaxUpgradeLevel: boolean;
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
		latestAcquiredAt: string;
		latestAcquiredAtMs: number;
		isNew: boolean;
	}

	type InventorySortMode = 'recent' | 'rarity' | 'duplicates' | 'size' | 'name';

	interface Props {
		searchValue: string;
		isMobileLayout?: boolean;
		onSearchInput: (value: string) => void;
		sortMode: InventorySortMode;
		onSortModeChange: (value: InventorySortMode) => void;
		favoriteGroupIds: Set<string>;
		onToggleFavorite: (groupId: string) => void;
		favoritesOnly: boolean;
		onToggleFavoritesOnly: () => void;
		duplicatesOnly: boolean;
		onToggleDuplicatesOnly: () => void;
		activeRarities: Set<WeaponDefinition['rarity']>;
		onToggleRarity: (rarity: WeaponDefinition['rarity']) => void;
		onIsolateRarity: (rarity: WeaponDefinition['rarity']) => void;
		upgradedOnly: boolean;
		onToggleUpgradedOnly: () => void;
		isDropTargetActive: boolean;
		groups: InventoryWeaponGroup[];
		draggedWeaponInstanceId: string | null;
		onSelectGroup: (group: InventoryWeaponGroup) => void;
		onRequestScrap?: (group: InventoryWeaponGroup) => void;
		onGroupPointerDown: (event: PointerEvent, group: InventoryWeaponGroup) => void;
		onGroupMobileDragStart?: (
			group: InventoryWeaponGroup,
			gesture: { pointerId: number; clientX: number; clientY: number }
		) => void;
		onGroupPick?: (group: InventoryWeaponGroup) => void;
		formatGroupStatus: (group: InventoryWeaponGroup) => string;
		isShapeCellFilled: (shape: WeaponShape, x: number, y: number) => boolean;
	}

	interface PendingMobileDrag {
		group: InventoryWeaponGroup;
		pointerId: number;
		startX: number;
		startY: number;
	}

	const MOBILE_DRAG_THRESHOLD = 14;

	let {
		searchValue,
		isMobileLayout = false,
		onSearchInput,
		sortMode,
		onSortModeChange,
		favoriteGroupIds,
		onToggleFavorite,
		favoritesOnly,
		onToggleFavoritesOnly,
		duplicatesOnly,
		onToggleDuplicatesOnly,
		activeRarities,
		onToggleRarity,
		onIsolateRarity,
		upgradedOnly,
		onToggleUpgradedOnly,
		isDropTargetActive,
		groups,
		draggedWeaponInstanceId,
		onSelectGroup,
		onRequestScrap,
		onGroupPointerDown,
		onGroupMobileDragStart,
		onGroupPick,
		formatGroupStatus,
		isShapeCellFilled
	}: Props = $props();

	let pendingMobileDrag: PendingMobileDrag | null = null;
	let suppressedPickDefinitionId: string | null = null;
	let suppressedPickTimeout: ReturnType<typeof setTimeout> | null = null;

	function handleSearchInput(event: Event) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		onSearchInput(target.value);
	}

	function getScrapableCount(group: InventoryWeaponGroup) {
		if (!group.bulkScrappable) {
			return 0;
		}

		return Math.max(0, group.availableCount);
	}

	function buildGroupMetaRows(group: InventoryWeaponGroup) {
		return [
			{ label: 'Owned', value: group.totalCount.toString() },
			{ label: 'Ready', value: group.availableCount.toString() },
			{ label: 'Equipped', value: group.equippedCount.toString() }
		];
	}

	function isFavorite(group: InventoryWeaponGroup) {
		return favoriteGroupIds.has(group.groupId);
	}

	function selectSortMode(mode: InventorySortMode) {
		onSortModeChange(mode);
	}

	function handleFavoriteButtonPointerDown(event: PointerEvent) {
		event.stopPropagation();
	}

	function handleFavoriteButtonClick(event: MouseEvent, group: InventoryWeaponGroup) {
		event.stopPropagation();
		onToggleFavorite(group.groupId);
	}

	function scheduleSuppressedPickReset() {
		if (suppressedPickTimeout) {
			clearTimeout(suppressedPickTimeout);
		}

		suppressedPickTimeout = setTimeout(() => {
			suppressedPickDefinitionId = null;
			suppressedPickTimeout = null;
		}, 400);
	}

	function handleGroupPointerDown(event: PointerEvent, group: InventoryWeaponGroup) {
		if (!isMobileLayout) {
			onGroupPointerDown(event, group);
			return;
		}

		if (group.availableCount < 1) {
			return;
		}

		pendingMobileDrag = {
			group,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY
		};
	}

	function clearPendingMobileDrag(pointerId?: number) {
		if (!pendingMobileDrag) {
			return;
		}

		if (pointerId !== undefined && pendingMobileDrag.pointerId !== pointerId) {
			return;
		}

		pendingMobileDrag = null;
	}

	function handleWindowPointerMove(event: PointerEvent) {
		if (!pendingMobileDrag || event.pointerId !== pendingMobileDrag.pointerId) {
			return;
		}

		const deltaX = event.clientX - pendingMobileDrag.startX;
		const deltaY = event.clientY - pendingMobileDrag.startY;
		const absX = Math.abs(deltaX);
		const absY = Math.abs(deltaY);

		if (absY >= MOBILE_DRAG_THRESHOLD && absY > absX) {
			clearPendingMobileDrag(event.pointerId);
			return;
		}

		if (absX < MOBILE_DRAG_THRESHOLD || absX <= absY) {
			return;
		}

		if (event.cancelable) {
			event.preventDefault();
		}

		suppressedPickDefinitionId = pendingMobileDrag.group.groupId;
		scheduleSuppressedPickReset();
		onGroupMobileDragStart?.(pendingMobileDrag.group, {
			pointerId: event.pointerId,
			clientX: event.clientX,
			clientY: event.clientY
		});
		clearPendingMobileDrag(event.pointerId);
	}

	function handleGroupClick(group: InventoryWeaponGroup) {
		onSelectGroup(group);

		if (suppressedPickDefinitionId === group.groupId) {
			suppressedPickDefinitionId = null;
			if (suppressedPickTimeout) {
				clearTimeout(suppressedPickTimeout);
				suppressedPickTimeout = null;
			}
			return;
		}

		onGroupPick?.(group);
	}

	function handleScrapButtonPointerDown(event: PointerEvent) {
		event.stopPropagation();
	}

	function handleScrapButtonClick(event: MouseEvent, group: InventoryWeaponGroup) {
		event.stopPropagation();
		onRequestScrap?.(group);
	}
</script>

<svelte:window
	onpointermove={handleWindowPointerMove}
	onpointerup={(event) => clearPendingMobileDrag(event.pointerId)}
	onpointercancel={(event) => clearPendingMobileDrag(event.pointerId)}
/>

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

	<div class="toolbox-controls">
		<div class="sort-chip-row" aria-label="Sort items">
			<button
				class:active-chip={sortMode === 'recent'}
				class="filter-chip"
				type="button"
				onclick={() => selectSortMode('recent')}
			>
				Recent
			</button>
			<button
				class:active-chip={sortMode === 'rarity'}
				class="filter-chip"
				type="button"
				onclick={() => selectSortMode('rarity')}
			>
				Rarity
			</button>
			<button
				class:active-chip={sortMode === 'duplicates'}
				class="filter-chip"
				type="button"
				onclick={() => selectSortMode('duplicates')}
			>
				Dupes
			</button>
			<button
				class:active-chip={sortMode === 'size'}
				class="filter-chip"
				type="button"
				onclick={() => selectSortMode('size')}
			>
				Size
			</button>
			<button
				class:active-chip={sortMode === 'name'}
				class="filter-chip"
				type="button"
				onclick={() => selectSortMode('name')}
			>
				Name
			</button>
		</div>

		<div class="filter-chip-row" aria-label="Inventory filters">
			<button
				class:active-chip={favoritesOnly}
				class="filter-chip"
				type="button"
				onclick={onToggleFavoritesOnly}
			>
				Favorites
			</button>
			<button
				class:active-chip={duplicatesOnly}
				class="filter-chip"
				type="button"
				onclick={onToggleDuplicatesOnly}
			>
				Duplicates
			</button>
			<button
				class:active-chip={upgradedOnly}
				class="filter-chip"
				type="button"
				onclick={onToggleUpgradedOnly}
			>
				Upgraded
			</button>
		</div>

		<div class="rarity-chip-row" aria-label="Rarity filters">
			{#each ['normal', 'magic', 'rare', 'exotic', 'legendary'] as rarity (rarity)}
				<button
					class:active-chip={activeRarities.has(rarity)}
					class={`filter-chip rarity-chip rarity-${rarity}`}
					type="button"
					onclick={() => onToggleRarity(rarity)}
					ondblclick={() => onIsolateRarity(rarity)}
				>
					{rarity}
				</button>
			{/each}
		</div>
	</div>

	<div
		id="loadout-inventory-drop-zone"
		class="inventory-drop-zone"
		class:drop-target={isDropTargetActive}
		role="button"
		tabindex="0"
		aria-label="Drag equipped items here to unequip them"
	>
		<div class="inventory-scroll">
			{#if groups.length}
				<div class="inventory-toolbox-grid">
					{#each groups as group (group.groupId)}
						<div
							class={`inventory-weapon inventory-toolbox-item rarity-${group.rarity}`}
							role="group"
							class:favorite={isFavorite(group)}
							class:equipped={group.equippedCount > 0}
							class:unavailable={group.availableCount < 1}
							class:mobile-scroll-card={isMobileLayout}
							class:dragging={draggedWeaponInstanceId === group.representativeWeaponInstanceId}
							onpointerdown={(event) => handleGroupPointerDown(event, group)}
						>
							<div class="inventory-card-actions">
								<button
									class:active={isFavorite(group)}
									class="favorite-button"
									type="button"
									onpointerdown={handleFavoriteButtonPointerDown}
									onclick={(event) => handleFavoriteButtonClick(event, group)}
									aria-label={isFavorite(group)
										? `Remove ${group.name} from favorites`
										: `Add ${group.name} to favorites`}
								>
									★ Favorite
								</button>
							</div>

							<button
								class="inventory-card-button"
								type="button"
								disabled={group.availableCount < 1}
								onclick={() => handleGroupClick(group)}
							>
								<CampaignItemCard
									definition={group.definition}
									title={group.name}
									headerStartLabel={group.totalCount > 1 ? String(group.totalCount) : ''}
									subtitle={group.role}
									metaRows={buildGroupMetaRows(group)}
									size="compact"
								>
									{#snippet footer()}
										<div class="inventory-toolbox-footer">
											{#if group.isNew}
												<span class="inventory-new-badge">New</span>
											{/if}
											<span class="inventory-status">{formatGroupStatus(group)}</span>
										</div>
									{/snippet}
								</CampaignItemCard>
							</button>

							{#if onRequestScrap && getScrapableCount(group) > 0 && !isFavorite(group)}
								<button
									class="scrap-button"
									type="button"
									onpointerdown={handleScrapButtonPointerDown}
									onclick={(event) => handleScrapButtonClick(event, group)}
								>
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
		grid-template-rows: auto auto auto minmax(0, 1fr);
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

	.toolbox-controls {
		display: grid;
		gap: 0.55rem;
	}

	.sort-chip-row,
	.filter-chip-row,
	.rarity-chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.filter-chip {
		min-height: 1.9rem;
		padding: 0 0.7rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #d6d6db;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.filter-chip.active-chip {
		border-color: rgba(170, 206, 255, 0.45);
		background: rgba(84, 150, 255, 0.16);
		color: #eef5ff;
	}

	.rarity-chip.rarity-normal.active-chip {
		border-color: rgba(185, 185, 193, 0.45);
		background: rgba(185, 185, 193, 0.16);
	}

	.rarity-chip.rarity-magic.active-chip {
		border-color: rgba(113, 156, 255, 0.45);
		background: rgba(113, 156, 255, 0.16);
	}

	.rarity-chip.rarity-rare.active-chip {
		border-color: rgba(255, 210, 92, 0.45);
		background: rgba(255, 210, 92, 0.16);
	}

	.rarity-chip.rarity-exotic.active-chip {
		border-color: rgba(255, 141, 64, 0.45);
		background: rgba(255, 141, 64, 0.16);
	}

	.rarity-chip.rarity-legendary.active-chip {
		border-color: rgba(255, 92, 184, 0.45);
		background: rgba(255, 92, 184, 0.16);
	}

	.inventory-drop-zone {
		display: grid;
		min-height: 0;
		height: 100%;
		overflow: hidden;
		touch-action: pan-y;
		overscroll-behavior: contain;
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
		touch-action: pan-y;
		overscroll-behavior: contain;
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
		touch-action: none;
	}

	.inventory-weapon.favorite :global(.campaign-item-card) {
		border-color: rgba(255, 214, 102, 0.32);
		background:
			radial-gradient(circle at top, rgba(255, 214, 102, 0.12), transparent 54%),
			linear-gradient(180deg, rgba(12, 11, 6, 0.98), rgba(8, 8, 5, 0.96));
	}

	.inventory-weapon.mobile-scroll-card {
		cursor: default;
		touch-action: pan-y;
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
		touch-action: none;
	}

	.inventory-weapon.mobile-scroll-card .inventory-card-button {
		touch-action: pan-y;
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

	.inventory-card-actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.favorite-button {
		min-height: 1.9rem;
		padding: 0 0.7rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.3);
		color: rgba(255, 255, 255, 0.45);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.favorite-button.active {
		border-color: rgba(255, 214, 102, 0.45);
		background: rgba(255, 214, 102, 0.16);
		color: #ffd666;
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

	.inventory-new-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.25rem;
		padding: 0 0.45rem;
		border-radius: 999px;
		border: 1px solid rgba(103, 217, 111, 0.35);
		background: rgba(103, 217, 111, 0.12);
		color: #c9f8cc;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
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
