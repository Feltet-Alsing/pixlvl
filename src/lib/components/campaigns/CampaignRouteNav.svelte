<script lang="ts">
	import { resolve } from '$app/paths';

	type CampaignSection = 'arena' | 'loadout' | 'shop' | 'stats';

	interface Props {
		campaignId: number;
		active: CampaignSection;
		notificationCounts?: {
			stats: number;
			loadout: number;
		};
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
		notificationCounts = { stats: 0, loadout: 0 },
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
			label: 'Arena',
			badge: 0
		},
		{
			key: 'loadout',
			label: 'Loadout',
			badge: notificationCounts.loadout
		},
		{
			key: 'stats',
			label: 'Stats',
			badge: notificationCounts.stats
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
					{#if route.badge > 0}
						<span class="route-badge">{route.badge}</span>
					{/if}
				</a>
			{:else}
				<a
					class:active={active === route.key}
					class="route-link"
					href={resolve(`/campaigns/${campaignId}/${route.key}`)}
				>
					{route.label}
					{#if route.badge > 0}
						<span class="route-badge">{route.badge}</span>
					{/if}
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
		display: flex;
		justify-content: center;
		min-width: 0;
		width: 100%;
	}

	.nav-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		min-width: 0;
		max-width: 100%;
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

	.route-badge {
		margin-left: 0.45rem;
		min-width: 1.15rem;
		height: 1.15rem;
		padding: 0 0.32rem;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 96, 96, 0.9);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1;
	}

	@media (max-width: 860px) {
		.nav-links {
			flex-wrap: nowrap;
			gap: 0.45rem;
			width: 100%;
			justify-content: flex-start;
			overflow-x: auto;
			overflow-y: hidden;
			padding-bottom: 0.15rem;
			scrollbar-width: none;
		}

		.nav-links::-webkit-scrollbar {
			display: none;
		}

		.route-link {
			min-height: 2rem;
			padding: 0 0.72rem;
			font-size: 0.76rem;
			white-space: nowrap;
		}

		.route-badge {
			margin-left: 0.35rem;
			min-width: 1rem;
			height: 1rem;
			font-size: 0.62rem;
		}
	}

	@media (max-width: 480px) {
		.nav-links {
			gap: 0.38rem;
		}

		.route-link {
			min-height: 1.8rem;
			padding: 0 0.55rem;
			font-size: 0.68rem;
		}

		.route-badge {
			min-width: 0.92rem;
			height: 0.92rem;
			font-size: 0.56rem;
		}
	}
</style>
