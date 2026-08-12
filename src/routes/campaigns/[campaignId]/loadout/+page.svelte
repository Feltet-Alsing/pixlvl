<script lang="ts">
	import { resolve } from '$app/paths';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import type { WeaponDefinition } from '$lib/data/types';
	import type { PageProps } from './$types';

	const LOADOUT_ROW_COUNT = 5;
	const LOADOUT_COLUMN_COUNT = 8;

	interface LoadoutRow {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		x: number;
		y: number;
	}

	interface UnequippedOwnedWeaponRow {
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
	}

	interface LoadoutGridCell {
		x: number;
		y: number;
		occupiedByName: string | null;
		occupiedRarity: WeaponDefinition['rarity'] | null;
		canPlaceSelectedWeapon: boolean;
	}

	let { data, form }: PageProps = $props();
	let selectedPlacementWeaponInstanceId = $state<string | null>(null);

	let weaponDefinitionById = $derived(
		Object.fromEntries(
			data.weaponPool.map((weapon) => [weapon.id, weapon] satisfies [string, WeaponDefinition])
		) as Record<string, WeaponDefinition>
	);
	let ownedWeapons = $derived(data.gameState?.pixlState.ownedWeapons ?? []);
	let loadoutPlacements = $derived(data.gameState?.pixlState.loadoutPlacements ?? []);
	let currentLoadoutRows = $derived.by(() => {
		const ownedWeaponById = Object.fromEntries(
			ownedWeapons.map((weapon) => [weapon.instanceId, weapon])
		) as Record<string, (typeof ownedWeapons)[number]>;

		return loadoutPlacements
			.map((placement) => {
				const ownedWeapon = ownedWeaponById[placement.weaponInstanceId];
				const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

				if (!ownedWeapon || !definition) {
					return null;
				}

				return {
					weaponInstanceId: placement.weaponInstanceId,
					definitionId: definition.id,
					name: definition.name,
					rarity: definition.rarity,
					x: placement.x,
					y: placement.y
				} satisfies LoadoutRow;
			})
			.filter((entry): entry is LoadoutRow => entry !== null)
			.sort(
				(left, right) => left.y - right.y || left.x - right.x || left.name.localeCompare(right.name)
			);
	});
	let equippedWeaponInstanceIds = $derived(
		Object.fromEntries(
			loadoutPlacements.map((placement) => [placement.weaponInstanceId, true])
		) as Record<string, true>
	);
	let unequippedOwnedWeaponRows = $derived.by(() => {
		return ownedWeapons
			.map((weapon) => {
				if (equippedWeaponInstanceIds[weapon.instanceId]) {
					return null;
				}

				const definition = weaponDefinitionById[weapon.definitionId];

				if (!definition) {
					return null;
				}

				return {
					weaponInstanceId: weapon.instanceId,
					definitionId: definition.id,
					name: definition.name,
					rarity: definition.rarity
				} satisfies UnequippedOwnedWeaponRow;
			})
			.filter((entry): entry is UnequippedOwnedWeaponRow => entry !== null)
			.sort(
				(left, right) =>
					left.name.localeCompare(right.name) ||
					left.weaponInstanceId.localeCompare(right.weaponInstanceId)
			);
	});
	let selectedPlacementWeapon = $derived(
		unequippedOwnedWeaponRows.find(
			(weapon) => weapon.weaponInstanceId === selectedPlacementWeaponInstanceId
		) ?? null
	);
	let selectedPlacementDefinition = $derived(
		selectedPlacementWeapon ? weaponDefinitionById[selectedPlacementWeapon.definitionId] : null
	);
	let occupiedLoadoutCells = $derived.by(() => {
		const occupied: Record<
			string,
			{ occupiedByName: string; occupiedRarity: WeaponDefinition['rarity'] }
		> = {};

		for (const weapon of currentLoadoutRows) {
			const definition = weaponDefinitionById[weapon.definitionId];

			if (!definition) {
				continue;
			}

			for (const [cellX, cellY] of definition.shape.cells) {
				occupied[`${weapon.x + cellX}:${weapon.y + cellY}`] = {
					occupiedByName: weapon.name,
					occupiedRarity: weapon.rarity
				};
			}
		}

		return occupied;
	});
	let loadoutGridRows = $derived.by(() => {
		const selectedDefinition = selectedPlacementDefinition;

		return Array.from({ length: LOADOUT_ROW_COUNT }, (_, y) => {
			return Array.from({ length: LOADOUT_COLUMN_COUNT }, (_, x) => {
				const occupiedCell = occupiedLoadoutCells[`${x}:${y}`];
				const canPlaceSelectedWeapon =
					!occupiedCell && selectedDefinition
						? selectedDefinition.shape.cells.every(([cellX, cellY]) => {
								const gridX = x + cellX;
								const gridY = y + cellY;

								return (
									gridX >= 0 &&
									gridX < LOADOUT_COLUMN_COUNT &&
									gridY >= 0 &&
									gridY < LOADOUT_ROW_COUNT &&
									!occupiedLoadoutCells[`${gridX}:${gridY}`]
								);
							})
						: false;

				return {
					x,
					y,
					occupiedByName: occupiedCell?.occupiedByName ?? null,
					occupiedRarity: occupiedCell?.occupiedRarity ?? null,
					canPlaceSelectedWeapon
				} satisfies LoadoutGridCell;
			});
		});
	});
	let loadoutTooltip = $derived(
		currentLoadoutRows.map((weapon) => `${weapon.name} (${weapon.x}, ${weapon.y})`).join('\n') ||
			'No equipped weapons'
	);
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
				Weapons and placement live on a separate route so the whole 5 x 8 grid can be read at a
				glance. Hover equipped weapons to inspect them.
			</p>
		</section>

		<section class="grid">
			<div class="panel">
				<div class="section-head">
					<h2>Equipped weapons</h2>
					<p>Hover any row to inspect the exact placement.</p>
				</div>

				{#if form?.loadoutError}
					<p class="feedback error">{form.loadoutError}</p>
				{:else if form?.loadoutSuccess}
					<p class="feedback success">{form.loadoutSuccess}</p>
				{/if}

				{#if currentLoadoutRows.length > 0}
					<div class="summary-list">
						{#each currentLoadoutRows as weapon (weapon.weaponInstanceId)}
							<form
								class={`summary-row rarity-${weapon.rarity}`}
								method="post"
								action="?/removeLoadoutPlacement"
								title={`${weapon.name} at ${weapon.x}, ${weapon.y}`}
							>
								<input type="hidden" name="weaponInstanceId" value={weapon.weaponInstanceId} />
								<span>{weapon.name}</span>
								<strong>({weapon.x}, {weapon.y})</strong>
								<button class="remove" type="submit">Remove</button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="feedback neutral">No equipped weapons yet.</p>
				{/if}
			</div>

			<div class="panel">
				<div class="section-head">
					<h2>Placement grid</h2>
					<p>Select an unequipped weapon, then use a highlighted anchor cell.</p>
				</div>

				{#if unequippedOwnedWeaponRows.length > 0}
					<div class="summary-list">
						{#each unequippedOwnedWeaponRows as weapon (weapon.weaponInstanceId)}
							<button
								class:active={selectedPlacementWeaponInstanceId === weapon.weaponInstanceId}
								class={`summary-row picker-row rarity-${weapon.rarity}`}
								type="button"
								onclick={() => (selectedPlacementWeaponInstanceId = weapon.weaponInstanceId)}
							>
								<span>{weapon.name}</span>
								<strong>{weapon.weaponInstanceId.slice(-6)}</strong>
							</button>
						{/each}
					</div>
				{:else}
					<p class="feedback neutral">All owned weapons are already equipped.</p>
				{/if}

				{#if selectedPlacementDefinition}
					<div class="weapon-shape-preview">
						<div
							class="shape-grid"
							style:grid-template-columns={`repeat(${selectedPlacementDefinition.shape.width}, 1fr)`}
						>
							{#each Array.from( { length: selectedPlacementDefinition.shape.height } ) as _, shapeY (shapeY)}
								{#each Array.from( { length: selectedPlacementDefinition.shape.width } ) as _, shapeX (shapeX)}
									<div
										class:filled={selectedPlacementDefinition.shape.cells.some(
											([cellX, cellY]) => cellX === shapeX && cellY === shapeY
										)}
										class="shape-cell"
									></div>
								{/each}
							{/each}
						</div>
						<p class="weapon-role">{selectedPlacementDefinition.role}</p>
					</div>
				{/if}

				<div
					class="loadout-grid"
					style:grid-template-columns={`repeat(${LOADOUT_COLUMN_COUNT}, minmax(0, 1fr))`}
				>
					{#each loadoutGridRows as row, rowIndex (rowIndex)}
						{#each row as cell (`${rowIndex}:${cell.x}:${cell.y}`)}
							{#if cell.occupiedByName}
								<div
									class={`grid-cell occupied rarity-${cell.occupiedRarity ?? 'normal'}`}
									title={cell.occupiedByName}
								>
									<span>{cell.occupiedByName.slice(0, 2).toUpperCase()}</span>
								</div>
							{:else if selectedPlacementWeapon && cell.canPlaceSelectedWeapon}
								<form method="post" action="?/placeLoadoutWeapon">
									<input
										type="hidden"
										name="weaponInstanceId"
										value={selectedPlacementWeapon.weaponInstanceId}
									/>
									<input type="hidden" name="x" value={cell.x} />
									<input type="hidden" name="y" value={cell.y} />
									<button
										class="grid-cell anchor"
										type="submit"
										aria-label={`Place at ${cell.x}, ${cell.y}`}
									>
										<span>+</span>
									</button>
								</form>
							{:else}
								<div class="grid-cell empty"></div>
							{/if}
						{/each}
					{/each}
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
	.summary-row,
	.remove,
	.anchor {
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

	.hero h1,
	.section-head h2 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow,
	.summary-row span,
	.section-head p {
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

	.grid {
		display: grid;
		grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
		gap: 1rem;
	}

	.summary-list,
	.weapon-shape-preview {
		display: grid;
		gap: 0.65rem;
	}

	.summary-row {
		padding: 0.85rem;
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: center;
		color: #f5f5f5;
	}

	.picker-row {
		width: 100%;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.picker-row.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}

	.remove {
		min-height: 2rem;
		padding: 0.35rem 0.65rem;
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	.shape-grid,
	.loadout-grid {
		display: grid;
		gap: 0.3rem;
	}

	.shape-grid {
		width: fit-content;
	}

	.shape-cell,
	.grid-cell {
		aspect-ratio: 1;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
	}

	.shape-cell.filled {
		background: rgba(103, 217, 111, 0.18);
		border-color: rgba(103, 217, 111, 0.42);
	}

	.loadout-grid {
		grid-auto-rows: minmax(2.6rem, 1fr);
	}

	.grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #f5f5f5;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.grid-cell.empty {
		opacity: 0.45;
	}

	.anchor {
		width: 100%;
		height: 100%;
		padding: 0;
		cursor: pointer;
		background: rgba(103, 217, 111, 0.12);
		border-color: rgba(103, 217, 111, 0.42);
		color: #c9f8cc;
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

	.summary-row.rarity-normal,
	.grid-cell.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
	}

	.summary-row.rarity-magic,
	.grid-cell.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
	}

	.summary-row.rarity-rare,
	.grid-cell.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
	}

	.summary-row.rarity-exotic,
	.grid-cell.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
	}

	.summary-row.rarity-legendary,
	.grid-cell.rarity-legendary {
		border-color: rgba(179, 132, 62, 0.28);
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
