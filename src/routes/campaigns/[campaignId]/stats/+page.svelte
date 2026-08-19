<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import CampaignStatCard from '$lib/components/campaigns/CampaignStatCard.svelte';
	import UpgradeOptionCard from '$lib/components/campaigns/UpgradeOptionCard.svelte';
	import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';
	import {
		applyUpgradePurchase,
		createBaselineUpgradeablePixlState,
		getUpgradeOptions,
		isUpgradeKey,
		resetUpgradeAllocations
	} from '$lib/game/upgrades';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type LivePixlState = NonNullable<NonNullable<PageProps['data']['gameState']>['pixlState']>;
	type PixlStateOverride = Pick<
		LivePixlState,
		| 'xp'
		| 'level'
		| 'perkPoints'
		| 'defence'
		| 'agility'
		| 'health'
		| 'attackSpeed'
		| 'loadoutRows'
		| 'loadoutColumns'
	>;

	let pixlStateOverride = $state.raw<PixlStateOverride | null>(null);
	let upgradeState = $derived(
		(data.gameState?.pixlState
			? {
					...data.gameState.pixlState,
					...(pixlStateOverride ?? {})
				}
			: null) ?? createBaselineUpgradeablePixlState()
	);
	let upgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let equippedWeaponCount = $derived(
		data.gameState
			? getActiveLoadoutPlacements(data.gameState.pixlState.loadoutPlacements).length
			: 0
	);
	let ownedWeaponCount = $derived(data.gameState?.pixlState.ownedWeapons.length ?? 0);
	let statCards = $derived([
		{ label: 'Level', value: upgradeState.level },
		{ label: 'Perk points', value: upgradeState.perkPoints },
		{ label: 'XP', value: upgradeState.xp },
		{ label: 'Health', value: upgradeState.health },
		{ label: 'Attack speed', value: `${upgradeState.attackSpeed.toFixed(1)}/s` },
		{ label: 'Equipped', value: equippedWeaponCount },
		{ label: 'Owned weapons', value: ownedWeaponCount },
		{ label: 'Loadout size', value: `${upgradeState.loadoutRows} x ${upgradeState.loadoutColumns}` }
	]);

	const purchaseUpgrade: SubmitFunction = ({ formData }) => {
		const selectedUpgrade = formData.get('upgrade');

		return async ({ result }) => {
			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (
				result.type === 'success' &&
				typeof selectedUpgrade === 'string' &&
				isUpgradeKey(selectedUpgrade)
			) {
				const nextUpgradeState = applyUpgradePurchase(selectedUpgrade, upgradeState);

				pixlStateOverride = {
					xp: nextUpgradeState.xp,
					level: nextUpgradeState.level,
					perkPoints: nextUpgradeState.perkPoints,
					defence: nextUpgradeState.defence,
					agility: nextUpgradeState.agility,
					health: nextUpgradeState.health,
					attackSpeed: nextUpgradeState.attackSpeed,
					loadoutRows: nextUpgradeState.loadoutRows,
					loadoutColumns: nextUpgradeState.loadoutColumns
				};
			}
		};
	};

	const resetUpgrades: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (result.type === 'success') {
				const nextUpgradeState = resetUpgradeAllocations(upgradeState);

				pixlStateOverride = {
					xp: nextUpgradeState.xp,
					level: nextUpgradeState.level,
					perkPoints: nextUpgradeState.perkPoints,
					defence: nextUpgradeState.defence,
					agility: nextUpgradeState.agility,
					health: nextUpgradeState.health,
					attackSpeed: nextUpgradeState.attackSpeed,
					loadoutRows: nextUpgradeState.loadoutRows,
					loadoutColumns: nextUpgradeState.loadoutColumns
				};
			}
		};
	};
</script>

<svelte:head>
	<title>Stats | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Stats</h1>
			<p class="lede">View your persistent build and spend perk points between runs.</p>
		</section>

		<section class="grid">
			<div class="panel stat-grid">
				{#each statCards as stat (stat.label)}
					<CampaignStatCard label={stat.label} value={stat.value} />
				{/each}
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
				{/if}

				{#if data.gameState}
					<form
						class="reset-form"
						method="post"
						action="?/resetUpgrades"
						use:enhance={resetUpgrades}
					>
						<button class="reset-button" type="submit">Reset perk points</button>
					</form>
				{/if}

				<div class="upgrade-grid">
					{#if data.gameState}
						{#each upgradeOptions as option (option.key)}
							<UpgradeOptionCard {option} submit={purchaseUpgrade} />
						{/each}
					{:else}
						<p class="feedback neutral">Sign in to save stats and buy upgrades.</p>
					{/if}
				</div>
			</div>
		</section>
	</div>
</div>

<style>
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

	.hero h1,
	.section-head h2 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p {
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

	.reset-form {
		margin: 0;
	}

	.reset-button {
		width: 100%;
		min-height: 2rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
