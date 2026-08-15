<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { UpgradeOption } from '$lib/game/upgrades';
	import CampaignStatCard from '$lib/components/campaigns/CampaignStatCard.svelte';
	import UpgradeOptionCard from '$lib/components/campaigns/UpgradeOptionCard.svelte';

	interface StatRow {
		label: string;
		value: string | number;
	}

	interface Props {
		stats: StatRow[];
		upgradeOptions: UpgradeOption[];
		signedIn: boolean;
		purchaseError?: string;
		submit?: SubmitFunction;
	}

	let { stats, upgradeOptions, signedIn, purchaseError, submit }: Props = $props();
</script>

<div class="stats-overlay" aria-label="Arena stats">
	<div class="stats-overlay-header compact-heading">
		<p class="eyebrow">Arena stats</p>
		<p class="upgrade-note">Spend perk points without leaving the arena.</p>
	</div>

	{#if purchaseError}
		<p class="feedback error">{purchaseError}</p>
	{/if}

	<div class="stats-overlay-grid compact-stats">
		{#each stats as stat (stat.label)}
			<CampaignStatCard label={stat.label} value={stat.value} variant="compact" />
		{/each}
	</div>

	<div class="upgrade-grid overlay-upgrade-grid">
		{#if signedIn}
			{#each upgradeOptions as option (option.key)}
				<UpgradeOptionCard {option} enabledLabel="Spend perk point" variant="compact" {submit} />
			{/each}
		{:else}
			<p class="feedback">Sign in to save stats and assign perk points.</p>
		{/if}
	</div>
</div>

<style>
	.stats-overlay {
		grid-column: 1;
		grid-row: 2;
		justify-self: end;
		align-self: start;
		width: min(22rem, 100%);
		max-width: 100%;
		padding: 0.9rem;
		display: grid;
		gap: 0.75rem;
		box-sizing: border-box;
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.stats-overlay-header {
		display: grid;
		gap: 0.2rem;
	}

	.compact-heading,
	.overlay-upgrade-grid {
		display: grid;
		gap: 0.65rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	.upgrade-note {
		margin: 0;
		color: #c4c4c4;
	}

	.stats-overlay-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.55rem;
	}

	.overlay-upgrade-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.feedback {
		padding: 0.85rem 1rem;
		margin: 0;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.95rem;
	}

	.feedback.error {
		border-color: rgba(255, 96, 96, 0.35);
		color: #ffb3b3;
		background: rgba(255, 96, 96, 0.08);
	}

	@media (max-width: 860px) {
		.stats-overlay {
			justify-self: stretch;
			align-self: auto;
			width: 100%;
		}

		.stats-overlay-grid,
		.overlay-upgrade-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
