<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	type LoadoutSubsection = 'layout' | 'forge';

	let activeSubsection = $derived.by((): LoadoutSubsection =>
		page.url.pathname.endsWith('/forge') ? 'forge' : 'layout'
	);
</script>

<div class="loadout-shell-wrap">
	<div class="loadout-shell-topbar">
		<div class="loadout-route-nav">
			<CampaignRouteNav
				campaignId={data.campaignId}
				active="loadout"
				notificationCounts={data.notificationCounts}
			/>
		</div>

		<nav class="loadout-subnav" aria-label="Loadout management sections">
			<a
				class:active={activeSubsection === 'layout'}
				class="subnav-link"
				href={resolve(`/campaigns/${data.campaignId}/loadout`)}
			>
				<span class="subnav-kicker">Assembly</span>
				<strong>Layout</strong>
			</a>
			<a
				class:active={activeSubsection === 'forge'}
				class="subnav-link forge-link"
				href={resolve(`/campaigns/${data.campaignId}/loadout/forge`)}
			>
				<span class="subnav-kicker">Upgrades</span>
				<strong>Forge</strong>
			</a>
		</nav>
	</div>

	{@render children()}
</div>

<style>
	.loadout-shell-wrap {
		min-height: 100%;
	}

	.loadout-shell-topbar {
		padding: 0.75rem 0.75rem 0;
		display: grid;
		gap: 0.75rem;
	}

	.loadout-route-nav {
		display: flex;
		justify-content: flex-end;
	}

	.loadout-subnav {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.subnav-link {
		padding: 0.95rem 1rem;
		border-radius: 1.15rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
			rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
		color: #f5f5f5;
		text-decoration: none;
		display: grid;
		gap: 0.18rem;
	}

	.subnav-link strong {
		font-size: 1.02rem;
	}

	.subnav-kicker {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.68rem;
		font-weight: 700;
		color: #b6b6b6;
	}

	.subnav-link.active {
		border-color: rgba(103, 217, 111, 0.42);
		background:
			linear-gradient(180deg, rgba(103, 217, 111, 0.16), rgba(103, 217, 111, 0.07)),
			rgba(10, 10, 10, 0.94);
		color: #d8ffd8;
	}

	.forge-link {
		background:
			radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 42%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
			rgba(10, 10, 10, 0.92);
	}

	.forge-link.active {
		border-color: rgba(249, 115, 22, 0.44);
		background:
			radial-gradient(circle at top right, rgba(249, 115, 22, 0.28), transparent 44%),
			linear-gradient(180deg, rgba(249, 115, 22, 0.14), rgba(249, 115, 22, 0.05)),
			rgba(16, 10, 6, 0.96);
		color: #ffe3bf;
	}

	@media (max-width: 860px) {
		.loadout-shell-topbar {
			padding: 0.75rem 0.75rem 0;
		}

		.loadout-route-nav {
			justify-content: stretch;
		}

		.loadout-subnav {
			grid-template-columns: 1fr;
		}
	}
</style>
