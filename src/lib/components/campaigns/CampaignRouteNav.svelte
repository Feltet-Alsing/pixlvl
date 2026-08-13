<script lang="ts">
	import { resolve } from '$app/paths';

	type CampaignSection = 'arena' | 'loadout' | 'management' | 'stats';

	interface Props {
		campaignId: number;
		active: CampaignSection;
		loadoutTooltip?: string;
		showCampaignMenuToggle?: boolean;
		campaignMenuEnabled?: boolean;
		onToggleCampaignMenu?: () => void;
		showSweeperToggle?: boolean;
		sweeperEnabled?: boolean;
		onToggleSweeper?: () => void;
		showStatsToggle?: boolean;
		statsEnabled?: boolean;
		onToggleStats?: () => void;
	}

	let {
		campaignId,
		active,
		loadoutTooltip = '',
		showCampaignMenuToggle = false,
		campaignMenuEnabled = false,
		onToggleCampaignMenu,
		showSweeperToggle = false,
		sweeperEnabled = false,
		onToggleSweeper,
		showStatsToggle = false,
		statsEnabled = false,
		onToggleStats
	}: Props = $props();

	let routeLinks = $derived([
		{
			key: 'arena',
			label: 'Arena'
		},
		{
			key: 'loadout',
			label: 'Loadout'
		}
	] as const);
</script>

<nav class="route-nav" aria-label="Campaign navigation">
	<div class="nav-links">
		{#each routeLinks as route (route.key)}
			{#if route.key === 'arena'}
				<a
					class:active={active === route.key}
					class="route-link"
					href={resolve(`/campaigns/${campaignId}`)}
				>
					{route.label}
				</a>
			{:else}
				<a
					class:active={active === route.key}
					class="route-link"
					href={resolve(`/campaigns/${campaignId}/${route.key}`)}
				>
					{route.label}
				</a>
			{/if}
		{/each}

		{#if showCampaignMenuToggle}
			<button
				class:active={campaignMenuEnabled}
				class="route-link toggle-pill"
				type="button"
				onclick={onToggleCampaignMenu}
			>
				{campaignMenuEnabled ? 'Hide Campaign Menu' : 'Show Campaign Menu'}
			</button>
		{/if}

		{#if showSweeperToggle}
			<button
				class:active={sweeperEnabled}
				class="route-link toggle-pill"
				type="button"
				onclick={onToggleSweeper}
			>
				{sweeperEnabled ? 'Hide Sweeper' : 'Show Sweeper'}
			</button>
		{/if}

		{#if showStatsToggle}
			<button
				class:active={statsEnabled}
				class="route-link toggle-pill"
				type="button"
				onclick={onToggleStats}
			>
				{statsEnabled ? 'Hide Stats' : 'Show Stats'}
			</button>
		{/if}
	</div>
</nav>

<style>
	.route-nav {
		display: block;
	}

	.nav-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.route-link {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.25rem;
		padding: 0 1rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: #f5f5f5;
		text-decoration: none;
		font-size: 0.84rem;
		font-weight: 600;
	}

	.toggle-pill {
		font: inherit;
		cursor: pointer;
	}

	.route-link.active {
		border-color: rgba(103, 217, 111, 0.48);
		background: rgba(103, 217, 111, 0.16);
	}
</style>
