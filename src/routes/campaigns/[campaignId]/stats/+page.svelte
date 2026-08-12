<script lang="ts">
	import { resolve } from '$app/paths';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import { createBaselineUpgradeablePixlState, getUpgradeOptions } from '$lib/game/upgrades';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let upgradeState = $derived(data.gameState?.pixlState ?? createBaselineUpgradeablePixlState());
	let upgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let loadoutTooltip = $derived(
		(data.gameState?.pixlState.loadoutPlacements ?? [])
			.map((placement) => {
				const ownedWeapon = data.gameState?.pixlState.ownedWeapons.find(
					(weapon) => weapon.instanceId === placement.weaponInstanceId
				);
				const definition = ownedWeapon
					? data.weaponPool.find((weapon) => weapon.id === ownedWeapon.definitionId)
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
			<CampaignRouteNav campaignId={data.campaignId} active="stats" {loadoutTooltip} />
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
					<span>Health</span>
					<strong>{upgradeState.health}</strong>
				</div>
				<div class="stat-card">
					<span>Damage</span>
					<strong>{upgradeState.damage}</strong>
				</div>
				<div class="stat-card">
					<span>Attack speed</span>
					<strong>{upgradeState.attackSpeed.toFixed(1)}/s</strong>
				</div>
				<div class="stat-card">
					<span>Gold</span>
					<strong>{upgradeState.gold}</strong>
				</div>
			</div>

			<div class="panel">
				<div class="section-head">
					<h2>Persistent upgrades</h2>
					<p>Spend banked gold between runs.</p>
				</div>

				{#if form?.purchaseError}
					<p class="feedback error">{form.purchaseError}</p>
				{:else if form?.purchaseSuccess}
					<p class="feedback success">{form.purchaseSuccess}</p>
				{/if}

				<div class="upgrade-grid">
					{#if data.gameState}
						{#each upgradeOptions as option (option.key)}
							<form class="upgrade-card" method="post" action="?/purchaseUpgrade">
								<input type="hidden" name="upgrade" value={option.key} />
								<div class="upgrade-head">
									<span>{option.label}</span>
									<strong>Cost {option.cost}</strong>
								</div>
								<p>{option.description}</p>
								<small>Bought {option.level} times</small>
								<button class="purchase" type="submit" disabled={!option.canAfford}>
									{option.canAfford ? `Buy ${option.label}` : 'Not enough gold'}
								</button>
							</form>
						{/each}
					{:else}
						<p class="feedback neutral">Sign in to save stats and purchase upgrades.</p>
					{/if}
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

	.purchase:disabled {
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
