<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		campaignId: number;
		active: 'arena' | 'management' | 'stats' | 'loadout';
		loadoutTooltip?: string;
	}

	let { campaignId, active, loadoutTooltip = '' }: Props = $props();

	let routeLinks = $derived([
		{
			key: 'arena',
			label: 'Arena',
			path: `/campaigns/${campaignId}`
		},
		{
			key: 'management',
			label: 'Management',
			path: `/campaigns/${campaignId}/management`
		},
		{
			key: 'stats',
			label: 'Stats',
			path: `/campaigns/${campaignId}/stats`
		},
		{
			key: 'loadout',
			label: 'Loadout',
			path: `/campaigns/${campaignId}/loadout`
		}
	] as const);
</script>

<nav class="route-nav" aria-label="Campaign sections">
	{#each routeLinks as route (route.key)}
		<a
			class:active={active === route.key}
			class="route-link"
			href={resolve(route.path)}
			title={route.key === 'loadout' ? loadoutTooltip : undefined}
		>
			{route.label}
		</a>
	{/each}
</nav>

<style>
	.route-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.route-link {
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

	.route-link.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}
</style>
