<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	type CampaignSection = 'arena' | 'management' | 'stats' | 'loadout';

	let activeSection = $derived.by((): CampaignSection => {
		if (page.url.pathname.endsWith('/management')) {
			return 'management';
		}

		if (page.url.pathname.endsWith('/stats')) {
			return 'stats';
		}

		if (page.url.pathname.endsWith('/loadout')) {
			return 'loadout';
		}

		return 'arena';
	});

	let showTopbar = $derived(activeSection !== 'arena');
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

{#if showTopbar}
	<div class="campaign-topbar-wrap">
		<div class="campaign-topbar-shell">
			<div class="campaign-topbar">
				<a class="back" href={resolve('/campaigns')}>All campaigns</a>
				<CampaignRouteNav
					campaignId={data.campaignId}
					active={activeSection}
					{loadoutTooltip}
					notificationCounts={data.notificationCounts}
				/>
			</div>
		</div>
	</div>
{/if}

{@render children()}

<style>
	.campaign-topbar-wrap {
		position: relative;
		z-index: 1;
		padding: 1rem 1rem 0;
	}

	.campaign-topbar-shell {
		max-width: 1120px;
		margin: 0 auto;
	}

	.campaign-topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.2rem;
		padding: 0 0.9rem;
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		text-decoration: none;
		color: #f5f5f5;
		font-size: 0.9rem;
		font-weight: 600;
	}

	@media (max-width: 860px) {
		.campaign-topbar {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
