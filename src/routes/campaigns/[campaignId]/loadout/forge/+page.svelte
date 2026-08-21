<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		getActiveLoadoutPlacements,
		normalizePersistedLoadoutState
	} from '$lib/game/loadout-slots';
	import {
		buildInventoryWeaponGroups,
		buildInventoryWeapons,
		filterInventoryWeaponGroups,
		formatAttackLabel,
		formatCycleThreshold,
		formatUpgradeLevel,
		getShapeGridTemplate,
		getShapeLabel,
		isShapeCellFilled,
		type InventoryWeaponGroup,
		type InventoryGroupSortMode
	} from '../loadout-helpers';
	import type { LoadoutPlacement, WeaponDefinition } from '$lib/data/types';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let searchValue = $state('');
	let sortMode = $state<InventoryGroupSortMode>('recent');
	let favoriteGroupIds = $state<string[]>([]);
	let favoritesOnly = $state(false);
	let duplicatesOnly = $state(false);
	let upgradedOnly = $state(false);
	let activeForgeWeaponInstanceIdState = $state<string | null>(null);
	let activeForgeDefinitionIdState = $state<string | null>(null);
	let draggedWeaponInstanceId = $state<string | null>(null);
	let isForgeDropActive = $state(false);
	let scrapDialog = $state<{
		definitionId: string;
		weaponInstanceId: string | null;
		name: string;
		rarity: InventoryWeaponGroup['rarity'];
		totalCount: number;
		availableCount: number;
		equippedCount: number;
		scrapableCount: number;
		isUpgraded: boolean;
		refundScrapPerItem: number;
	} | null>(null);
	let scrapQuantity = $state(1);
	let confirmHighRarityScrap = $state(false);
	let activeRarities = $state<Array<WeaponDefinition['rarity']>>([
		'normal',
		'magic',
		'rare',
		'exotic',
		'legendary'
	]);

	const rarityAccentById = {
		normal: '#f0f4f8',
		magic: '#aaceff',
		rare: '#ffe899',
		exotic: '#ffaaaa',
		legendary: '#e09c5c'
	} as const;
	const allRarities = ['normal', 'magic', 'rare', 'exotic', 'legendary'] as const;
	const scrapValueByRarity = {
		normal: 5,
		magic: 25,
		rare: 100,
		exotic: 500,
		legendary: 5000
	} as const;

	const formatLabel = (value: string) =>
		value
			.split(/[-\s]+/)
			.filter(Boolean)
			.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
			.join(' ');

	let ownedWeapons = $derived(data.gameState?.pixlState.ownedWeapons ?? []);
	let persistedLoadoutState = $derived.by(() =>
		normalizePersistedLoadoutState(
			data.gameState?.pixlState.loadoutPlacements ?? null,
			ownedWeapons
		)
	);
	let activePlacements = $derived(getActiveLoadoutPlacements(persistedLoadoutState));
	let placementByWeaponInstanceId = $derived.by(
		() =>
			Object.fromEntries(
				activePlacements.map((placement) => [placement.weaponInstanceId, placement])
			) as Record<string, LoadoutPlacement>
	);
	let inventoryWeapons = $derived(
		buildInventoryWeapons(ownedWeapons, data.weaponDefinitionsById, placementByWeaponInstanceId)
	);
	let forgeGroups = $derived(
		buildInventoryWeaponGroups(inventoryWeapons).filter((group) => group.category === 'weapon')
	);
	let favoriteGroupIdSet = $derived(new Set(favoriteGroupIds));
	let activeRaritySet = $derived(new Set(activeRarities));
	let filteredForgeGroups = $derived(
		filterInventoryWeaponGroups(forgeGroups, {
			query: searchValue,
			favoriteGroupIds: favoriteGroupIdSet,
			favoritesOnly,
			duplicatesOnly,
			upgradedOnly,
			allowedRarities: activeRaritySet,
			sortMode
		})
	);
	let activeForgeGroup = $derived.by(() => {
		const activeInventoryWeapon = activeForgeWeaponInstanceIdState
			? inventoryWeapons.find(
					(weapon) => weapon.weaponInstanceId === activeForgeWeaponInstanceIdState
				)
			: null;

		if (activeInventoryWeapon) {
			return forgeGroups.find((group) => group.groupId === activeInventoryWeapon.groupId) ?? null;
		}

		if (!activeForgeDefinitionIdState) {
			return null;
		}

		const fallbackGroups = forgeGroups.filter(
			(group) => group.definitionId === activeForgeDefinitionIdState
		);

		return fallbackGroups.find((group) => group.isUpgraded) ?? fallbackGroups[0] ?? null;
	});
	let forgeUpgradeInstanceIds = $derived.by(
		() =>
			Object.fromEntries(
				forgeGroups.map((group) => [
					group.groupId,
					inventoryWeapons.find((weapon) => weapon.groupId === group.groupId)?.weaponInstanceId ??
						null
				])
			) as Record<string, string | null>
	);
	let activeForgeWeaponInstanceId = $derived(
		activeForgeGroup ? activeForgeWeaponInstanceIdState : null
	);
	let activeForgeScrapableCount = $derived(
		activeForgeGroup ? getScrapableCount(activeForgeGroup) : 0
	);
	let scrapValuePerItem = $derived(
		scrapDialog ? scrapValueByRarity[scrapDialog.rarity] + scrapDialog.refundScrapPerItem : 0
	);
	let isHighRarityScrap = $derived(
		scrapDialog ? scrapDialog.rarity === 'exotic' || scrapDialog.rarity === 'legendary' : false
	);
	let isUpgradedScrap = $derived(scrapDialog ? scrapDialog.isUpgraded : false);
	let requiresScrapConfirmation = $derived(isHighRarityScrap || isUpgradedScrap);
	let totalScrapYield = $derived(scrapQuantity * scrapValuePerItem);

	function toggleFavorite(groupId: string) {
		favoriteGroupIds = favoriteGroupIds.includes(groupId)
			? favoriteGroupIds.filter((value) => value !== groupId)
			: [...favoriteGroupIds, groupId];
	}

	function toggleRarity(rarity: WeaponDefinition['rarity']) {
		activeRarities = activeRarities.includes(rarity)
			? activeRarities.filter((value) => value !== rarity)
			: [...activeRarities, rarity];
	}

	function isolateRarity(rarity: WeaponDefinition['rarity']) {
		activeRarities = [rarity];
	}

	function getWeaponInstanceId(groupId: string) {
		return forgeUpgradeInstanceIds[groupId] ?? null;
	}

	function getPreferredWeaponInstanceId(group: InventoryWeaponGroup) {
		return group.representativeWeaponInstanceId ?? getWeaponInstanceId(group.groupId);
	}

	function isFavorite(groupId: string) {
		return favoriteGroupIdSet.has(groupId);
	}

	function selectForgeGroup(group: InventoryWeaponGroup) {
		activeForgeDefinitionIdState = group.definitionId;
		activeForgeWeaponInstanceIdState = getPreferredWeaponInstanceId(group);
	}

	function handleWeaponDragStart(event: DragEvent, group: InventoryWeaponGroup) {
		const weaponInstanceId = getPreferredWeaponInstanceId(group);

		if (!weaponInstanceId) {
			return;
		}

		draggedWeaponInstanceId = weaponInstanceId;
		activeForgeDefinitionIdState = group.definitionId;
		activeForgeWeaponInstanceIdState = weaponInstanceId;

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', weaponInstanceId);
		}
	}

	function handleWeaponDragEnd() {
		draggedWeaponInstanceId = null;
		isForgeDropActive = false;
	}

	function handleForgeDragOver(event: DragEvent) {
		if (!draggedWeaponInstanceId) {
			return;
		}

		event.preventDefault();
		isForgeDropActive = true;
	}

	function handleForgeDragLeave() {
		isForgeDropActive = false;
	}

	function handleForgeDrop(event: DragEvent) {
		event.preventDefault();

		const droppedWeaponInstanceId =
			event.dataTransfer?.getData('text/plain') || draggedWeaponInstanceId;

		if (droppedWeaponInstanceId) {
			const droppedWeapon = inventoryWeapons.find(
				(weapon) => weapon.weaponInstanceId === droppedWeaponInstanceId
			);

			activeForgeDefinitionIdState = droppedWeapon?.definitionId ?? activeForgeDefinitionIdState;
			activeForgeWeaponInstanceIdState = droppedWeaponInstanceId;
		}

		draggedWeaponInstanceId = null;
		isForgeDropActive = false;
	}

	function getScrapableCount(group: InventoryWeaponGroup) {
		if (!group.bulkScrappable) {
			return 0;
		}

		return Math.max(0, group.availableCount);
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
			weaponInstanceId: group.isUpgraded ? group.representativeWeaponInstanceId : null,
			name: group.name,
			rarity: group.rarity,
			totalCount: group.totalCount,
			availableCount: group.availableCount,
			equippedCount: group.equippedCount,
			scrapableCount,
			isUpgraded: group.isUpgraded,
			refundScrapPerItem: Math.floor(group.totalScrapInvested * 0.5)
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

	const handleScrapSubmit: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();

			if (result.type === 'success') {
				closeScrapDialog();
			}
		};
	};

	const handleUpgradeSubmit: SubmitFunction = ({ formData }) => {
		const weaponInstanceId = formData.get('weaponInstanceId');

		return async ({ result, update }) => {
			await update();

			if (result.type !== 'success' || typeof weaponInstanceId !== 'string') {
				return;
			}

			const upgradedWeapon = inventoryWeapons.find(
				(weapon) => weapon.weaponInstanceId === weaponInstanceId
			);

			activeForgeDefinitionIdState = upgradedWeapon?.definitionId ?? activeForgeDefinitionIdState;
			activeForgeWeaponInstanceIdState = weaponInstanceId;
		};
	};
</script>

<svelte:head>
	<title>Forge | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="forge-page">
	<div class="shell">
		<section class="panel forge-filter-panel forge-toolbar">
			<div class="section-head">
				<p class="eyebrow">Loadout annex</p>
				<h1>Forge</h1>
				<p>Search, sort, and filter the forge stock before upgrading a weapon.</p>
			</div>

			<label class="inventory-search" for="forge-search-input">
				<span>Search weapons</span>
				<input
					id="forge-search-input"
					type="search"
					placeholder="Search by name, role, effect, rarity..."
					bind:value={searchValue}
				/>
			</label>

			<div class="toolbox-controls">
				<div class="sort-chip-row" aria-label="Sort forge weapons">
					<button
						class:active-chip={sortMode === 'recent'}
						class="filter-chip"
						type="button"
						onclick={() => (sortMode = 'recent')}>Recent</button
					>
					<button
						class:active-chip={sortMode === 'rarity'}
						class="filter-chip"
						type="button"
						onclick={() => (sortMode = 'rarity')}>Rarity</button
					>
					<button
						class:active-chip={sortMode === 'duplicates'}
						class="filter-chip"
						type="button"
						onclick={() => (sortMode = 'duplicates')}>Dupes</button
					>
					<button
						class:active-chip={sortMode === 'size'}
						class="filter-chip"
						type="button"
						onclick={() => (sortMode = 'size')}>Size</button
					>
					<button
						class:active-chip={sortMode === 'name'}
						class="filter-chip"
						type="button"
						onclick={() => (sortMode = 'name')}>Name</button
					>
				</div>

				<div class="filter-chip-row" aria-label="Forge filters">
					<button
						class:active-chip={favoritesOnly}
						class="filter-chip"
						type="button"
						onclick={() => (favoritesOnly = !favoritesOnly)}>Favorites</button
					>
					<button
						class:active-chip={duplicatesOnly}
						class="filter-chip"
						type="button"
						onclick={() => (duplicatesOnly = !duplicatesOnly)}>Duplicates</button
					>
					<button
						class:active-chip={upgradedOnly}
						class="filter-chip"
						type="button"
						onclick={() => (upgradedOnly = !upgradedOnly)}>Upgraded</button
					>
				</div>

				<div class="rarity-chip-row" aria-label="Forge rarity filters">
					{#each allRarities as rarity (rarity)}
						<button
							class:active-chip={activeRaritySet.has(rarity)}
							class={`filter-chip rarity-chip rarity-${rarity}`}
							type="button"
							onclick={() => toggleRarity(rarity)}
							ondblclick={() => isolateRarity(rarity)}
						>
							{rarity}
						</button>
					{/each}
				</div>
			</div>

			<div class="forge-filter-summary">
				<div class="forge-detail-card">
					<span>Showing</span>
					<strong>{filteredForgeGroups.length} / {forgeGroups.length}</strong>
				</div>
				<div class="forge-detail-card">
					<span>Favorites</span>
					<strong>{favoriteGroupIds.length}</strong>
				</div>
			</div>
		</section>

		{#if form?.loadoutError}
			<p class="feedback error">{form.loadoutError}</p>
		{:else if form?.loadoutSuccess}
			<p class="feedback success">{form.loadoutSuccess}</p>
		{/if}

		<section class="forge-grid">
			<div class="panel forge-list-panel">
				<div class="section-head">
					<h2>Forge stock</h2>
					<p>Compact stock list for feeding the forge.</p>
				</div>

				{#if data.gameState && filteredForgeGroups.length > 0}
					<div class="forge-weapon-list" role="list" aria-label="Forge weapon selection">
						{#each filteredForgeGroups as group (group.groupId)}
							<article
								class:active-forge-row={activeForgeGroup?.groupId === group.groupId}
								class:dragging={activeForgeWeaponInstanceId === draggedWeaponInstanceId}
								class="forge-weapon-row"
								style={`--forge-rarity-accent: ${rarityAccentById[group.rarity]};`}
								role="listitem"
							>
								<button
									class="forge-row-select"
									type="button"
									draggable="true"
									onclick={() => selectForgeGroup(group)}
									ondragstart={(event) => handleWeaponDragStart(event, group)}
									ondragend={handleWeaponDragEnd}
								>
									<div class="forge-row-copy">
										<p class="forge-weapon-rarity">{formatLabel(group.rarity)}</p>
										<h3>{group.name}</h3>
										<p class="forge-weapon-role">{group.role}</p>
									</div>
									<div class="forge-row-meta">
										<span>{group.availableCount} ready</span>
										<span>{group.totalCount} owned</span>
										{#if group.upgradeLevel > 0}
											<span class="upgrade-pill">{formatUpgradeLevel(group.upgradeLevel)}</span>
										{/if}
									</div>
								</button>

								<button
									class:active={isFavorite(group.groupId)}
									class="favorite-button"
									type="button"
									onclick={() => toggleFavorite(group.groupId)}
								>
									★
								</button>
							</article>
						{/each}
					</div>
				{:else if data.gameState}
					<p class="feedback neutral">No forge weapons match the current search and filters.</p>
				{:else}
					<p class="feedback neutral">Sign in to open the forge and select a weapon.</p>
				{/if}
			</div>

			<section
				class:drop-active={isForgeDropActive}
				class="panel forge-workspace-panel"
				role="group"
				aria-label="Forge workspace"
				ondragover={handleForgeDragOver}
				ondragleave={handleForgeDragLeave}
				ondrop={handleForgeDrop}
			>
				<div class="forge-workspace-head">
					<div class="section-head">
						<p class="eyebrow">Main forge</p>
						<h2>Working anvil</h2>
						<p>Drag a weapon in from the stock list or click one to load it into the forge.</p>
					</div>
					<div class="forge-drop-hint">
						<span
							>{draggedWeaponInstanceId
								? 'Release to load into the forge'
								: 'Drag weapon here'}</span
						>
					</div>
				</div>

				{#if !data.gameState}
					<p class="feedback neutral">Sign in to access the forge workspace.</p>
				{:else if activeForgeGroup}
					<div
						class={['forge-weapon-card', activeForgeGroup.isMaxUpgradeLevel && 'is-maxed']}
						style={`--forge-rarity-accent: ${rarityAccentById[activeForgeGroup.rarity]};`}
					>
						<div class="forge-weapon-card-head">
							<div>
								<p class="forge-weapon-rarity">{formatLabel(activeForgeGroup.rarity)}</p>
								<h3>{activeForgeGroup.name}</h3>
								<p class="forge-weapon-role">{activeForgeGroup.role}</p>
							</div>
							<div class="forge-weapon-card-actions">
								<button
									class:active={isFavorite(activeForgeGroup.groupId)}
									class="favorite-button"
									type="button"
									onclick={() => toggleFavorite(activeForgeGroup.groupId)}
								>
									★ Favorite
								</button>
								{#if activeForgeGroup.upgradeLevel > 0}
									<span class="upgrade-pill"
										>{formatUpgradeLevel(activeForgeGroup.upgradeLevel)}</span
									>
								{/if}
							</div>
						</div>

						<div class="forge-card-middle">
							<div class="forge-shape-stage" aria-hidden="true">
								<div class="forge-shape-grid" style={getShapeGridTemplate(activeForgeGroup.shape)}>
									{#each Array.from({ length: activeForgeGroup.shape.height }, (_, index) => index) as shapeY (`forge-shape-row:${activeForgeGroup.groupId}:${shapeY}`)}
										{#each Array.from({ length: activeForgeGroup.shape.width }, (_, index) => index) as shapeX (`forge-shape-cell:${activeForgeGroup.groupId}:${shapeY}:${shapeX}`)}
											<div
												class="forge-shape-cell"
												class:filled={isShapeCellFilled(activeForgeGroup.shape, shapeX, shapeY)}
											></div>
										{/each}
									{/each}
								</div>
							</div>

							<div class="forge-card-stats">
								<div class="forge-detail-card">
									<span>Shape</span>
									<strong>{getShapeLabel(activeForgeGroup.shape)}</strong>
								</div>
								<div class="forge-detail-card">
									<span>Copies</span>
									<strong>{activeForgeGroup.totalCount}</strong>
								</div>
								<div class="forge-detail-card">
									<span>Ready</span>
									<strong>{activeForgeGroup.availableCount}</strong>
								</div>
								<div class="forge-detail-card">
									<span>Equipped</span>
									<strong>{activeForgeGroup.equippedCount}</strong>
								</div>
								{#if activeForgeGroup.baseDamage}
									<div class="forge-detail-card">
										<span>Damage</span>
										<strong>{activeForgeGroup.baseDamage}</strong>
									</div>
								{/if}
								{#if activeForgeGroup.attack}
									<div class="forge-detail-card">
										<span>Cadence</span>
										<strong>
											Every {formatCycleThreshold(activeForgeGroup.attack)} cycle{formatCycleThreshold(
												activeForgeGroup.attack
											) === '1'
												? ''
												: 's'}
										</strong>
									</div>
									<div class="forge-detail-card">
										<span>Attack</span>
										<strong>{formatAttackLabel(activeForgeGroup.attack.kind)}</strong>
									</div>
								{/if}
							</div>
						</div>

						<p class="forge-weapon-summary">{activeForgeGroup.effectSummary}</p>

						<div class="forge-weapon-meta">
							<span>{activeForgeGroup.availableCount} ready</span>
							<span>{activeForgeGroup.equippedCount} equipped</span>
							<span
								>{activeForgeGroup.upgradeLevel > 0
									? formatUpgradeLevel(activeForgeGroup.upgradeLevel)
									: 'Base tier'}</span
							>
							<span>
								{#if activeForgeGroup.isMaxUpgradeLevel}
									Maxed
								{:else if activeForgeGroup.nextUpgradeCost !== null}
									{activeForgeGroup.nextUpgradeCost} Scrap
								{:else}
									No upgrade
								{/if}
							</span>
						</div>

						<div class="forge-action-grid">
							<div class="forge-action-card">
								<span>Scrap bay</span>
								<strong>{activeForgeScrapableCount} available</strong>
								<p>Break down unequipped copies for scrap without leaving the forge.</p>
								<button
									class="forge-scrap-button"
									type="button"
									disabled={activeForgeScrapableCount < 1 || isFavorite(activeForgeGroup.groupId)}
									onclick={() => openScrapDialog(activeForgeGroup)}
								>
									{#if isFavorite(activeForgeGroup.groupId)}
										Favorited weapons cannot be scrapped
									{:else}
										Scrap {activeForgeScrapableCount}
									{/if}
								</button>
							</div>

							<div class="forge-action-card">
								<span>Upgrade hammer</span>
								<strong>
									{#if activeForgeGroup.isMaxUpgradeLevel}
										Fully upgraded
									{:else if activeForgeGroup.nextUpgradeCost !== null}
										Next tier for {activeForgeGroup.nextUpgradeCost} Scrap
									{:else}
										Upgrade unavailable
									{/if}
								</strong>
								<p>Load the weapon into the forge and push it into the next tier.</p>
								{#if activeForgeWeaponInstanceId}
									<form
										method="post"
										action="?/upgradeWeapon"
										class="forge-upgrade-form"
										use:enhance={handleUpgradeSubmit}
									>
										<input
											type="hidden"
											name="weaponInstanceId"
											value={activeForgeWeaponInstanceId}
										/>
										<button
											class="forge-upgrade-button"
											type="submit"
											disabled={activeForgeGroup.isMaxUpgradeLevel ||
												activeForgeGroup.nextUpgradeCost === null}
										>
											{#if activeForgeGroup.isMaxUpgradeLevel}
												Weapon fully upgraded
											{:else if activeForgeGroup.nextUpgradeCost !== null}
												Upgrade for {activeForgeGroup.nextUpgradeCost} Scrap
											{:else}
												Upgrade unavailable
											{/if}
										</button>
									</form>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="forge-workspace-empty">
						<p class="eyebrow">Forge idle</p>
						<h3>Drag a weapon into the forge</h3>
						<p>
							Use the compact stock list on the left. Clicking a weapon also loads it into the forge
							for touch devices.
						</p>
					</div>
				{/if}
			</section>
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
						<span>Owned</span>
						<strong>{scrapDialog.totalCount}</strong>
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
					Any unequipped {formatRarityLabel(scrapDialog.rarity).toLowerCase()} item can be scrapped from
					the available pool. Starter pea shooters remain protected.
				</p>

				{#if isUpgradedScrap}
					<p class="feedback neutral">
						This upgraded item refunds {scrapDialog.refundScrapPerItem} invested Scrap in addition to
						its base scrap value.
					</p>
				{/if}

				{#if isHighRarityScrap}
					<p class="feedback error">
						High-rarity scrapping is permanent. Double-check equipped coverage before continuing.
					</p>
				{/if}

				<form
					method="post"
					action="?/scrapItems"
					class="scrap-form"
					use:enhance={handleScrapSubmit}
				>
					<input type="hidden" name="definitionId" value={scrapDialog.definitionId} />
					{#if scrapDialog.weaponInstanceId}
						<input type="hidden" name="weaponInstanceId" value={scrapDialog.weaponInstanceId} />
					{/if}

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

					{#if requiresScrapConfirmation}
						<label class="scrap-confirmation">
							<input
								type="checkbox"
								name="confirmHighRarity"
								value="yes"
								bind:checked={confirmHighRarityScrap}
							/>
							<span>
								Confirm scrapping this {scrapDialog.isUpgraded
									? 'upgraded '
									: ''}{scrapDialog.rarity}
								item.
							</span>
						</label>
					{/if}

					<div class="scrap-actions">
						<button class="ghost" type="button" onclick={closeScrapDialog}>Cancel</button>
						<button
							class="save"
							type="submit"
							disabled={requiresScrapConfirmation && !confirmHighRarityScrap}
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
	.forge-page {
		min-height: 100%;
		position: relative;
	}

	.forge-page::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 18%),
			repeating-linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.02) 0,
				rgba(255, 255, 255, 0.02) 1px,
				transparent 1px,
				transparent 80px
			);
		opacity: 0.3;
	}

	.shell {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: none;
		margin: 0;
		padding: 0.75rem;
		box-sizing: border-box;
		display: grid;
		gap: 0.75rem;
	}

	.panel,
	.feedback {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.panel {
		padding: 1rem;
		display: grid;
		gap: 0.85rem;
	}

	.forge-toolbar,
	.forge-filter-panel {
		background:
			radial-gradient(circle at top right, rgba(249, 115, 22, 0.14), transparent 34%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
			rgba(10, 10, 10, 0.94);
	}

	.eyebrow,
	.forge-detail-card span,
	.inventory-search span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.7rem;
		font-weight: 700;
		color: #c7b6a0;
	}

	.forge-weapon-rarity {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.7rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--forge-rarity-accent) 72%, white);
	}

	.eyebrow,
	.section-head p,
	.feedback,
	.forge-weapon-summary,
	.upgrade-pill {
		margin: 0;
	}

	h1,
	h2,
	h3 {
		margin: 0;
	}

	h1 {
		font-size: 2rem;
	}

	.section-head {
		display: grid;
		gap: 0.35rem;
	}

	.section-head p,
	.forge-weapon-summary,
	.forge-weapon-role {
		color: #d7ccc2;
	}

	.forge-grid {
		display: grid;
		grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
		gap: 0.75rem;
		align-items: start;
	}

	.forge-list-panel,
	.forge-filter-panel,
	.forge-weapon-list,
	.forge-filter-summary,
	.toolbox-controls {
		display: grid;
		gap: 0.75rem;
	}

	.forge-weapon-list {
		align-content: start;
		max-height: calc(100vh - 18rem);
		overflow: auto;
		padding-right: 0.2rem;
	}

	.forge-filter-panel {
		align-content: start;
	}

	.inventory-search {
		display: grid;
		gap: 0.35rem;
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

	.sort-chip-row,
	.filter-chip-row,
	.rarity-chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.filter-chip,
	.favorite-button {
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

	.favorite-button.active {
		border-color: rgba(255, 214, 102, 0.45);
		background: rgba(255, 214, 102, 0.16);
		color: #ffd666;
	}

	.rarity-chip.rarity-normal.active-chip {
		border-color: rgba(240, 244, 248, 0.45);
		background: rgba(240, 244, 248, 0.16);
	}

	.rarity-chip.rarity-magic.active-chip {
		border-color: rgba(170, 206, 255, 0.45);
		background: rgba(170, 206, 255, 0.16);
	}

	.rarity-chip.rarity-rare.active-chip {
		border-color: rgba(255, 232, 153, 0.45);
		background: rgba(255, 232, 153, 0.16);
	}

	.rarity-chip.rarity-exotic.active-chip {
		border-color: rgba(255, 170, 170, 0.45);
		background: rgba(255, 170, 170, 0.16);
	}

	.rarity-chip.rarity-legendary.active-chip {
		border-color: rgba(224, 156, 92, 0.45);
		background: rgba(224, 156, 92, 0.16);
	}

	.feedback {
		padding: 0.8rem 0.9rem;
	}

	.feedback.error {
		color: #ffb3b3;
		background: rgba(255, 96, 96, 0.08);
	}

	.feedback.success {
		background: rgba(249, 115, 22, 0.12);
		color: #ffd8b4;
	}

	.feedback.neutral {
		background: rgba(255, 255, 255, 0.05);
	}

	.forge-weapon-card {
		padding: 0.9rem;
		border-radius: 0.95rem;
		border: 1px solid
			color-mix(
				in srgb,
				var(--forge-rarity-accent, rgba(255, 255, 255, 0.16)) 40%,
				rgba(255, 255, 255, 0.08)
			);
		background:
			radial-gradient(
				circle at top right,
				color-mix(in srgb, var(--forge-rarity-accent, rgba(249, 115, 22, 0.18)) 18%, transparent),
				transparent 42%
			),
			linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
			rgba(255, 255, 255, 0.02);
		color: #f5f5f5;
		text-align: left;
		font: inherit;
		display: grid;
		gap: 0.65rem;
	}

	.forge-workspace-panel {
		min-height: 42rem;
		align-content: start;
		background:
			radial-gradient(circle at top center, rgba(249, 115, 22, 0.16), transparent 24%),
			radial-gradient(circle at bottom center, rgba(255, 120, 42, 0.1), transparent 30%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
			rgba(10, 10, 10, 0.94);
	}

	.forge-workspace-panel.drop-active {
		border-color: rgba(249, 115, 22, 0.42);
		box-shadow:
			0 0 0 1px rgba(249, 115, 22, 0.28),
			0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.forge-workspace-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.forge-drop-hint {
		min-width: 12rem;
		padding: 0.85rem 1rem;
		border-radius: 1rem;
		border: 1px dashed rgba(255, 184, 107, 0.3);
		background: rgba(255, 255, 255, 0.03);
		color: #f4d7b8;
		text-align: center;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.forge-weapon-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem;
		padding: 0.45rem;
		border-radius: 0.95rem;
		border: 1px solid
			color-mix(
				in srgb,
				var(--forge-rarity-accent, rgba(255, 255, 255, 0.16)) 28%,
				rgba(255, 255, 255, 0.08)
			);
		background:
			radial-gradient(
				circle at top right,
				color-mix(in srgb, var(--forge-rarity-accent, rgba(249, 115, 22, 0.16)) 14%, transparent),
				transparent 44%
			),
			rgba(255, 255, 255, 0.025);
	}

	.forge-weapon-row.active-forge-row {
		border-color: color-mix(in srgb, var(--forge-rarity-accent) 56%, white);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--forge-rarity-accent) 32%, transparent);
	}

	.forge-weapon-row.dragging {
		opacity: 0.66;
	}

	.forge-row-select {
		padding: 0.55rem 0.7rem;
		border: 0;
		border-radius: 0.75rem;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: grab;
		display: grid;
		gap: 0.55rem;
	}

	.forge-row-select:active {
		cursor: grabbing;
	}

	.forge-row-copy {
		display: grid;
		gap: 0.18rem;
	}

	.forge-row-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.forge-row-meta span {
		padding: 0.25rem 0.45rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.06);
		font-size: 0.72rem;
		color: #e8ddd0;
	}

	.forge-workspace-empty {
		min-height: 30rem;
		border-radius: 1rem;
		border: 1px dashed rgba(255, 184, 107, 0.24);
		background: rgba(255, 255, 255, 0.025);
		display: grid;
		place-items: center;
		text-align: center;
		padding: 1.5rem;
		gap: 0.5rem;
	}

	.forge-workspace-empty p,
	.forge-action-card p {
		margin: 0;
		color: #d7ccc2;
	}

	.forge-action-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.forge-action-card {
		padding: 0.9rem;
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--forge-rarity-accent) 20%, rgba(255, 255, 255, 0.08));
		background: color-mix(in srgb, var(--forge-rarity-accent) 6%, rgba(255, 255, 255, 0.025));
		display: grid;
		gap: 0.55rem;
	}

	.forge-action-card span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.7rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--forge-rarity-accent) 62%, white);
	}

	.forge-action-card strong {
		color: #fff2df;
	}

	.forge-weapon-card.is-maxed {
		opacity: 0.88;
	}

	.forge-weapon-card-head,
	.forge-card-middle,
	.forge-weapon-card-actions,
	.forge-filter-summary {
		display: flex;
		gap: 0.75rem;
	}

	.forge-weapon-card-head,
	.forge-filter-summary {
		justify-content: space-between;
		align-items: start;
	}

	.forge-weapon-role {
		margin: 0.25rem 0 0;
		font-size: 0.84rem;
	}

	.upgrade-pill {
		padding: 0.35rem 0.55rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--forge-rarity-accent) 32%, transparent);
		background: color-mix(in srgb, var(--forge-rarity-accent) 14%, rgba(255, 255, 255, 0.03));
		color: color-mix(in srgb, var(--forge-rarity-accent) 78%, white);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.forge-card-middle {
		align-items: stretch;
	}

	.forge-card-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 0.55rem;
		flex: 1;
	}

	.forge-weapon-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.forge-weapon-meta span,
	.forge-detail-card {
		padding: 0.55rem 0.65rem;
		border-radius: 0.85rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.forge-weapon-meta span {
		font-size: 0.78rem;
		color: #f4e7d7;
	}

	.forge-shape-stage {
		padding: 0.8rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--forge-rarity-accent) 5%, rgba(255, 255, 255, 0.02));
		border: 1px solid color-mix(in srgb, var(--forge-rarity-accent) 18%, rgba(255, 255, 255, 0.06));
		align-self: start;
	}

	.forge-shape-grid {
		display: grid;
		gap: 0.35rem;
	}

	.forge-shape-cell {
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 0.35rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.forge-shape-cell.filled {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--forge-rarity-accent) 88%, white),
			color-mix(in srgb, var(--forge-rarity-accent) 72%, black)
		);
		border-color: color-mix(in srgb, var(--forge-rarity-accent) 42%, white);
		box-shadow: 0 0 16px color-mix(in srgb, var(--forge-rarity-accent) 24%, transparent);
	}

	.forge-detail-card {
		display: grid;
		gap: 0.2rem;
	}

	.forge-detail-card strong {
		color: #fff2df;
	}

	.forge-upgrade-form {
		margin: 0;
	}

	.forge-scrap-button,
	.ghost,
	.modal-close {
		min-height: 1.95rem;
		padding: 0 0.75rem;
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

	.forge-scrap-button {
		justify-self: start;
		border-color: color-mix(in srgb, var(--forge-rarity-accent) 28%, rgba(255, 255, 255, 0.12));
		background: color-mix(in srgb, var(--forge-rarity-accent) 12%, rgba(255, 255, 255, 0.04));
		color: color-mix(in srgb, var(--forge-rarity-accent) 72%, white);
	}

	.forge-upgrade-button {
		width: 100%;
		min-height: 2.85rem;
		padding: 0.8rem 1rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--forge-rarity-accent) 38%, rgba(255, 255, 255, 0.1));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--forge-rarity-accent) 24%, rgba(255, 255, 255, 0.03)),
			color-mix(in srgb, var(--forge-rarity-accent) 18%, rgba(0, 0, 0, 0.2))
		);
		color: color-mix(in srgb, var(--forge-rarity-accent) 24%, #fff2df);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.forge-upgrade-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.scrap-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(5, 5, 5, 0.72);
		backdrop-filter: blur(10px);
	}

	.scrap-modal {
		width: min(100%, 34rem);
	}

	.scrap-modal-head,
	.scrap-actions,
	.scrap-quantity-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.scrap-modal-eyebrow,
	.scrap-copy,
	.scrap-confirmation span,
	.stat-card span,
	.scrap-quantity-field span {
		margin: 0;
	}

	.scrap-modal-eyebrow,
	.stat-card span,
	.scrap-quantity-field span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.7rem;
		font-weight: 700;
		color: #c7b6a0;
	}

	.scrap-stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 0.75rem;
	}

	.stat-card,
	.scrap-total-card {
		padding: 0.8rem;
		border-radius: 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.25rem;
	}

	.stat-card strong,
	.scrap-total-card strong {
		color: #fff2df;
	}

	.scrap-copy {
		color: #d7ccc2;
	}

	.scrap-form,
	.scrap-quantity-field,
	.scrap-confirmation {
		display: grid;
		gap: 0.75rem;
	}

	.scrap-quantity-controls input {
		width: 5rem;
		min-height: 2.2rem;
		padding: 0.4rem 0.55rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		font: inherit;
		text-align: center;
	}

	.scrap-confirmation {
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		color: #f5f5f5;
	}

	.quantity-button {
		min-width: 2.4rem;
		padding: 0;
	}

	.save {
		min-height: 2.4rem;
		padding: 0 0.95rem;
		border-radius: 999px;
		border: 1px solid rgba(249, 115, 22, 0.32);
		background: linear-gradient(180deg, rgba(249, 115, 22, 0.24), rgba(180, 83, 9, 0.24));
		color: #fff2df;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.save:disabled,
	.ghost:disabled,
	.forge-scrap-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	@media (max-width: 860px) {
		.forge-grid,
		.forge-action-grid,
		.forge-card-middle,
		.forge-filter-summary,
		.forge-weapon-card-head {
			display: grid;
		}

		.forge-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.forge-weapon-list {
			max-height: none;
			overflow: visible;
			padding-right: 0;
		}

		.forge-workspace-head {
			flex-direction: column;
		}

		.forge-drop-hint {
			min-width: 0;
			width: 100%;
		}

		.scrap-modal-head,
		.scrap-actions,
		.scrap-quantity-controls {
			align-items: stretch;
			flex-wrap: wrap;
		}
	}
</style>
