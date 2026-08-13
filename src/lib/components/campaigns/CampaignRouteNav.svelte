<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CampaignRouteNotificationCounts } from '$lib/game/notifications';

	type CampaignSection = 'arena' | 'management' | 'stats' | 'loadout';

	interface Props {
		campaignId: number;
		active: CampaignSection;
		loadoutTooltip?: string;
		notificationCounts?: CampaignRouteNotificationCounts;
	}

	let { campaignId, active, loadoutTooltip = '', notificationCounts }: Props = $props();

	let routeLinks = $derived([
		{
			key: 'arena',
			label: 'Arena'
		},
		{
			key: 'management',
			label: 'Management'
		},
		{
			key: 'stats',
			label: 'Stats'
		},
		{
			key: 'loadout',
			label: 'Loadout'
		}
	] as const);

	function getBadgeCount(key: 'arena' | 'management' | 'stats' | 'loadout') {
		if (key === 'stats') {
			return notificationCounts?.stats ?? 0;
		}

		if (key === 'loadout') {
			return notificationCounts?.loadout ?? 0;
		}

		return 0;
	}
</script>

<nav class="route-nav" aria-label="Campaign navigation">
	<div class="nav-group">
		<p class="nav-label">Section</p>
		<div class="nav-links">
			{#each routeLinks as route (route.key)}
				{#if route.key === 'arena'}
					<a
						class:active={active === route.key}
						class="route-link"
						href={resolve(`/campaigns/${campaignId}`)}
					>
						{route.label}
						{#if getBadgeCount(route.key) > 0}
							<span class="route-badge" aria-label={`${getBadgeCount(route.key)} unread`}>
								{getBadgeCount(route.key)}
							</span>
						{/if}
					</a>
				{:else}
					<a
						class:active={active === route.key}
						class="route-link"
						href={resolve(`/campaigns/${campaignId}/${route.key}`)}
						title={route.key === 'loadout' ? loadoutTooltip : undefined}
					>
						{route.label}
						{#if getBadgeCount(route.key) > 0}
							<span class="route-badge" aria-label={`${getBadgeCount(route.key)} unread`}>
								{getBadgeCount(route.key)}
							</span>
						{/if}
					</a>
				{/if}
			{/each}
		</div>
	</div>
</nav>

<style>
	.route-nav {
		display: grid;
		gap: 0.6rem;
	}

	.nav-group {
		display: grid;
		gap: 0.35rem;
	}

	.nav-label {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
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
		padding: 0 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		text-decoration: none;
		font-size: 0.84rem;
		font-weight: 600;
	}

	.route-badge {
		position: absolute;
		top: -0.35rem;
		right: -0.2rem;
		min-width: 1.1rem;
		height: 1.1rem;
		padding: 0 0.28rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: #ff5b5b;
		color: #ffffff;
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 0 0 2px rgba(10, 10, 10, 0.92);
	}

	.route-link.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}
</style>
