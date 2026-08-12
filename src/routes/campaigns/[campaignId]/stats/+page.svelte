<script lang="ts">
	import { resolve } from '$app/paths';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import { createBaselineUpgradeablePixlState, getUpgradeOptions } from '$lib/game/upgrades';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let upgradeState = $derived(data.gameState?.pixlState ?? createBaselineUpgradeablePixlState());
	let upgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let equippedWeaponCount = $derived(data.gameState?.pixlState.loadoutPlacements.length ?? 0);
	let ownedWeaponCount = $derived(data.gameState?.pixlState.ownedWeapons.length ?? 0);
	let loadoutTooltip = $derived(
		(data.gameState?.pixlState.loadoutPlacements ?? [])
			.map((placement) => {
				const ownedWeapon = data.gameState?.pixlState.ownedWeapons.find(
					(weapon) => weapon.instanceId === placement.weaponInstanceId
				);
				const definition = ownedWeapon
					? data.weaponDefinitionsById[ownedWeapon.definitionId]
					: null;
				return definition ? `${definition.name} (${placement.x}, ${placement.y})` : null;
			})
			.filter((entry): entry is string => entry !== null)
			.join('\n') || 'No equipped weapons'
	);
</script>

<svelte:head>
	<title>Stats | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<div class="topbar">
			<a class="back" href={resolve('/campaigns')}>All campaigns</a>
			<CampaignRouteNav
				campaignId={data.campaignId}
				active="stats"
				{loadoutTooltip}
				notificationCounts={data.notificationCounts}
			/>
		</div>

		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Stats</h1>
			<p class="lede">
				Persistent pixl power now lives on its own route so upgrades and progression are readable
				without competing with combat HUD.
			</p>
		</section>

		<section class="grid">
			<div class="panel stat-grid">
				<div class="stat-card">
					<span>Level</span>
					<strong>{upgradeState.level}</strong>
				</div>
				<div class="stat-card">
					<span>Perk points</span>
					<strong>{upgradeState.perkPoints}</strong>
				</div>
				<div class="stat-card">
					<span>XP</span>
					<strong>{upgradeState.xp}</strong>
				</div>
				<div class="stat-card">
					<span>Health</span>
					<strong>{upgradeState.health}</strong>
				</div>
				<div class="stat-card">
					<span>Attack speed</span>
					<strong>{upgradeState.attackSpeed.toFixed(1)}/s</strong>
				</div>
				<div class="stat-card">
					<span>Equipped</span>
					<strong>{equippedWeaponCount}</strong>
				</div>
				<div class="stat-card">
					<span>Owned weapons</span>
					<strong>{ownedWeaponCount}</strong>
				</div>
				<div class="stat-card">
					<span>Loadout size</span>
					<strong>{upgradeState.loadoutRows} x {upgradeState.loadoutColumns}</strong>
				</div>
			</div>

			<div class="panel">
				<div class="section-head">
					<h2>Persistent upgrades</h2>
					<p>Spend perk points earned from XP between runs.</p>
				</div>

				{#if form?.purchaseError}
					<p class="feedback error">{form.purchaseError}</p>
				{:else if form?.purchaseSuccess}
					<p class="feedback success">{form.purchaseSuccess}</p>
				{:else if form?.resetError}
					<p class="feedback error">{form.resetError}</p>
				{:else if form?.resetSuccess}
					<p class="feedback success">{form.resetSuccess}</p>
				{/if}

				<div class="upgrade-grid">
					{#if data.gameState}
						{#each upgradeOptions as option (option.key)}
							<form class="upgrade-card" method="post" action="?/purchaseUpgrade">
								<input type="hidden" name="upgrade" value={option.key} />
								<div class="upgrade-head">
									<span>{option.label}</span>
									<strong>Rank {option.level}</strong>
								</div>
								<p>{option.description}</p>
								<small>Allocated {option.level} point{option.level === 1 ? '' : 's'}</small>
								<button class="purchase" type="submit" disabled={!option.canSpend}>
									{option.canSpend ? `Spend point on ${option.label}` : 'No perk points'}
								</button>
							</form>
						{/each}
					{:else}
						<p class="feedback neutral">Sign in to save stats and purchase upgrades.</p>
					{/if}
				</div>

				<form class="reset-panel" method="post" action="?/resetPixl">
					<div class="section-head">
						<h2>Complete reset</h2>
						<p>
							Reset XP, perk allocation, owned weapons, loadout, and campaign progression to
							defaults.
						</p>
					</div>
					<button class="reset-button" type="submit" disabled={!data.gameState}>
						Reset pixl
					</button>
				</form>
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
		max-width: 1120px;
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
	.upgrade-card {
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
		gap: 0.85rem;
	}

	.hero h1,
	.section-head h2 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow,
	.stat-card span,
	.upgrade-head span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p,
	.upgrade-card p,
	.upgrade-card small {
		margin: 0;
		color: #c4c4c4;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(18rem, 22rem) minmax(0, 1fr);
		gap: 1rem;
	}

	.stat-grid,
	.upgrade-grid {
		display: grid;
		gap: 0.75rem;
	}

	.stat-card {
		padding: 0.85rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.25rem;
	}

	.stat-card strong {
		font-size: 1.2rem;
	}

	.upgrade-card {
		padding: 0.9rem;
		display: grid;
		gap: 0.45rem;
	}

	.upgrade-head {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.purchase {
		min-height: 2rem;
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.reset-panel {
		display: grid;
		gap: 0.75rem;
		padding-top: 0.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.reset-button {
		min-height: 2.4rem;
		padding: 0.55rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 96, 96, 0.28);
		background: rgba(255, 96, 96, 0.08);
		color: #ffd5d5;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.purchase:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.reset-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
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

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
