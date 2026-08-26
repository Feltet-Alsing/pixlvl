<script lang="ts">
	import { resolve } from '$app/paths';

	type CampaignSection = 'arena' | 'loadout' | 'shop' | 'stats' | 'packs';

	interface Props {
		campaignId: number;
		active: CampaignSection;
		notificationCounts?: {
			stats: number;
			loadout: number;
			packs: number;
		};
		showCampaignMenuToggle?: boolean;
		campaignMenuEnabled?: boolean;
		onToggleCampaignMenu?: () => void;
		showSweeperToggle?: boolean;
		sweeperEnabled?: boolean;
		onToggleSweeper?: () => void;
		showStatsToggle?: boolean;
		statsEnabled?: boolean;
		onToggleStats?: () => void;
		showRecentToggle?: boolean;
		recentOpen?: boolean;
		recentUnreadCount?: number;
		onToggleRecent?: () => void;
		onNavigateSection?: (section: CampaignSection) => void | Promise<void>;
	}

	let {
		campaignId,
		active,
		notificationCounts = { stats: 0, loadout: 0, packs: 0 },
		showCampaignMenuToggle = false,
		campaignMenuEnabled = false,
		onToggleCampaignMenu,
		showSweeperToggle = false,
		sweeperEnabled = false,
		onToggleSweeper,
		showStatsToggle = false,
		statsEnabled = false,
		onToggleStats,
		showRecentToggle = false,
		recentOpen = false,
		recentUnreadCount = 0,
		onToggleRecent,
		onNavigateSection
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
			key: 'packs',
			label: 'Packs',
			badge: notificationCounts.packs
		}
	] as const);

	function handleRouteClick(event: MouseEvent, section: CampaignSection) {
		if (!onNavigateSection) {
			return;
		}

		event.preventDefault();
		void onNavigateSection(section);
	}
</script>

<nav class="route-nav" aria-label="Campaign navigation">
	<div class="nav-groups">
		<div class="nav-group nav-group-left">
			{#each routeLinks as route (route.key)}
				{#if route.key === 'arena'}
					<a
						class:active={active === route.key}
						class="route-link"
						href={resolve(`/campaigns/${campaignId}`)}
						onclick={(event) => handleRouteClick(event, route.key)}
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
						onclick={(event) => handleRouteClick(event, route.key)}
					>
						{route.label}
						{#if route.badge > 0}
							<span class="route-badge">{route.badge}</span>
						{/if}
					</a>
				{/if}
			{/each}
		</div>

		<div class="nav-group nav-group-right">
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

			{#if showRecentToggle}
				<button
					class:active={recentOpen}
					class="route-link toggle-pill"
					type="button"
					onclick={onToggleRecent}
				>
					Recent
					{#if recentUnreadCount > 0}
						<span class="route-badge recent-badge">{Math.min(99, recentUnreadCount)}</span>
					{/if}
				</button>
			{/if}
		</div>
	</div>
</nav>

<style>
	.route-nav {
		display: flex;
		justify-content: center;
		min-width: 0;
		width: 100%;
	}

	.nav-groups {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		min-width: 0;
		max-width: 100%;
		width: 100%;
	}

	.nav-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		min-width: 0;
	}

	.nav-group-right {
		justify-content: flex-end;
		margin-left: auto;
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

	.recent-badge {
		background: #67d96f;
		color: #081108;
	}

	@media (max-width: 860px) {
		.route-nav {
			justify-content: flex-start;
			overflow-x: auto;
			overflow-y: hidden;
			padding-bottom: 0.15rem;
			scrollbar-width: none;
		}

		.route-nav::-webkit-scrollbar {
			display: none;
		}

		.nav-groups {
			flex-wrap: nowrap;
			gap: 0.75rem;
			min-width: 100%;
			width: max-content;
		}

		.nav-group {
			flex-wrap: nowrap;
		}

		.nav-group-right {
			margin-left: 0;
			padding-left: 0.75rem;
			border-left: 1px solid rgba(255, 255, 255, 0.08);
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
		.nav-groups {
			gap: 0.38rem;
		}

		.nav-group-right {
			padding-left: 0.5rem;
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
