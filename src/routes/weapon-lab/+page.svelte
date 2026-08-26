<script lang="ts">
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { allWeaponDefinitions, getCombatProfile } from '$lib/data';
	import {
		createWeaponLabLevel,
		createWeaponLabPixlState,
		weaponLabCampaign,
		weaponLabCombatProfiles,
		weaponLabPresets
	} from '$lib/game/weapon-lab';
	import { createArenaCombatSketch } from '$lib/p5/arena-combat-sketch';

	import type { WeaponDefinition } from '$lib/data/types';

	type WeaponLabCombatState = Parameters<
		NonNullable<NonNullable<Parameters<typeof createArenaCombatSketch>[2]>['onCombatStateChange']>
	>[0];

	const WEAPON_LAB_SELECTION_STORAGE_KEY = 'pixlvl-weapon-lab-selection';
	const defaultWeapon = allWeaponDefinitions[0] as WeaponDefinition;
	const defaultCombatProfileId = weaponLabCombatProfiles[0].id;
	const defaultPresetId = weaponLabPresets[0].id;
	const initialSelectedWeaponId = (() => {
		if (typeof sessionStorage === 'undefined') {
			return defaultWeapon.id;
		}

		const savedWeaponId = sessionStorage.getItem(WEAPON_LAB_SELECTION_STORAGE_KEY);

		if (!savedWeaponId) {
			return defaultWeapon.id;
		}

		return allWeaponDefinitions.some((weapon) => weapon.id === savedWeaponId)
			? savedWeaponId
			: defaultWeapon.id;
	})();

	let searchQuery = $state('');
	let selectedWeaponId = $state(initialSelectedWeaponId);
	let combatState = $state.raw<WeaponLabCombatState | null>(null);

	let filteredWeapons = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		if (!query) {
			return allWeaponDefinitions;
		}

		return allWeaponDefinitions.filter((weapon) => {
			const haystack = `${weapon.name} ${weapon.id} ${weapon.role}`.toLowerCase();
			return haystack.includes(query);
		});
	});

	let selectedWeapon = $derived.by<WeaponDefinition>(
		() =>
			allWeaponDefinitions.find((weapon) => weapon.id === selectedWeaponId) ??
			filteredWeapons[0] ??
			defaultWeapon
	);
	let selectedCombatProfile = $derived(getCombatProfile(defaultCombatProfileId));
	let selectedLevel = $derived(createWeaponLabLevel(defaultPresetId));
	let selectedSpecialType = $derived(selectedWeapon.attack.special?.type ?? 'none');
	let selectedCycleInterval = $derived(selectedWeapon.attack.cycleInterval ?? 1);
	let selectedSpreadLabel = $derived(
		selectedWeapon.attack.projectileCount > 1
			? `${selectedWeapon.attack.spreadDegrees ?? 0} deg`
			: 'N/A'
	);
	let requiredInfusionCount = $derived(selectedWeapon.attack.requiredInfusionCount ?? 0);
	let selectedDamagePerCycle = $derived(
		selectedWeapon.baseDamage * selectedWeapon.attack.projectileCount
	);
	let selectedDamagePerSecond = $derived(selectedDamagePerCycle / selectedCycleInterval);
	let syntheticPixlState = $derived.by(() =>
		createWeaponLabPixlState([selectedWeapon], {
			targeting: 'current-target',
			xp: 0,
			defence: 0,
			agility: 0
		})
	);
	let arenaRemountKey = $derived.by(() =>
		[selectedWeapon.id, selectedCombatProfile.id, selectedLevel.campaignLevel].join(':')
	);
	let arenaSketch = $derived.by(() =>
		createArenaCombatSketch(weaponLabCampaign, selectedCombatProfile, {
			rewardsEnabled: false,
			showLoadoutSketch: false,
			pixlState: syntheticPixlState,
			levelResolver: () => selectedLevel,
			onCombatStateChange: (state) => {
				combatState = state;
			}
		})
	);
	let damageRows = $derived(combatState?.weaponDamageRows ?? []);

	function updateSearchQuery(event: Event) {
		searchQuery = (event.currentTarget as HTMLInputElement).value;
	}

	function updateWeapon(event: Event) {
		selectedWeaponId = (event.currentTarget as HTMLSelectElement).value;

		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem(WEAPON_LAB_SELECTION_STORAGE_KEY, selectedWeaponId);
		}

		combatState = null;
	}
</script>

<svelte:head>
	<title>Weapon Lab</title>
</svelte:head>

<div class="lab-shell">
	<section class="lab-layout">
		<aside class="control-column" aria-label="Weapon lab controls">
			<div class="panel-block">
				<h1>Weapon Lab</h1>
				<label class="field-label" for="weapon-search">Weapon search</label>
				<input
					id="weapon-search"
					class="text-input"
					type="search"
					placeholder="Search name, id, or role"
					value={searchQuery}
					oninput={updateSearchQuery}
				/>
				<label class="field-label" for="weapon-select">Weapon</label>
				<select
					id="weapon-select"
					class="select-input"
					value={selectedWeaponId}
					onchange={updateWeapon}
				>
					{#each filteredWeapons as weapon (weapon.id)}
						<option value={weapon.id}>{weapon.name}</option>
					{/each}
				</select>
			</div>

			<div class="panel-block">
				<h2>Weapon Spec</h2>
				<p class="role-copy">{selectedWeapon.role}</p>
				<dl>
					<div>
						<dt>Id</dt>
						<dd>{selectedWeapon.id}</dd>
					</div>
					<div>
						<dt>Rarity</dt>
						<dd>{selectedWeapon.rarity}</dd>
					</div>
					<div>
						<dt>Base damage</dt>
						<dd>{selectedWeapon.baseDamage}</dd>
					</div>
					<div>
						<dt>Cycle interval</dt>
						<dd>{selectedCycleInterval}</dd>
					</div>
					<div>
						<dt>Projectile count</dt>
						<dd>{selectedWeapon.attack.projectileCount}</dd>
					</div>
					<div>
						<dt>Projectile speed</dt>
						<dd>{selectedWeapon.projectileSpeed}</dd>
					</div>
					<div>
						<dt>Targeting</dt>
						<dd>{selectedWeapon.attack.targeting}</dd>
					</div>
					<div>
						<dt>Special</dt>
						<dd>{selectedSpecialType}</dd>
					</div>
					<div>
						<dt>Required infusion</dt>
						<dd>{selectedWeapon.attack.requiredInfusion ?? 'None'}</dd>
					</div>
					<div>
						<dt>Infusion count</dt>
						<dd>{requiredInfusionCount || 'N/A'}</dd>
					</div>
					<div>
						<dt>Spread</dt>
						<dd>{selectedSpreadLabel}</dd>
					</div>
					<div>
						<dt>Raw damage / cycle</dt>
						<dd>{selectedDamagePerCycle.toFixed(1)}</dd>
					</div>
					<div>
						<dt>Raw damage / second</dt>
						<dd>{selectedDamagePerSecond.toFixed(1)}</dd>
					</div>
				</dl>
			</div>

			<div class="panel-block">
				<h2>Damage Readout</h2>
				{#if damageRows.length > 0}
					<div class="damage-header">
						<strong>{damageRows[0].name}</strong>
						<span>{damageRows[0].rarity}</span>
					</div>
					<p class="helper-text">Placement {damageRows[0].placement}</p>
					<p class="big-metric">
						{damageRows[0].averageDamagePerCycle.toFixed(1)} avg damage / cycle
					</p>
					<ul class="damage-list">
						{#each damageRows as row (row.weaponInstanceId)}
							<li>
								<span>{row.name}</span>
								<strong>{row.averageDamagePerCycle.toFixed(1)}</strong>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="helper-text">Waiting for the first completed cycle to report damage.</p>
				{/if}
			</div>
		</aside>

		<div class="arena-panel">
			{#key arenaRemountKey}
				<P5Canvas sketch={arenaSketch} />
			{/key}
		</div>
	</section>
</div>

<style>
	:global(body) {
		background: #090b0f;
	}

	.lab-shell {
		max-width: 1440px;
		margin: 0 auto;
		padding: 1rem;
		color: #eef2f7;
	}

	.lab-layout {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.control-column {
		display: grid;
		gap: 1rem;
	}

	.panel-block,
	.arena-panel {
		background: rgba(16, 20, 28, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 18px;
	}

	.panel-block {
		padding: 1rem;
	}

	h1,
	h2,
	strong {
		font-family: 'Avenir Next', 'Segoe UI', sans-serif;
	}

	h1,
	h2 {
		margin: 0 0 0.75rem;
	}

	h1 {
		font-size: 1.2rem;
	}

	h2 {
		font-size: 1rem;
	}

	.field-label,
	dt {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(238, 242, 247, 0.56);
	}

	.text-input,
	.select-input {
		width: 100%;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(9, 13, 18, 0.84);
		color: #f8fafc;
		padding: 0.78rem 0.9rem;
		margin: 0.3rem 0 0;
		font: inherit;
	}

	.role-copy,
	.helper-text {
		margin: 0;
		line-height: 1.5;
		color: rgba(226, 232, 240, 0.74);
	}

	.role-copy {
		margin-bottom: 1rem;
	}

	dl {
		margin: 0;
		display: grid;
		gap: 0.7rem;
	}

	dl div,
	.damage-header,
	.damage-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.big-metric {
		margin: 0.75rem 0 0;
		font-size: 1.2rem;
		font-weight: 700;
	}

	.damage-list {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: grid;
		gap: 0.55rem;
	}

	.damage-list li {
		padding-top: 0.55rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.arena-panel {
		padding: 0.75rem;
		height: min(82vh, 920px);
		min-height: 560px;
		overflow: hidden;
	}

	.arena-panel :global(div) {
		height: 100%;
	}

	.arena-panel :global(canvas) {
		display: block;
	}

	@media (max-width: 960px) {
		.lab-layout {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.lab-shell {
			padding: 0.75rem;
		}

		.arena-panel {
			height: min(68vh, 620px);
			min-height: 420px;
		}
	}
</style>
