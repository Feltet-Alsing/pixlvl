<script lang="ts">
	import { page } from '$app/state';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	type CampaignSection = 'arena' | 'shop' | 'stats' | 'loadout' | 'packs';

	let activeSection = $derived.by((): CampaignSection => {
		if (page.url.pathname.includes('/loadout')) {
			return 'loadout';
		}

		if (page.url.pathname.endsWith('/shop')) {
			return 'shop';
		}

		if (page.url.pathname.endsWith('/stats')) {
			return 'stats';
		}

		if (page.url.pathname.endsWith('/packs')) {
			return 'packs';
		}

		return 'arena';
	});

	let showSharedRouteNav = $derived(activeSection !== 'arena' && activeSection !== 'loadout');
</script>

{#if showSharedRouteNav}
	<div class="campaign-topbar-wrap">
		<div class="campaign-topbar-shell">
			<div class="campaign-topbar">
				<CampaignRouteNav
					campaignId={data.campaignId}
					active={activeSection}
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
		padding: 0 1rem 1rem;
	}

	.campaign-topbar-shell {
		max-width: 1120px;
		margin: 0 auto;
	}

	.campaign-topbar {
		display: flex;
		justify-content: flex-end;
	}
</style>
