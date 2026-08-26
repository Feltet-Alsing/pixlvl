<script lang="ts">
	import { resolve } from '$app/paths';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { allWeaponDefinitions, getCombatProfile } from '$lib/data';
	import {
		createWeaponLabLevel,
		createWeaponLabPixlState,
		weaponLabCampaign,
		weaponLabCombatProfiles,
		weaponLabPresets,
		type WeaponLabPresetId
	} from '$lib/game/weapon-lab';
	import { createArenaCombatSketch } from '$lib/p5/arena-combat-sketch';

	import type { WeaponDefinition, WeaponTargetingKind } from '$lib/data/types';

	type WeaponLabCombatState = Parameters<
		NonNullable<NonNullable<Parameters<typeof createArenaCombatSketch>[2]>['onCombatStateChange']>
	>[0];

	const targetingModes: Array<{ value: WeaponTargetingKind; label: string }> = [
		{ value: 'current-target', label: 'Current target' },
		{ value: 'nearest-target', label: 'Nearest target' },
		{ value: 'furthest-target', label: 'Furthest target' },
		{ value: 'strongest-target', label: 'Strongest target' },
		{ value: 'weakest-target', label: 'Weakest target' }
	];

	const defaultWeapon = allWeaponDefinitions[0] as WeaponDefinition;

	let searchQuery = $state('');
	let selectedWeaponId = $state(defaultWeapon.id);
	let selectedCombatProfileId = $state(weaponLabCombatProfiles[0].id);
	let selectedPresetId = $state<WeaponLabPresetId>(weaponLabPresets[0].id);
	let selectedTargeting = $state<WeaponTargetingKind>('current-target');
	let xp = $state(0);
	let defence = $state(0);
	let agility = $state(0);
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
	let selectedCombatProfileOption = $derived.by(
		() =>
			weaponLabCombatProfiles.find((profile) => profile.id === selectedCombatProfileId) ??
			weaponLabCombatProfiles[0]
	);
	let selectedCombatProfile = $derived.by(() => getCombatProfile(selectedCombatProfileOption.id));
	let selectedPreset = $derived.by(
		() => weaponLabPresets.find((preset) => preset.id === selectedPresetId) ?? weaponLabPresets[0]
	);
	let selectedLevel = $derived.by(() => createWeaponLabLevel(selectedPreset.id));
	let syntheticPixlState = $derived.by(() =>
		createWeaponLabPixlState([selectedWeapon], {
			targeting: selectedTargeting,
			xp,
			defence,
			agility
		})
	);
	let arenaRemountKey = $derived.by(() =>
		[
			selectedWeapon.id,
			selectedCombatProfile.id,
			selectedPreset.id,
			selectedTargeting,
			xp,
			defence,
			agility
		].join(':')
	);
	let arenaSketch = $derived.by(() =>
		createArenaCombatSketch(weaponLabCampaign, selectedCombatProfile, {
			rewardsEnabled: false,
			showLoadoutSketch: false,
			pixlState: syntheticPixlState,
			levelResolver: () => createWeaponLabLevel(selectedPreset.id),
			onCombatStateChange: (state) => {
				combatState = state;
			}
		})
	);
	let statusLabel = $derived.by(() => {
		if (!combatState) return 'Booting lab simulation';
		if (combatState.status === 'defeated') return 'Pixl defeated. Adjust and rerun.';
		if (combatState.status === 'cleared') return 'Encounter cleared.';
		if (combatState.status === 'complete') return 'Simulation complete.';

		return 'Simulation running';
	});
	let remainingEnemies = $derived(combatState?.remainingEnemies ?? selectedLevel.totalEnemies);
	let latestCompletedCycle = $derived(combatState?.latestCompletedCycle ?? 0);
	let damageRows = $derived(combatState?.weaponDamageRows ?? []);

	function resetCombatState() {
		combatState = null;
	}

	function updateSearchQuery(event: Event) {
		searchQuery = (event.currentTarget as HTMLInputElement).value;
	}

	function updateWeapon(event: Event) {
		selectedWeaponId = (event.currentTarget as HTMLSelectElement).value;
		resetCombatState();
	}

	function updateCombatProfile(event: Event) {
		selectedCombatProfileId = (event.currentTarget as HTMLSelectElement).value;
		resetCombatState();
	}

	function updatePreset(event: Event) {
		selectedPresetId = (event.currentTarget as HTMLSelectElement).value as WeaponLabPresetId;
		resetCombatState();
	}

	function updateTargeting(event: Event) {
		selectedTargeting = (event.currentTarget as HTMLSelectElement).value as WeaponTargetingKind;
		resetCombatState();
	}

	function updateXp(event: Event) {
		xp = Number((event.currentTarget as HTMLInputElement).value);
		resetCombatState();
	}

	function updateDefence(event: Event) {
		defence = Number((event.currentTarget as HTMLInputElement).value);
		resetCombatState();
	}

	function updateAgility(event: Event) {
		agility = Number((event.currentTarget as HTMLInputElement).value);
		resetCombatState();
	}
</script>

<svelte:head>
	<title>Weapon Lab</title>
</svelte:head>

<div class="lab-shell">
	<header class="hero">
		<div>
			<p class="eyebrow">Authoring Lab</p>
			<h1>Weapon Lab</h1>
			<p class="lede">
				Rapid, non-persistent tuning space for single-weapon combat passes. Nothing here touches
				saved progression, rewards, or unlock state.
			</p>
		</div>
		<a class="back-link" href={resolve('/campaigns/5')}>Back to Campaigns</a>
	</header>

	<section class="summary-grid" aria-label="Weapon lab summary">
		<article>
			<span>Weapon</span>
			<strong>{selectedWeapon.name}</strong>
		</article>
		<article>
			<span>Profile</span>
			<strong>{selectedCombatProfileOption.name}</strong>
		</article>
		<article>
			<span>Preset</span>
			<strong>{selectedPreset.name}</strong>
		</article>
		<article>
			<span>Status</span>
			<strong>{statusLabel}</strong>
		</article>
	</section>

	<section class="lab-layout">
		<aside class="control-panel" aria-label="Weapon lab controls">
			<div class="panel-block">
				<h2>Weapon</h2>
				<label class="field-label" for="weapon-search">Search</label>
				<input
					id="weapon-search"
					class="text-input"
					type="search"
					placeholder="Search name, id, or role"
					value={searchQuery}
					oninput={updateSearchQuery}
				/>
				<label class="field-label" for="weapon-select">Selected weapon</label>
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
				<p class="helper-text">{selectedWeapon.role}</p>
			</div>

			<div class="panel-block">
				<h2>Scenario</h2>
				<label class="field-label" for="profile-select">Combat profile</label>
				<select
					id="profile-select"
					class="select-input"
					value={selectedCombatProfileId}
					onchange={updateCombatProfile}
				>
					{#each weaponLabCombatProfiles as profile (profile.id)}
						<option value={profile.id}>{profile.name}</option>
					{/each}
				</select>
				<p class="helper-text">{selectedCombatProfileOption.description}</p>
				<label class="field-label" for="preset-select">Enemy preset</label>
				<select
					id="preset-select"
					class="select-input"
					value={selectedPresetId}
					onchange={updatePreset}
				>
					{#each weaponLabPresets as preset (preset.id)}
						<option value={preset.id}>{preset.name}</option>
					{/each}
				</select>
				<p class="helper-text">{selectedPreset.description}</p>
				<label class="field-label" for="targeting-select">Targeting</label>
				<select
					id="targeting-select"
					class="select-input"
					value={selectedTargeting}
					onchange={updateTargeting}
				>
					{#each targetingModes as targetingMode (targetingMode.value)}
						<option value={targetingMode.value}>{targetingMode.label}</option>
					{/each}
				</select>
			</div>

			<div class="panel-block">
				<h2>Pixl Tuning</h2>
				<label class="field-label" for="xp-input">XP</label>
				<input
					id="xp-input"
					class="number-input"
					type="number"
					min="0"
					step="10"
					value={xp}
					oninput={updateXp}
				/>
				<label class="field-label" for="defence-input">Defence</label>
				<input
					id="defence-input"
					class="number-input"
					type="number"
					min="0"
					step="1"
					value={defence}
					oninput={updateDefence}
				/>
				<label class="field-label" for="agility-input">Agility</label>
				<input
					id="agility-input"
					class="number-input"
					type="number"
					min="0"
					step="1"
					value={agility}
					oninput={updateAgility}
				/>
			</div>

			<div class="panel-block compact-copy">
				<h2>Preset Notes</h2>
				<p>{selectedPreset.description}</p>
				<p>{selectedCombatProfileOption.description}</p>
				<p>Each control change remounts the arena so the sim reruns from a clean baseline.</p>
			</div>
		</aside>

		<div class="arena-column">
			<div class="arena-panel">
				{#key arenaRemountKey}
					<P5Canvas sketch={arenaSketch} />
				{/key}
			</div>

			<div class="telemetry-grid">
				<div class="panel-block">
					<h2>Combat Telemetry</h2>
					<dl>
						<div>
							<dt>Remaining enemies</dt>
							<dd>{remainingEnemies}</dd>
						</div>
						<div>
							<dt>Latest completed cycle</dt>
							<dd>{latestCompletedCycle}</dd>
						</div>
						<div>
							<dt>Wave composition</dt>
							<dd>{selectedLevel.totalEnemies} enemies</dd>
						</div>
						<div>
							<dt>Profile id</dt>
							<dd>{selectedCombatProfile.id}</dd>
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
			</div>
		</div>
	</section>
</div>

<style>
	:global(body) {
		background:
			radial-gradient(circle at top left, rgba(251, 191, 36, 0.18), transparent 28%),
			radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 30%),
			linear-gradient(180deg, #101218 0%, #090b0f 100%);
	}

	.lab-shell {
		max-width: 1360px;
		margin: 0 auto;
		padding: 2rem 1.2rem 3rem;
		color: #eef2f7;
	}

	.hero {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 1.5rem;
		margin-bottom: 1.25rem;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.72rem;
		color: #fbbf24;
	}

	h1,
	h2,
	strong {
		font-family: 'Avenir Next', 'Segoe UI', sans-serif;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.2rem, 3.6vw, 3.6rem);
	}

	.lede {
		margin: 0.8rem 0 0;
		max-width: 48rem;
		line-height: 1.55;
		color: rgba(238, 242, 247, 0.8);
	}

	.back-link {
		color: #f8d9a1;
		text-decoration: none;
		border: 1px solid rgba(248, 217, 161, 0.28);
		padding: 0.72rem 1rem;
		border-radius: 999px;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
		margin-bottom: 1rem;
	}

	.summary-grid article,
	.panel-block,
	.arena-panel {
		background: rgba(16, 20, 28, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 22px;
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.26);
		backdrop-filter: blur(16px);
	}

	.summary-grid article {
		padding: 1rem 1.1rem;
		display: grid;
		gap: 0.35rem;
	}

	.summary-grid span,
	dt,
	.field-label {
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(238, 242, 247, 0.56);
	}

	.lab-layout {
		display: grid;
		grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.control-panel,
	.telemetry-grid,
	.arena-column {
		display: grid;
		gap: 1rem;
	}

	.panel-block {
		padding: 1.05rem 1.1rem;
	}

	.arena-panel {
		padding: 0.75rem;
		min-height: 540px;
		overflow: hidden;
	}

	h2 {
		margin: 0 0 0.7rem;
		font-size: 1rem;
	}

	.text-input,
	.select-input,
	.number-input {
		width: 100%;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(9, 13, 18, 0.84);
		color: #f8fafc;
		padding: 0.78rem 0.9rem;
		margin: 0.3rem 0 0.8rem;
		font: inherit;
	}

	.helper-text {
		margin: 0;
		line-height: 1.5;
		color: rgba(226, 232, 240, 0.74);
	}

	dl {
		margin: 0;
		display: grid;
		gap: 0.7rem;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.damage-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
	}

	.big-metric {
		margin: 0.7rem 0 0;
		font-size: 1.5rem;
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
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 0.55rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 960px) {
		.hero,
		.lab-layout {
			grid-template-columns: 1fr;
		}

		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.summary-grid {
			grid-template-columns: 1fr;
		}

		.lab-shell {
			padding-inline: 0.9rem;
		}

		.arena-panel {
			min-height: 420px;
		}
	}
</style>
